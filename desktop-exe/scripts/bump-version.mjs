import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = path.join(root, "package.json");
const readmePath = path.join(root, "README.md");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const parts = pkg.version.split(".").map((part) => Number.parseInt(part, 10));
if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
  throw new Error(`无法解析当前版本号：${pkg.version}`);
}

const next = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
pkg.version = next;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, "utf8");
  readme = readme.replace(/当前发布版本：`[\d.]+`/, `当前发布版本：\`${next}\``);
  fs.writeFileSync(readmePath, readme, "utf8");
}

console.log(`桌面版版本已递增为 ${next}`);
