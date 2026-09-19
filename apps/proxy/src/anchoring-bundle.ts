// Invoking esbuild (spawning its native binary, reading source files from
// disk) works fine in a long-lived process — local dev, the Fly/Docker
// path — but is unreliable inside a deployed Vercel function: the request-
// scoped sandbox may not have the raw .ts source available (Vercel only
// includes files it can trace through static imports, not paths esbuild
// reads dynamically at runtime), and this doubled as a real crash cause
// in production. bundle-for-vercel.mjs precomputes this bundle at build
// time and injects it via esbuild's `define`, so __PREBUILT_ANCHORING_BUNDLE__
// is only ever set in that build — everywhere else this falls back to the
// original runtime-esbuild behavior below, unchanged.
declare const __PREBUILT_ANCHORING_BUNDLE__: string | undefined;

let cachedBundle: Promise<string> | null = null;

export function getAnchoringBundle(): Promise<string> {
  if (typeof __PREBUILT_ANCHORING_BUNDLE__ !== "undefined") {
    return Promise.resolve(__PREBUILT_ANCHORING_BUNDLE__);
  }

  if (!cachedBundle) {
    cachedBundle = (async () => {
      const { build } = await import("esbuild");
      const { fileURLToPath } = await import("url");
      const path = await import("path");
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const entryPoint = path.resolve(__dirname, "..", "..", "..", "packages", "anchoring", "src", "browser-entry.ts");

      const result = await build({
        entryPoints: [entryPoint],
        bundle: true,
        format: "iife",
        target: "es2020",
        write: false,
        minify: true,
        logLevel: "silent",
      });
      const output = result.outputFiles[0];
      if (!output) throw new Error("esbuild produced no output for the anchoring bundle");
      return output.text;
    })();
  }
  return cachedBundle;
}
