import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const shared = {
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: true,
  // Keep node_modules external: electron-builder packages them, and the
  // Electron runtime resolves them normally in development.
  packages: "external",
  alias: { "@shared": path.join(root, "src/shared") },
  logLevel: "info",
};

await build({
  ...shared,
  entryPoints: [path.join(root, "src/main/index.ts")],
  outfile: path.join(root, "dist/main/index.cjs"),
});

await build({
  ...shared,
  entryPoints: [path.join(root, "src/preload/index.ts")],
  outfile: path.join(root, "dist/preload/index.cjs"),
  // Preload runs in a sandboxed context: everything must be inlined except electron itself.
  packages: undefined,
  external: ["electron"],
});
