#!/usr/bin/env node
/**
 * Crawl daily OHLC for Vietnamese stocks & indices from DNSE (entrade) public chart API.
 *
 * Source: services.entrade.com.vn/chart-api/v2/ohlcs/{stock|index}
 *   query: ?from=<unix>&to=<unix>&symbol=<SYM>&resolution=1D
 *   response: { t:[unix...], o:[], h:[], l:[], c:[], v:[] }
 *   - stocks: prices in THOUSAND VND, back-adjusted -> CSV in FULL VND (x1000)
 *   - indices (VNINDEX...): prices are index POINTS -> CSV keeps raw value (no x1000)
 *   free, no auth, longer history than turtletrading (FPT back to ~2012)
 *
 * Output: data/<SYM>.csv  with columns date,open,high,low,close,volume
 *
 * Usage:
 *   node crawl.js FPT
 *   node crawl.js FPT HPG VNM MWG     (multiple symbols)
 *   node crawl.js --list data/_watchlist.txt   (one symbol per line; # = comment)
 */

const fs = require("fs");
const path = require("path");

const BASE = "https://services.entrade.com.vn/chart-api/v2/ohlcs";
const OUT_DIR = path.join(__dirname, "data");
const FROM = Math.floor(new Date("2000-01-01T00:00:00Z").getTime() / 1000);

// VN market indices use the /ohlcs/index endpoint and are quoted in points (no x1000).
const INDEX_SET = new Set([
  "VNINDEX", "VN30", "VN100", "VNXALL", "VNMIDCAP", "VNSMALLCAP", "VNALLSHARE",
  "HNXINDEX", "HNX30", "HNXUPCOMINDEX", "UPCOMINDEX",
]);

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.json();
}

// Returns array of {date, open, high, low, close, volume} ascending by date.
// Stocks -> FULL VND (x1000). Indices -> raw points.
async function fetchDaily(sym) {
  const u = sym.toUpperCase();
  const isIndex = INDEX_SET.has(u);
  const kind = isIndex ? "index" : "stock";
  const scale = isIndex ? 1 : 1000;
  const fmt = isIndex
    ? (v) => Math.round(v * 100) / 100 // keep 2 decimals for index points
    : (v) => Math.round(v * scale); // integer VND for stocks
  const to = Math.floor(Date.now() / 1000);
  const url = `${BASE}/${kind}?from=${FROM}&to=${to}&symbol=${encodeURIComponent(u)}&resolution=1D`;
  const d = await getJson(url);
  const t = (d && d.t) || [];
  if (!t.length) throw new Error("no bars in entrade response");
  const rows = [];
  for (let i = 0; i < t.length; i++) {
    rows.push({
      date: new Date(t[i] * 1000).toISOString().slice(0, 10),
      open: fmt(d.o[i]),
      high: fmt(d.h[i]),
      low: fmt(d.l[i]),
      close: fmt(d.c[i]),
      volume: Math.round(d.v[i]) || 0,
    });
  }
  return rows;
}

function toCsv(rows) {
  let out = "date,open,high,low,close,volume\n";
  for (const x of rows) {
    out += `${x.date},${x.open},${x.high},${x.low},${x.close},${x.volume}\n`;
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  let syms = [];
  if (args[0] === "--list") {
    if (!args[1]) {
      console.error("Usage: node crawl.js --list <file>");
      process.exit(1);
    }
    syms = fs
      .readFileSync(args[1], "utf8")
      .split(/\r?\n/)
      .map((l) => l.split(/[#,]/)[0].trim())
      .filter(Boolean);
  } else {
    syms = args;
  }
  if (!syms.length) {
    console.error("Usage: node crawl.js <SYMBOL> [SYMBOL...]  |  node crawl.js --list <file>");
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const sym of syms) {
    try {
      const rows = await fetchDaily(sym);
      const file = path.join(OUT_DIR, `${sym.toUpperCase()}.csv`);
      fs.writeFileSync(file, toCsv(rows));
      const first = rows[0] && rows[0].date;
      const last = rows[rows.length - 1] && rows[rows.length - 1].date;
      console.log(`${sym.toUpperCase()}: ${rows.length} rows [${first} -> ${last}] -> ${file}`);
    } catch (e) {
      console.error(`${sym.toUpperCase()}: FAILED - ${e.message}`);
    }
  }
}

main();
