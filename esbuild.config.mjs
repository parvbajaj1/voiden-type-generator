import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "fs";

mkdirSync("dist", { recursive: true });
copyFileSync("src/manifest.json", "dist/manifest.json");

await build({
  entryPoints: ["src/index.tsx"],
  outfile: "dist/main.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  // These are provided by Voiden at runtime — never bundle them
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "@voiden/sdk",
    "@voiden/sdk/ui",
  ],
});

console.log("Build complete → dist/main.js");
