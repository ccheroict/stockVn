#!/usr/bin/env node
/**
 * Auto-refresh the TCBS token by reading it from a logged-in browser session.
 *
 * Approach: launch Chromium with a PERSISTENT profile (./.tcbs-profile). You log in
 * ONCE (incl. OTP) in that window. On every run after that, the saved session lets
 * the TCBS web app issue a fresh access token, which this script reads from
 * localStorage and writes to .tcbs_token — no password stored anywhere here.
 *
 * Setup (once):
 *   npm init -y
 *   npm i playwright
 *   npx playwright install chromium
 *
 * Usage:
 *   node auto-token.js            # opens browser; first run: log in, then press Enter
 *   node auto-token.js --headless # after session is saved, run silently
 */

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const PROFILE_DIR = path.join(__dirname, ".tcbs-profile");
const TOKEN_FILE = path.join(__dirname, ".tcbs_token");
const LOGIN_URL = "https://tcinvest.tcbs.com.vn/";
const headless = process.argv.includes("--headless");

function looksLikeJwt(v) {
  if (typeof v !== "string") return false;
  const p = v.split(".");
  if (p.length !== 3) return false;
  try {
    const b = JSON.parse(Buffer.from(p[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    return !!(b.tcbsId || b.iss === "authen_service" || b.custodyID);
  } catch (e) {
    return false;
  }
}

// scan localStorage/sessionStorage (token may be nested in a JSON value)
function findTokenInStorage() {
  const stores = [window.localStorage, window.sessionStorage];
  const out = [];
  for (const s of stores) {
    for (let i = 0; i < s.length; i++) out.push(s.getItem(s.key(i)));
  }
  return out;
}

async function main() {
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, { headless });
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" });

  // poll up to 3 min for a token to appear (covers a manual login on first run)
  const deadline = Date.now() + 180000;
  let token = null;
  while (Date.now() < deadline) {
    const candidates = await page.evaluate(findTokenInStorage);
    for (const v of candidates) {
      if (looksLikeJwt(v)) { token = v; break; }
      try {
        const o = JSON.parse(v);
        for (const k in o) if (looksLikeJwt(o[k])) { token = o[k]; break; }
      } catch (e) {}
      if (token) break;
    }
    if (token) break;
    await page.waitForTimeout(2000);
  }

  await ctx.close();

  if (!token) {
    console.error("No TCBS token found. First run: log in manually, then re-run.");
    process.exit(1);
  }
  fs.writeFileSync(TOKEN_FILE, token + "\n");
  const exp = JSON.parse(Buffer.from(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()).exp;
  console.log(`Token written to .tcbs_token (expires ${new Date(exp * 1000).toLocaleString()})`);
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
