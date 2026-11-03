const c = require("ansi-colors");

const requiredEnvs = [
  {
    key: "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
    // TODO: we need a good doc to point this to
    description:
      "Learn how to create a publishable key: https://docs.medusajs.com/v2/resources/storefront-development/publishable-api-keys",
  },
];

// `phase` is the Next.js phase passed to next.config.js (e.g.
// "phase-production-build"); Next does not expose it as an env var.
function checkEnvVariables(phase) {
  const missingEnvs = requiredEnvs.filter(function (env) {
    return !process.env[env.key];
  });

  // The image is built in CI before the publishable key exists (bootstrap
  // creates it on the server). At build time only warn; in `next dev` /
  // `next start` the server needs the key for its own Store API calls, so
  // then it is fatal. Browser calls never carry it: Caddy injects it for
  // /store/* requests.
  if (missingEnvs.length > 0 && phase === "phase-production-build") {
    console.warn(
      c.yellow(
        `\n⚠ Building without ${missingEnvs.map((e) => e.key).join(", ")}; set at runtime.\n`
      )
    );
    return;
  }

  if (missingEnvs.length > 0) {
    console.error(
      c.red.bold("\n🚫 Error: Missing required environment variables\n")
    );

    missingEnvs.forEach(function (env) {
      console.error(c.yellow(`  ${c.bold(env.key)}`));
      if (env.description) {
        console.error(c.dim(`    ${env.description}\n`));
      }
    });

    console.error(
      c.yellow(
        "\nPlease set these variables in your .env file or environment before starting the application.\n"
      )
    );

    process.exit(1);
  }
}

module.exports = checkEnvVariables;
