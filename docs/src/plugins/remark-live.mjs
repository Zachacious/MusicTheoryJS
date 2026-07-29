/**
 * Remark plugin: turn ```ts live fences into playground blocks.
 *
 * A fence tagged `ts live` becomes a `.mtjs-live` div carrying the source in
 * a `data-code` attribute, with the plain code kept inside as a no-JS
 * fallback. The client script (src/scripts/playground.ts) upgrades each div
 * into an editable, runnable example. Plain ```ts fences are untouched.
 */

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function transform(node) {
  const children = node.children;
  if (!Array.isArray(children)) return;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (
      child.type === "code" &&
      child.lang === "ts" &&
      /\blive\b/.test(child.meta ?? "")
    ) {
      children[i] = {
        type: "html",
        value:
          `<div class="mtjs-live" data-code="${encodeURIComponent(child.value)}">` +
          `<pre class="mtjs-live-fallback"><code>${escapeHtml(child.value)}</code></pre>` +
          "</div>",
      };
    } else {
      transform(child);
    }
  }
}

export function remarkLive() {
  return (tree) => {
    transform(tree);
  };
}
