/**
 * Hub-managed game stylesheets (`link#game-style-<key>`).
 * Only one game stylesheet may be active at a time; the hub's own CSS
 * (Vite-injected) is never touched.
 */

const GAME_STYLE_PREFIX = "game-style-";

function gameStyleId(gameName: string): string {
  return `${GAME_STYLE_PREFIX}${gameName}`;
}

/** Remove every game stylesheet from <head> (hub CSS only remains). */
export function unloadAllGameStyles(): void {
  document
    .querySelectorAll<HTMLLinkElement>(`link[id^="${GAME_STYLE_PREFIX}"]`)
    .forEach((link) => link.remove());
}

/**
 * Ensure only `gameName`'s stylesheet is loaded and enabled.
 * Other `game-style-*` links are removed so their rules cannot bleed.
 */
export function activateGameStyle(gameName: string, href: string): HTMLLinkElement {
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
    document.head.appendChild(link);
  } else {
    link.disabled = false;
    if (link.getAttribute("href") !== href) {
      link.href = href;
    }
  }

  return link;
}
