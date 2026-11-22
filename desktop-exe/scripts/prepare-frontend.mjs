import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(here, "..");
const projectRoot = path.resolve(desktopRoot, "..");
const source = path.join(projectRoot, "web");
const target = path.join(desktopRoot, "build", "frontend");

if (!fs.existsSync(path.join(source, "package.json"))) {
  throw new Error(`找不到网站前端：${source}`);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });

for (const entry of [
  "src",
  "public",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next-env.d.ts",
  "postcss.config.mjs",
  "eslint.config.mjs",
]) {
  const from = path.join(source, entry);
  if (fs.existsSync(from)) {
    fs.cpSync(from, path.join(target, entry), { recursive: true });
  }
}

// Desktop-only surface overrides. They are applied after the website source is
// copied, so desktop releases can evolve without changing the deployed web UI.
const overrides = path.join(desktopRoot, "overrides");
if (fs.existsSync(overrides)) {
  fs.cpSync(overrides, target, { recursive: true });
}

const config = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: { proxyTimeout: 360_000 },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "img.alicdn.com" },
      { protocol: "https", hostname: "xinggui.xin" },
    ],
  },
  async rewrites() {
    return [{
      source: "/szr3-api/:path*",
      destination: "http://127.0.0.1:43124/:path*",
    }];
  },
};

export default nextConfig;
`;

fs.writeFileSync(path.join(target, "next.config.ts"), config, "utf8");
console.log(`已创建隔离的桌面前端副本：${target}`);
