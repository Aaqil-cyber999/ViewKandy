import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const widths = [320, 360, 390, 414, 480, 640, 768, 834, 1024, 1180, 1280, 1440, 1920];
const paths = ["/", "/explore", "/places", "/planner", "/assistant", "/tours", "/saved", "/auth", "/offline", "/places/kandy-lake"];

for (const width of widths) {
  await page.setViewportSize({ width, height: 800 });
  for (const path of paths) {
    try {
      await page.goto(`http://localhost:3000${path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    } catch {
      console.log(`NAV-FAIL ${width} ${path}`);
      continue;
    }
    await page.waitForTimeout(700);
    const report = await page.evaluate(() => {
      const de = document.documentElement;
      const iw = window.innerWidth;
      const issues = [];
      const walk = (el) => {
        if (!(el instanceof HTMLElement)) return;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || cs.position === "fixed" || cs.position === "absolute") return;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > iw + 1) {
          const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 36);
          issues.push({ tag: el.tagName, cls: el.className?.toString().slice(0, 40), right: Math.round(r.right), w: Math.round(r.width), text });
        }
      };
      document.querySelectorAll("body *").forEach(walk);
      return {
        sw: de.scrollWidth,
        iw,
        overflow: de.scrollWidth - iw,
        issues: issues.slice(0, 6),
        issueCount: issues.length,
        title: document.title,
      };
    });
    if (report.overflow > 1 || report.issueCount > 0) {
      console.log(`${width} ${path} overflow=${report.overflow} issues=${report.issueCount} ${JSON.stringify(report.issues)}`);
    }
  }
}
console.log("pageerrors", JSON.stringify(errors.slice(0, 10)));
await browser.close();
