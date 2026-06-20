#!/usr/bin/env node
/**
 * Full pipeline in one command:
 *   1. auto-token.js --headless   -> refresh .tcbs_token from saved session
 *   2. screener.js                -> run TCBS filter -> data/_watchlist.txt
 *   3. crawl.js --list ...        -> download daily OHLC for every ticker
 *
 * Usage: node run.js
 * (First time only: run `node auto-token.js` once and log in to seed the session.)
 */

const { execFileSync } = require("child_process");
const path = require("path");

const steps = [
  ["auto-token.js", ["--headless"]],
  ["screener.js", []],
  ["crawl.js", ["--list", path.join("data", "_watchlist.txt")]],
];

for (const [script, args] of steps) {
  console.log(`\n=== ${script} ${args.join(" ")} ===`);
  execFileSync(process.execPath, [path.join(__dirname, script), ...args], {
    stdio: "inherit",
    cwd: __dirname,
  });
}
console.log("\nDone.");
