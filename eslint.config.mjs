import nextConfig from "eslint-config-next";

const config = [
  { ignores: ["src/generated/**", ".next/**"] },
  ...nextConfig,
];

export default config;
