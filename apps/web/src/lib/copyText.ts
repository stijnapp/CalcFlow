/**
 * Puts text on the clipboard, including where the modern API is not there to
 * use. `navigator.clipboard` needs a secure context, and the app is reachable
 * over plain http on the LAN during development — the old selection trick still
 * works there, and is the difference between "hold to copy" working everywhere
 * and working only once Tailscale is in front of it.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Denied, or no transient activation left. Fall through and try the old way.
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  // Off-screen rather than hidden: `display: none` cannot hold a selection.
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:-1000px;opacity:0';
  document.body.append(area);
  try {
    area.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
