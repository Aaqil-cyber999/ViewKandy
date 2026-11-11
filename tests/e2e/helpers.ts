import type { Page } from "@playwright/test";

/**
 * Wait until a server-rendered element has been hydrated by React.
 *
 * Next.js streams the page before the client bundle attaches event handlers.
 * Filling a controlled input during that window sets the DOM value but leaves
 * React state empty, so the submit button stays disabled. React attaches
 * `__reactProps$` / `__reactFiber$` to hydrated DOM nodes, which gives us a
 * deterministic hydration signal without arbitrary sleeps.
 */
export async function waitForReactHydration(page: Page, selector: string) {
  await page.waitForFunction((target) => {
    const element = document.querySelector(target);
    if (!element) return false;

    return Object.keys(element).some(
      (key) => key.startsWith("__reactProps$") || key.startsWith("__reactFiber$"),
    );
  }, selector);
}
