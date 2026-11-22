import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const source = ["index.html", "app.js"]
  .map((file) => readFileSync(new URL(file, root), "utf8"))
  .join("");
const text = [
  ...new Set(source.match(/[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/g)),
]
  .sort()
  .join("");
const query = new URLSearchParams({
  family: "Noto Sans SC:wght@400..800",
  display: "swap",
  text,
});
const response = await fetch(`https://fonts.googleapis.com/css2?${query}`, {
  headers: {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  },
});
if (!response.ok) throw new Error(`Font stylesheet HTTP ${response.status}`);
const css = await response.text();
const fontUrl = css.match(/src:\s*url\(([^)]+)\)/)?.[1];
if (!fontUrl) throw new Error("Font download URL missing");
const font = await fetch(fontUrl);
if (!font.ok) throw new Error(`Font HTTP ${font.status}`);
mkdirSync(new URL("assets/fonts/", root), { recursive: true });
writeFileSync(
  new URL("assets/fonts/xinggui-sc.woff2", root),
  Buffer.from(await font.arrayBuffer()),
);
const license = await fetch(
  "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/OFL.txt",
);
if (!license.ok) throw new Error(`Font license HTTP ${license.status}`);
writeFileSync(
  new URL("assets/fonts/OFL-Noto-Sans-SC.txt", root),
  await license.text(),
);
console.log(
  `Saved self-hosted Chinese font subset: ${text.length} characters.`,
);
