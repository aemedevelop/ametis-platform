// Servidor estático mínimo para probar el widget (demo.html / preview.html).
//   node serve.js           -> http://localhost:4173
//   node serve.js 8080      -> http://localhost:8080
const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.argv[2]) || 4173;
const root = __dirname;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let filePath = path.join(root, urlPath === "/" ? "/demo.html" : urlPath);
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404).end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(port, () => console.log(`Sirviendo ${root}\n  http://localhost:${port}/demo.html\n  http://localhost:${port}/preview.html`));
