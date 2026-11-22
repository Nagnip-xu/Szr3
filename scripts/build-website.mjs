import {
  cp,
  mkdir,
  readFile,
  readdir,
  writeFile,
  lstat,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = path.join(projectRoot, "website");
const outputRoot = path.join(projectRoot, "_site");
const entryFiles = ["index.html", "styles.css", "app.js"];
const assetTypes = new Set([
  ".svg",
  ".webp",
  ".mp4",
  ".woff2",
  ".txt",
  ".json",
]);

// Explicitly select the public artifact. Backend files and local review tools
// never enter the Pages upload directory.
await mkdir(outputRoot, { recursive: true });
if ((await readdir(outputRoot)).length) {
  throw new Error(
    "_site must be empty before building. Remove the previous artifact and retry.",
  );
}
for (const name of entryFiles) {
  await cp(path.join(sourceRoot, name), path.join(outputRoot, name));
}
let count = entryFiles.length;
async function copyAssets(relative) {
  const directory = path.join(sourceRoot, relative);
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const next = path.join(relative, item.name);
    if (item.isSymbolicLink())
      throw new Error(`Asset symlink is not allowed: ${next}`);
    if (item.isDirectory()) await copyAssets(next);
    else if (assetTypes.has(path.extname(item.name))) {
      await mkdir(path.dirname(path.join(outputRoot, next)), {
        recursive: true,
      });
      await cp(path.join(sourceRoot, next), path.join(outputRoot, next));
      count++;
    }
  }
}
await copyAssets("assets");
await writeFile(path.join(outputRoot, ".nojekyll"), "");

for (const name of ["index.html", "styles.css"]) {
  const source = await readFile(path.join(outputRoot, name), "utf8");
  const references = [
    ...source.matchAll(
      /(?:src|poster|href)=["'](\.\/[^"']+)["']|url\(["']?(\.\/[^)'"\s]+)["']?\)/g,
    ),
  ];
  for (const match of references) {
    const relative = (match[1] || match[2]).split(/[?#]/)[0];
    if (!(await lstat(path.join(outputRoot, relative))).isFile()) {
      throw new Error(`Missing public asset: ${relative}`);
    }
  }
}
console.log(`官网发布文件已生成：_site/，${count} 个文件，资源引用检查通过。`);
