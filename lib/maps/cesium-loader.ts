"use client";

export type CesiumNamespace = typeof import("cesium");

declare global {
  interface Window {
    Cesium?: CesiumNamespace;
    CESIUM_BASE_URL?: string;
  }
}

let loadPromise: Promise<CesiumNamespace> | null = null;

function injectStylesheet(): void {
  if (document.getElementById("cesium-widget-css")) return;
  const link = document.createElement("link");
  link.id = "cesium-widget-css";
  link.rel = "stylesheet";
  link.href = "/cesium/Widgets/widgets.css";
  document.head.appendChild(link);
}

/**
 * Loads the prebuilt CesiumJS runtime from /public/cesium (copied by
 * `npm run setup:assets`). Loading it outside the bundler keeps the 22 MB
 * engine out of the JS graph and avoids webpack worker complications, while
 * still serving everything from our own origin.
 */
export function loadCesium(): Promise<CesiumNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cesium can only load in the browser."));
  }
  if (window.Cesium) return Promise.resolve(window.Cesium);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<CesiumNamespace>((resolve, reject) => {
    window.CESIUM_BASE_URL = "/cesium/";
    injectStylesheet();

    const existing = document.getElementById("cesium-runtime") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.Cesium) resolve(window.Cesium);
        else reject(new Error("Cesium runtime loaded but global is missing."));
      });
      existing.addEventListener("error", () => reject(new Error("Cesium runtime failed to load.")));
      return;
    }

    const script = document.createElement("script");
    script.id = "cesium-runtime";
    script.src = "/cesium/Cesium.js";
    script.async = true;
    const timeout = window.setTimeout(() => {
      reject(new Error("Cesium runtime timed out. Run `npm run setup:assets` and reload."));
    }, 30_000);
    script.onload = () => {
      window.clearTimeout(timeout);
      if (window.Cesium) resolve(window.Cesium);
      else reject(new Error("Cesium runtime loaded but global is missing."));
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("Cesium runtime failed to load. Run `npm run setup:assets`."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}
