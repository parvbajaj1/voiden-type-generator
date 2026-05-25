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
  // Provided by Voiden at runtime — never bundle
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "@voiden/sdk",
    "@voiden/sdk/ui",
    // Node.js built-ins — available in Electron's renderer process
    "fs", "path", "os", "crypto", "http", "https", "net", "url",
    "stream", "buffer", "events", "util", "zlib", "child_process",
    "node:fs", "node:path", "node:os", "node:crypto", "node:http",
    "node:https", "node:net", "node:url", "node:stream", "node:buffer",
    "node:events", "node:util", "node:zlib", "node:child_process",
  ],
});

console.log("Build complete → dist/main.js");
