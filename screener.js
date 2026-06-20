#!/usr/bin/env node
/**
 * Run a TCBS stock screener filter and dump the matching ticker list.
 *
 * Source: apiextaws.tcbs.com.vn/ligo/v1/watchlist/preview  (POST, requires JWT)
 *   body: { tcbsID, filters:[{key,operator,value}], size }
 *   response: { numOfTicker, searchData: { pageContent: [{ ticker, ... }] } }
 *
 * Auth: reads the JWT from .tcbs_token (gitignored). The TCBS token is short-lived
 *       (~12h) — re-copy it from DevTools when you get a 401.
 * Filter: edit filter.json to change the screener criteria.
 *
 * Output: data/_watchlist.txt  (one ticker per line)
 *
 * Usage:
 *   node screener.js
 *   node crawl.js --list data/_watchlist.txt   (then download OHLC for all)
 */

const fs = require("fs");
const path = require("path");

const URL = "https://apiextaws.tcbs.com.vn/ligo/v1/watchlist/preview";
const TOKEN_FILE = path.join(__dirname, ".tcbs_token");
const FILTER_FILE = path.join(__dirname, "filter.json");
const OUT_FILE = path.join(__dirname, "data", "_watchlist.txt");

async function main() {
  const token = fs.readFileSync(TOKEN_FILE, "utf8").trim();
  const filter = JSON.parse(fs.readFileSync(FILTER_FILE, "utf8"));

  const r = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "Bearer " + token,
      Referer: "https://tcinvest.tcbs.com.vn/",
    },
    body: JSON.stringify(filter),
  });

  if (r.status === 401) {
    console.error("401 Unauthorized - token expired. Re-copy the JWT into .tcbs_token");
    process.exit(1);
  }
  if (!r.ok) {
    console.error(`HTTP ${r.status}: ${await r.text()}`);
    process.exit(1);
  }

  const d = await r.json();
  const rows = (d.searchData && d.searchData.pageContent) || [];
  const tickers = rows.map((x) => x.ticker).filter(Boolean);

  // Always include the VNINDEX benchmark at the top of the watchlist.
  const ALWAYS = ["VNINDEX"];
  const list = [...ALWAYS, ...tickers.filter((t) => !ALWAYS.includes(t))];

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, list.join("\n") + "\n");

  console.log(`${list.length} tickers (incl. VNINDEX) -> ${OUT_FILE}`);
  console.log(list.join(", "));
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
