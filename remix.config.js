// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL || process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

/** @type {import('@remix-run/dev').AppConfig} */
const config = {
  ignoredRouteFiles: ["**/.*"],
  appDirectory: "app",
  serverModuleFormat: "cjs",
  future: {
    v2_routeConvention: true,
    v2_meta: true,
    v2_dev: true,
  },
  tailwind: true,
  postcss: true,
  routes(defineRoutes) {
    return defineRoutes((route) => {
      // Explicitly define API routes
      route("/api/*", "api/[...api].js");
    });
  },
};

// ✅ Only add dev config when not in production
if (process.env.NODE_ENV !== "production") {
  config.dev = { port: process.env.HMR_SERVER_PORT || 8002 };
}

module.exports = config;
