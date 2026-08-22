import { build } from "esbuild";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entryPoint = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "packages",
  "anchoring",
  "src",
  "browser-entry.ts"
);

let cachedBundle: Promise<string> | null = null;

export function getAnchoringBundle(): Promise<string> {
  if (!cachedBundle) {
    cachedBundle = build({
      entryPoints: [entryPoint],
      bundle: true,
      format: "iife",
      target: "es2020",
      write: false,
      minify: true,
      logLevel: "silent",
    }).then((result) => {
      const output = result.outputFiles[0];
      if (!output) throw new Error("esbuild produced no output for the anchoring bundle");
      return output.text;
    });
  }
  return cachedBundle;
}
