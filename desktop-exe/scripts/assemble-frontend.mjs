import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(here, "..");
const frontend = path.join(desktopRoot, "build", "frontend");
const standalone = path.join(frontend, ".next", "standalone");
const runtime = path.join(desktopRoot, "build", "runtime");

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  throw new Error("Next.js standalone 构建缺少 server.js");
}

fs.rmSync(runtime, { recursive: true, force: true });
fs.cpSync(standalone, runtime, { recursive: true });
const nodeModules = path.join(runtime, "node_modules");
if (fs.existsSync(nodeModules)) {
  fs.renameSync(nodeModules, path.join(runtime, "vendor"));
}
fs.cpSync(path.join(frontend, ".next", "static"), path.join(runtime, ".next", "static"), { recursive: true });

const publicDir = path.join(frontend, "public");
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, path.join(runtime, "public"), { recursive: true });
}

console.log(`桌面运行时已生成：${runtime}`);
