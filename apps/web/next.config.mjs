/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@easymarker/db", "@easymarker/shared", "@easymarker/email"],
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
  },
};

export default config;
