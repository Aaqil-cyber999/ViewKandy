#!/usr/bin/env node
/**
 * Copies the large third-party runtime assets (CesiumJS, Leaflet CSS) into
 * /public so they can be served locally with long-lived cache headers.
 *
 * These assets are NOT committed to git — run `npm run setup:assets`
 * (also wired to predev / prebuild) after installing dependencies.
 */
import { cp, mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readVersion(pkg) {
  try {
    const raw = await readFile(path.join(root, "node_modules", pkg, "package.json"), "utf8");
    return JSON.parse(raw).version;
  } catch {
    return null;
  }
}

async function copyCesium() {
  const version = await readVersion("cesium");
  if (!version) {
    console.warn("[setup-assets] cesium is not installed; skipping 3D runtime.");
    return;
  }
  const source = path.join(root, "node_modules", "cesium", "Build", "Cesium");
  const target = path.join(publicDir, "cesium");
  const stamp = path.join(target, ".version");
  if ((await exists(stamp)) && (await readFile(stamp, "utf8")).trim() === version) {
    console.log(`[setup-assets] Cesium ${version} already prepared.`);
    return;
  }
  if (!(await exists(source))) {
    console.warn("[setup-assets] Cesium build directory missing; run npm install again.");
    return;
  }
  console.log(`[setup-assets] Copying Cesium ${version} runtime (~22 MB, one time)...`);
  await mkdir(target, { recursive: true });
  for (const entry of ["Assets", "ThirdParty", "Widgets", "Workers", "Cesium.js"]) {
    await cp(path.join(source, entry), path.join(target, entry), { recursive: true });
  }
  await writeFile(stamp, version, "utf8");
}

async function copyCss(pkg, relative, filename) {
  const version = await readVersion(pkg);
  if (!version) return;
  const source = path.join(root, "node_modules", pkg, relative);
  if (!(await exists(source))) return;
  const targetDir = path.join(publicDir, "vendor");
  await mkdir(targetDir, { recursive: true });
  await cp(source, path.join(targetDir, filename));
}

await copyCesium();
await copyCss("leaflet", "dist/leaflet.css", "leaflet.css");
await copyCss("leaflet.markercluster", "dist/MarkerCluster.css", "markercluster.css");
await copyCss("leaflet.markercluster", "dist/MarkerCluster.Default.css", "markercluster-default.css");
console.log("[setup-assets] Done.");
