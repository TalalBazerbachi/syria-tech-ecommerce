import { isEqual, pick } from "lodash"

const COMPARED_FIELDS = [
  "first_name",
  "last_name",
  "address_1",
  "address_2",
  "city",
  "country_code",
  "province",
  "phone",
]

export default function compareAddresses(address1: object, address2: object) {
  return isEqual(pick(address1, COMPARED_FIELDS), pick(address2, COMPARED_FIELDS))
}
