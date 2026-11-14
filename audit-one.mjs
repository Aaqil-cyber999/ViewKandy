import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
await page.goto("http://localhost:3000/explore", { waitUntil: "load", timeout: 90000 });
await page.waitForTimeout(2500);
const out = await page.evaluate(() => {
  const vw = window.innerWidth;
  const rows = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width > vw - 20 && r.height > 0) {
      const cs = getComputedStyle(el);
      rows.push({
        tag: el.tagName,
        cls: String(el.className).slice(0, 90),
        w: Math.round(r.width),
        left: Math.round(r.left),
        right: Math.round(r.right),
        minW: cs.minWidth,
        ws: cs.whiteSpace,
        display: cs.display,
        scrollW: el.scrollWidth,
        depth: (() => { let d = 0, p = el; while ((p = p.parentElement)) d++; return d; })(),
      });
    }
  }
  return { vw, sw: document.documentElement.scrollWidth, rows: rows.sort((a, b) => a.depth - b.depth).slice(0, 40) };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
