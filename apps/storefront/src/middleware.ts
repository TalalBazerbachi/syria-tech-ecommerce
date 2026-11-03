import createIntlMiddleware from "next-intl/middleware"
import { NextRequest, NextResponse } from "next/server"
import { routing } from "./i18n/routing"

const intlMiddleware = createIntlMiddleware(routing)

/**
 * Locale routing only. The dtc-starter resolved a region per country here;
 * this store ships to one country (Syria), so the region is resolved
 * server-side in `lib/data/regions.ts` and the URL carries the UI locale
 * (`/ar/...`, `/en/...`) instead of a country code.
 *
 * The `_medusa_cache_id` cookie is kept: it scopes Next's fetch-cache tags per
 * visitor so cart/customer revalidation never leaks across sessions.
 *
 * `/ingest/*` (PostHog, proxied by Caddy in front of this app) is excluded
 * from the matcher so it is never locale-redirected if it reaches Next.
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.includes(".")) {
    return NextResponse.next()
  }

  const response = intlMiddleware(request)

  if (!request.cookies.get("_medusa_cache_id")) {
    response.cookies.set("_medusa_cache_id", crypto.randomUUID(), {
      maxAge: 60 * 60 * 24,
    })
  }

  return response
}

export const config = {
  matcher: [
    "/((?!api|ingest|_next/static|_next/image|favicon.ico|images|assets|fonts|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
