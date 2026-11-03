#!/usr/bin/env bash
# Smoke test: full cash-on-delivery checkout through the Store API, printing each step.
#   ./scripts/cod-checkout.sh [province] [variant_id] [region_id]
# Defaults: province sy-di (Damascus), first variant of the first product, the "Syria" region.
# Needs MEDUSA_PUBLISHABLE_KEY in .env (written by bootstrap.sh) and a reachable Medusa
# (MEDUSA_URL, default http://localhost:9000 = docker-compose.dev.yml).
# CART_METADATA='{"posthog_distinct_id":"..."}' (a JSON object) is stored on the cart, the way the
# storefront stores the PostHog id and attribution, to check it reaches the order (docs/analytics.md).
set -uo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=lib.sh
. scripts/lib.sh
load_env
M=${MEDUSA_URL:-http://localhost:9000}
PK=${MEDUSA_PUBLISHABLE_KEY:?MEDUSA_PUBLISHABLE_KEY is empty in .env}
H=(-H "x-publishable-api-key: $PK" -H 'content-type: application/json')
PROV=${1:-sy-di}

REG=${3:-$(curl -s "$M/store/regions" "${H[@]}" | jq -r '.regions[] | select(.name=="Syria") | .id' | head -1)}
[ -n "$REG" ] || { echo "no Syria region"; exit 1; }
V=${2:-$(curl -s "$M/store/products?region_id=$REG&limit=1&fields=id,variants.id" "${H[@]}" | jq -r '.products[0].variants[0].id')}
[ -n "$V" ] && [ "$V" != null ] || { echo "no variant found"; exit 1; }
echo "region: $REG  variant: $V  province: $PROV"

META=${CART_METADATA:-}
CART=$(curl -s -X POST "$M/store/carts" "${H[@]}" -d "{\"region_id\":\"$REG\",\"email\":\"buyer@example.com\",${META:+\"metadata\":$META,}\"items\":[{\"variant_id\":\"$V\",\"quantity\":1}],\"shipping_address\":{\"first_name\":\"Test\",\"last_name\":\"Buyer\",\"address_1\":\"Abu Rummaneh, building 4, 2nd floor\",\"address_2\":\"near Al-Rawda square\",\"city\":\"Damascus\",\"country_code\":\"sy\",\"province\":\"$PROV\",\"phone\":\"+963900000000\",\"metadata\":{\"notes\":\"call before delivery\"}}}")
echo "cart: $(echo "$CART" | jq -c '{id:.cart.id,currency:.cart.currency_code,item_total:.cart.item_total,err:.message}')"
CID=$(echo "$CART" | jq -r .cart.id)
[ -n "$CID" ] && [ "$CID" != null ] || exit 1

# PROMO_CODE=SARA10 applies a promotion code (e.g. a creator code, docs/analytics.md).
if [ -n "${PROMO_CODE:-}" ]; then
  echo "promo: $(curl -s -X POST "$M/store/carts/$CID/promotions" "${H[@]}" -d "{\"promo_codes\":[\"$PROMO_CODE\"]}" | jq -c '{codes:[.cart.promotions[]?.code],discount_total:.cart.discount_total,err:.message}')"
fi

OPTS=$(curl -s "$M/store/shipping-options?cart_id=$CID" "${H[@]}")
echo "shipping options: $(echo "$OPTS" | jq -c '[.shipping_options[]?|{name,amount,currency:.calculated_price.currency_code}] // .')"
SO=$(echo "$OPTS" | jq -r '.shipping_options[0].id // empty')
[ -z "$SO" ] && { echo "no shipping option for province $PROV -> stop (expected outside launch zones)"; exit 2; }

echo "add shipping: $(curl -s -X POST "$M/store/carts/$CID/shipping-methods" "${H[@]}" -d "{\"option_id\":\"$SO\"}" | jq -c '{total:.cart.total,shipping_total:.cart.shipping_total,tax_total:.cart.tax_total,err:.message}')"
PC=$(curl -s -X POST "$M/store/payment-collections" "${H[@]}" -d "{\"cart_id\":\"$CID\"}" | jq -r .payment_collection.id)
echo "payment session: $(curl -s -X POST "$M/store/payment-collections/$PC/payment-sessions" "${H[@]}" -d '{"provider_id":"pp_system_default"}' | jq -c '{amount:.payment_collection.amount,currency:.payment_collection.currency_code,sessions:[.payment_collection.payment_sessions[]?|{provider_id,status}],err:.message}')"
echo "complete: $(curl -s -X POST "$M/store/carts/$CID/complete" "${H[@]}" | jq -c '{type,order:(.order|{id,display_id,currency_code,total,payment_status,fulfillment_status}),err:(.error.message // .message)}')"
