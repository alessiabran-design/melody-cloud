import { closeSheet } from './utils.js';

const routes = [];
let notFoundHandler = null;
let currentCleanup = null;

export function route(pattern, handler) {
  const paramNames = [];
  const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, (m) => {
    paramNames.push(m.slice(1));
    return '([^/]+)';
  }) + '$');
  routes.push({ regex, paramNames, handler });
}

export function notFound(handler) { notFoundHandler = handler; }

export function navigate(path) {
  if (location.hash.slice(1) === path) { render(); }
  else location.hash = path;
}

export function replace(path) {
  history.replaceState(null, '', '#' + path);
  render();
}

function currentPath() {
  const h = location.hash.slice(1);
  return h || '/';
}

async function render() {
  if (typeof currentCleanup === 'function') { try { currentCleanup(); } catch (e) { /* noop */ } }
  currentCleanup = null;
  closeSheet();
  const path = currentPath();
  for (const r of routes) {
    const m = path.match(r.regex);
    if (m) {
      const params = {};
      r.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
      const cleanup = await r.handler(params);
      if (typeof cleanup === 'function') currentCleanup = cleanup;
      window.scrollTo(0, 0);
      return;
    }
  }
  if (notFoundHandler) notFoundHandler();
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  render();
}

export function currentRoute() {
  return currentPath();
}
