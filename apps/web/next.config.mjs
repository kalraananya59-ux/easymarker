/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@easymarker/db", "@easymarker/shared", "@easymarker/email"],
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
  },
  async headers() {
    return [
      {
        // Review links are per-project, unguessable-but-shareable pages —
        // never meant to show up in search results. The page also sets a
        // robots meta tag; this header is a second layer that some
        // crawlers respect even without rendering the page.
        source: "/r/:token*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default config;
