// Run in browser DevTools, or pass through agent-browser eval --stdin.
JSON.stringify({
  url: location.origin + location.pathname,
  scripts: Array.from(document.querySelectorAll('script[src="https://datafa.st/js/script.js"]')).map((script) => ({
    src: script.src,
    websiteId: script.getAttribute('data-website-id'),
    domain: script.getAttribute('data-domain'),
    defer: script.defer,
  })),
  resources: performance.getEntriesByType('resource')
    .filter((entry) => new URL(entry.name).hostname === 'datafa.st')
    .map((entry) => ({ path: new URL(entry.name).pathname, type: entry.initiatorType, status: entry.responseStatus || null })),
});
