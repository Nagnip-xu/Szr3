import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const target = process.argv[2] ?? "nsis";
const windowsTools = [
  "C:\\Windows\\System32\\WindowsPowerShell\\v1.0",
  "C:\\Windows\\System32",
];

const result = spawnSync(
  process.execPath,
  [path.join(root, "node_modules", "electron-builder", "cli.js"), "--win", target],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      PATH: [...windowsTools, process.env.PATH ?? ""].join(path.delimiter),
      ELECTRON_BUILDER_BINARIES_MIRROR:
        process.env.ELECTRON_BUILDER_BINARIES_MIRROR ??
        "https://npmmirror.com/mirrors/electron-builder-binaries/",
    },
  },
);

process.exit(result.status ?? 1);
