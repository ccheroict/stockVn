#!/usr/bin/env node
/**
 * Lightweight local server for the TA chart demo (no external deps).
 *   GET /                     -> web/index.html
 *   GET /api/symbols          -> ["FPT","HPG",...]  (from ../data/*.csv)
 *   GET /api/ohlc?symbol=FPT  -> [{timestamp,open,high,low,close,volume}, ...]
 *
 * Usage: node web/server.js   (then open http://localhost:5174)
 * Private/local only — no auth, binds to localhost.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = 5174;
const WEB_DIR = __dirname;
const DATA_DIR = path.join(__dirname, "..", "data");

function send(res, code, body, type) {
  res.writeHead(code, { "Content-Type": type || "application/json; charset=utf-8" });
  res.end(body);
}

function listSymbols() {
  return fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".csv") && !f.startsWith("_"))
    .map((f) => f.replace(/\.csv$/, ""))
    .sort();
}

// CSV: date,open,high,low,close,volume  ->  KLineCharts data items (timestamp in ms)
function readOhlc(symbol) {
  const file = path.join(DATA_DIR, path.basename(symbol.toUpperCase()) + ".csv");
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, o, h, l, c, v] = lines[i].split(",");
    if (!date) continue;
    out.push({
      timestamp: Date.parse(date + "T00:00:00+07:00"),
      open: +o,
      high: +h,
      low: +l,
      close: +c,
      volume: +v,
    });
  }
  return out;
}

const server = http.createServer((req, res) => {
  const u = url.parse(req.url, true);

  if (u.pathname === "/api/symbols") {
    return send(res, 200, JSON.stringify(listSymbols()));
  }
  if (u.pathname === "/api/ohlc") {
    const sym = (u.query.symbol || "").toString();
    const data = readOhlc(sym);
    if (!data) return send(res, 404, JSON.stringify({ error: "symbol not found" }));
    return send(res, 200, JSON.stringify(data));
  }

  // static files
  let p = u.pathname === "/" ? "/index.html" : u.pathname;
  const file = path.join(WEB_DIR, path.normalize(p).replace(/^(\.\.[/\\])+/, ""));
  if (file.startsWith(WEB_DIR) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    const ext = path.extname(file).toLowerCase();
    const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" };
    return send(res, 200, fs.readFileSync(file), types[ext] || "application/octet-stream");
  }
  send(res, 404, "Not found", "text/plain");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`TA chart demo: http://localhost:${PORT}`);
});
