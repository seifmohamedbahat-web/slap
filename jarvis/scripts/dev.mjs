/**
 * Development orchestrator: starts the Vite dev server, bundles the Electron
 * main + preload with esbuild in watch mode, then launches Electron pointed
 * at the dev server. Ctrl+C tears everything down.
 */
import { context } from "esbuild";
import { createServer } from "vite";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const shared = {
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  sourcemap: true,
  packages: "external",
  alias: { "@shared": path.join(root, "src/shared") },
  logLevel: "info",
};

const mainCtx = await context({
  ...shared,
  entryPoints: [path.join(root, "src/main/index.ts")],
  outfile: path.join(root, "dist/main/index.cjs"),
});
const preloadCtx = await context({
  ...shared,
  entryPoints: [path.join(root, "src/preload/index.ts")],
  outfile: path.join(root, "dist/preload/index.cjs"),
  packages: undefined,
  external: ["electron"],
});

await mainCtx.rebuild();
await preloadCtx.rebuild();
await mainCtx.watch();
await preloadCtx.watch();

const vite = await createServer({ configFile: path.join(root, "vite.config.ts") });
await vite.listen();
const devUrl = `http://localhost:${vite.config.server.port}`;
console.log(`[jarvis] renderer dev server at ${devUrl}`);

const electron = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["electron", "."],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, JARVIS_DEV_SERVER_URL: devUrl },
  },
);

async function shutdown(code = 0) {
  await Promise.allSettled([mainCtx.dispose(), preloadCtx.dispose(), vite.close()]);
  process.exit(code);
}

electron.on("close", (code) => shutdown(code ?? 0));
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
