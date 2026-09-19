// Vercel's Node function builder only transpiles source files under this
// project's own directory — workspace packages like @easymarker/shared ship
// raw TypeScript (no compiled JS, by design: Next.js transpiles them via
// `transpilePackages`, and local dev uses tsx) and sit inside node_modules
// via a pnpm symlink, which Vercel's builder treats as "already built" and
// copies verbatim instead of transpiling. Bundling everything — including
// those workspace deps — into one self-contained file sidesteps that.
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "api/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // Real npm packages (already compiled JS) stay external and resolve
  // normally from node_modules at runtime — only the raw-TypeScript
  // workspace packages need to be inlined by this bundle.
  external: ["express", "express-rate-limit", "cheerio", "esbuild"],
  logLevel: "info",
});
