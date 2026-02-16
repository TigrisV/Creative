/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      // Memory-only cache: prevents filesystem cache corruption that causes CSS loss on Windows
      config.cache = { type: "memory" };

      // Ensure CSS modules are always re-evaluated on HMR
      const rules = config.module?.rules;
      if (Array.isArray(rules)) {
        rules.forEach((rule) => {
          if (rule && typeof rule === "object" && rule.oneOf) {
            rule.oneOf.forEach((oneOf) => {
              if (oneOf && oneOf.sideEffects === false) {
                oneOf.sideEffects = true;
              }
            });
          }
        });
      }
    }
    return config;
  },
};

module.exports = nextConfig;
