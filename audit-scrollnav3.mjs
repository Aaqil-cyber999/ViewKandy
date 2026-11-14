import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage();
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(e.message));

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
  { name: "landscape", width: 844, height: 390 },
];

const pages = ["/", "/explore", "/planner", "/assistant", "/places", "/tours", "/saved", "/auth", "/offline", "/places/the-empire-cafe"];

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  for (const path of pages) {
    await page.goto(`http://localhost:3000${path}`, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(1800);
    const base = await page.evaluate(() => {
      const nav = document.querySelector(".kv-scroll-nav");
      const rail = document.querySelector(".kv-scroll-rail");
      const labels = Array.from(document.querySelectorAll(".kv-scroll-nav ol a"));
      const ticks = Array.from(document.querySelectorAll(".kv-scroll-rail > span[aria-hidden] > span"));
      const nr = nav?.getBoundingClientRect();
      const rr = rail?.getBoundingClientRect();
      return {
        path: location.pathname,
        sw: document.documentElement.scrollWidth,
        iw: innerWidth,
        sh: document.documentElement.scrollHeight,
        nav: nr ? { x: Math.round(nr.x), w: Math.round(nr.width), y: Math.round(nr.y), h: Math.round(nr.height) } : null,
        rail: rr ? { x: Math.round(rr.x), w: Math.round(rr.width), y: Math.round(rr.y), h: Math.round(rr.height) } : null,
        labelCount: labels.length,
        visibleLabels: labels.filter((l) => l.getBoundingClientRect().width > 0).length,
        tickCount: ticks.length,
        tickTops: ticks.map((t) => Math.round(t.getBoundingClientRect().top)),
        firstLabel: labels[0] ? { right: Math.round(labels[0].getBoundingClientRect().right), left: Math.round(labels[0].getBoundingClientRect().left) } : null,
      };
    });
    if (base.sw > base.iw) console.log("OVERFLOW", vp.name, path, base.sw, base.iw);
    if (path === "/" || base.nav) {
      console.log(vp.name, path, JSON.stringify(base));
    }
  }
}

// Deep check on homepage: fills + overlap at several scroll positions.
for (const vp of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }]) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto("http://localhost:3000/", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2000);
  for (const ratio of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
    await page.evaluate((r) => {
      const max = document.documentElement.scrollHeight - innerHeight;
      window.scrollTo(0, Math.round(max * r));
    }, ratio);
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => {
      const nav = document.querySelector(".kv-scroll-nav");
      const rail = document.querySelector(".kv-scroll-rail");
      const nr = nav.getBoundingClientRect();
      const rr = rail.getBoundingClientRect();
      const gutter = innerWidth >= 768 ? 128 : 16;
      const bandLeft = innerWidth - gutter;
      const labels = Array.from(document.querySelectorAll(".kv-scroll-nav ol a")).map((a) => {
        const overlay = a.querySelector("span.absolute");
        return {
          label: a.getAttribute("aria-label"),
          current: a.getAttribute("aria-current"),
          firstCharClip: overlay ? getComputedStyle(overlay).clipPath : null,
        };
      });
      const current = document.querySelector('.kv-scroll-nav a[aria-current="true"]');
      const scaleY = getComputedStyle(document.querySelector(".kv-scroll-rail span.origin-top")).transform;
      // Interactive elements intruding into the rail gutter band, at the rail's vertical band.
      const hits = [];
      for (const el of document.querySelectorAll("a,button,input,select,textarea,[role=button]")) {
        if (nav.contains(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const overlapsY = r.bottom > rr.top - 8 && r.top < rr.bottom + 8;
        const intrudes = r.right > bandLeft;
        if (overlapsY && intrudes) {
          hits.push({
            tag: el.tagName,
            text: (el.textContent || "").trim().slice(0, 24),
            right: Math.round(r.right),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
          });
        }
      }
      return {
        y: Math.round(scrollY),
        current: current?.getAttribute("aria-label") ?? null,
        scaleY,
        labels,
        hits: hits.slice(0, 8),
        navRight: Math.round(nr.right),
        railX: Math.round(rr.x),
      };
    });
    console.log(vp.name, "scroll", ratio, JSON.stringify(state));
  }
}

console.log("errors", JSON.stringify(errors));
await browser.close();
