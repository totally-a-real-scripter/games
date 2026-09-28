/**
 * Server-rendered error pages. Every dynamic value is HTML-escaped; the target
 * URL is attacker-influenced and must never be interpolated raw.
 */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"'`]/g, (c) => `&#${c.charCodeAt(0)};`);
}

export interface ErrorPageOptions {
  status: number;
  title: string;
  message: string;
  /** Real destination URL, shown to the user (escaped). */
  target?: string;
  /** Proxy path to retry (escaped). */
  retryPath?: string;
  code?: string;
}

export function renderErrorPage(o: ErrorPageOptions): string {
  const target = o.target ? `<p class="err-target" title="${escapeHtml(o.target)}">${escapeHtml(o.target)}</p>` : '';
  const retry = o.retryPath
    ? `<a class="btn btn-primary" href="${escapeHtml(o.retryPath)}">Try again</a>`
    : '';
  const code = o.code ? `<span class="err-code">${escapeHtml(o.code)}</span>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(o.title)}</title>
<link rel="stylesheet" href="/__px/static/app.css">
<link rel="icon" href="/__px/static/favicon.svg" type="image/svg+xml">
</head>
<body class="page-error">
<main class="err-card glass" role="alert">
  <div class="err-status">${o.status}${code}</div>
  <h1>${escapeHtml(o.title)}</h1>
  <p class="err-msg">${escapeHtml(o.message)}</p>
  ${target}
  <div class="err-actions">
    ${retry}
    <a class="btn" href="/__px/" target="_parent">Back to start</a>
  </div>
</main>
</body>
</html>`;
}
