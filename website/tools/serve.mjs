import http from "node:http";
import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const portArg = process.argv.indexOf("--port");
const port = Number(
  portArg >= 0 ? process.argv[portArg + 1] : process.env.PORT || 4175,
);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

http
  .createServer((req, res) => {
    let file;
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      file = path.resolve(
        root,
        `.${pathname === "/" ? "/index.html" : pathname}`,
      );
      if (!file.startsWith(root) || !statSync(file).isFile())
        throw new Error("Not found");
      const size = statSync(file).size;
      const headers = {
        "content-type": types[path.extname(file)] || "application/octet-stream",
        "cache-control": "no-cache",
        "accept-ranges": "bytes",
      };
      const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
      if (range) {
        const start = Number(range[1]);
        const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
        if (start > end || start >= size) {
          res.writeHead(416, { "content-range": `bytes */${size}` });
          res.end();
          return;
        }
        res.writeHead(206, {
          ...headers,
          "content-range": `bytes ${start}-${end}/${size}`,
          "content-length": end - start + 1,
        });
        if (req.method === "HEAD") res.end();
        else createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { ...headers, "content-length": size });
        if (req.method === "HEAD") res.end();
        else createReadStream(file).pipe(res);
      }
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("页面不存在");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`星轨官网预览：http://127.0.0.1:${port}`),
  );
