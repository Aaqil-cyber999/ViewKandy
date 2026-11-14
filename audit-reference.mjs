import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://srilanka.travel/", { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(9000);

const data = await page.evaluate(() => {
  const pick = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120),
      font: cs.fontFamily,
      size: cs.fontSize,
      weight: cs.fontWeight,
      tracking: cs.letterSpacing,
      lineHeight: cs.lineHeight,
      color: cs.color,
      bg: cs.backgroundColor,
    };
  };
  const heads = Array.from(document.querySelectorAll("h1,h2,h3")).slice(0, 30).map(pick);
  const nav = Array.from(document.querySelectorAll("header a, nav a")).slice(0, 20).map((a) => a.textContent?.trim()).filter(Boolean);
  const sections = Array.from(document.querySelectorAll("section")).slice(0, 25).map((s) => {
    const cs = getComputedStyle(s);
    const r = s.getBoundingClientRect();
    return {
      cls: (s.className || "").toString().slice(0, 120),
      h: Math.round(r.height),
      bg: cs.backgroundColor,
      bgImage: cs.backgroundImage.slice(0, 120),
      text: (s.innerText || "").trim().replace(/\s+/g, " ").slice(0, 90),
    };
  });
  const imgs = Array.from(document.querySelectorAll("img")).slice(0, 25).map((i) => ({
    src: i.currentSrc || i.src,
    alt: i.alt,
    w: i.naturalWidth,
    h: i.naturalHeight,
  }));
  const videos = Array.from(document.querySelectorAll("video, source")).slice(0, 10).map((v) => v.src || v.currentSrc);
  const root = getComputedStyle(document.documentElement);
  const vars = {};
  for (const name of ["--font-heading", "--font-body", "--font-script", "--color-primary", "--color-secondary", "--color-accent", "--background", "--foreground"]) {
    vars[name] = root.getPropertyValue(name).trim();
  }
  return {
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyFont: getComputedStyle(document.body).fontFamily,
    bodyColor: getComputedStyle(document.body).color,
    pageHeight: document.documentElement.scrollHeight,
    heads,
    nav,
    sections,
    imgs,
    videos,
    vars,
    text: document.body.innerText.replace(/\s+/g, " ").slice(0, 5000),
  };
});
console.log(JSON.stringify(data, null, 1));
await browser.close();
