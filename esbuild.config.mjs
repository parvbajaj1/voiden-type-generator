import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "fs";
import { polyfillNode } from "esbuild-plugin-polyfill-node";

mkdirSync("dist", { recursive: true });
copyFileSync("src/manifest.json", "dist/manifest.json");

await build({
  entryPoints: ["src/index.tsx"],
  outfile: "dist/main.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  // polyfillNode handles all node:* built-ins for browser/Vite context
  plugins: [polyfillNode()],
  // Only Voiden-provided runtime deps stay external
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "@voiden/sdk",
    "@voiden/sdk/ui",
  ],
});

console.log("Build complete → dist/main.js");
