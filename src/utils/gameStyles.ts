/**
 * Hub-managed game stylesheets (`link#game-style-<key>`).
 *
 * Only one game stylesheet is loaded at a time. Hub CSS is never removed.
 * Game background gradients are painted on the mount shell (not body) —
 * a fixed fullscreen shell takes body out of flow, so body{background}
 * does not cover the viewport and the browser default (white) shows through.
 */

const GAME_STYLE_PREFIX = "game-style-";

/** Matches each game's `body { background: ... }` in its index.css. */
export const GAME_SHELL_BACKGROUNDS: Record<string, string> = {
  skull: "radial-gradient(circle at center, #1b0a0f 0%, #09090b 100%)",
  royal: "radial-gradient(circle at center, #1b160a 0%, #09090b 100%)",
  sheriff: "radial-gradient(circle at center, #1b1206 0%, #09090b 100%)",
  pool: "radial-gradient(circle at center, #0a1f1a 0%, #09090b 100%)",
};

export const HUB_SHELL_BACKGROUND =
  "radial-gradient(circle at center, #130f24 0%, #09090b 100%)";

function gameStyleId(gameName: string): string {
  return `${GAME_STYLE_PREFIX}${gameName}`;
}

/** Remove every game stylesheet from <head> (hub CSS only remains). */
export function unloadAllGameStyles(): void {
  document
    .querySelectorAll<HTMLLinkElement>(`link[id^="${GAME_STYLE_PREFIX}"]`)
    .forEach((link) => link.remove());
  document.documentElement.removeAttribute("data-p2play-game");
}

/**
 * Ensure only `gameName`'s stylesheet is loaded and last in <head>
 * (so its utilities / font-sans theme override the hub's). Resolves once ready.
 */
export function activateGameStyle(gameName: string, href: string): Promise<HTMLLinkElement> {
  const activeId = gameStyleId(gameName);

  document
    .querySelectorAll<HTMLLinkElement>(`link[id^="${GAME_STYLE_PREFIX}"]`)
    .forEach((link) => {
      if (link.id !== activeId) link.remove();
    });

  let link = document.getElementById(activeId) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = activeId;
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.p2playGameCss = gameName;
  } else {
    link.disabled = false;
    if (link.getAttribute("href") !== href) {
      link.href = href;
    }
  }

  document.head.appendChild(link);
  document.documentElement.dataset.p2playGame = gameName;

  return waitForStylesheet(link);
}

function waitForStylesheet(link: HTMLLinkElement): Promise<HTMLLinkElement> {
  if (link.sheet) return Promise.resolve(link);

  return new Promise((resolve, reject) => {
    const onLoad = () => {
      cleanup();
      resolve(link);
    };
    const onError = () => {
      cleanup();
      reject(new Error(`Failed to load stylesheet: ${link.href}`));
    };
    const cleanup = () => {
      link.removeEventListener("load", onLoad);
      link.removeEventListener("error", onError);
    };
    link.addEventListener("load", onLoad);
    link.addEventListener("error", onError);
  });
}
