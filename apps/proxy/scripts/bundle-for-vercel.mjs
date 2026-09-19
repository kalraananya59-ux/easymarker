// Vercel's Node function builder only transpiles source files under this
// project's own directory — workspace packages like @easymarker/shared ship
// raw TypeScript (no compiled JS, by design: Next.js transpiles them via
// `transpilePackages`, and local dev uses tsx) and sit inside node_modules
// via a pnpm symlink, which Vercel's builder treats as "already built" and
// copies verbatim instead of transpiling. Bundling everything — including
// those workspace deps — into one self-contained file sidesteps that.
import { build } from "esbuild";
import path from "path";

// Precompute the anchoring bundle here (a normal build-time esbuild call,
// same as this whole script) instead of leaving it to run inside the
// deployed function — see the comment in src/anchoring-bundle.ts for why
// that's unreliable in a serverless sandbox. Injected as a compile-time
// constant so the deployed bundle never needs to invoke esbuild itself.
const anchoringResult = await build({
  entryPoints: [path.resolve("..", "..", "packages", "anchoring", "src", "browser-entry.ts")],
  bundle: true,
  format: "iife",
  target: "es2020",
  write: false,
  minify: true,
  logLevel: "silent",
});
const anchoringBundleText = anchoringResult.outputFiles[0]?.text;
if (!anchoringBundleText) throw new Error("esbuild produced no output for the anchoring bundle");

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
  define: {
    __PREBUILT_ANCHORING_BUNDLE__: JSON.stringify(anchoringBundleText),
  },
  logLevel: "info",
});
