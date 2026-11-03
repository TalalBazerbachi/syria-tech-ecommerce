import { getAnalyticsConfig, serializeAnalyticsConfig } from "./config"

/**
 * Server component. Renders the runtime analytics configuration for
 * `src/instrumentation-client.ts`, which reads it before posthog-js loads.
 * Belongs in `<head>` so it is parsed before any client bundle executes.
 */
export default function AnalyticsConfigScript() {
  return (
    <script
      id="ph-config"
      type="application/json"
      dangerouslySetInnerHTML={{
        __html: serializeAnalyticsConfig(getAnalyticsConfig()),
      }}
    />
  )
}
