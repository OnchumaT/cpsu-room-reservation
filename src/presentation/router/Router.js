import { PAGE_TITLES } from '../../shared/constants.js';
import { IC } from '../../shared/icons.js';

/**
 * Router — owns which view renders into #content, and the page title.
 * Replaces the old global navigate()/renderPage() pair. Each registered
 * view is a zero-argument render function (already bound to its
 * dependencies by the composition root) that returns an HTML string; a
 * view is free to render its own "no access" message when the current
 * role can't use that page (kept as the view's own concern, not the
 * Router's — Single Responsibility).
 */
export class Router {
  constructor({ appState, views, onAfterRender }) {
    this.appState = appState;
    this.views = views;
    this.onAfterRender = onAfterRender;
  }

  navigate(page) {
    this.appState.page = page;
    document.getElementById('tbTitle').textContent = PAGE_TITLES[page] || page;
    this.renderPage();
    if (this.onAfterRender) this.onAfterRender(page);
  }

  renderPage() {
    const el = document.getElementById('content');
    const view = this.views[this.appState.page];
    el.innerHTML = view ? view() : this._pendingMigrationPlaceholder();
  }

  _pendingMigrationPlaceholder() {
    const title = document.getElementById('tbTitle').textContent;
    return `<div class="misc-pg">${IC.gear}<div style="font-weight:500;color:#4A4F7A">${title}</div><div>หน้านี้อยู่ระหว่างการย้ายไปใช้สถาปัตยกรรมใหม่ — เร็วๆ นี้</div></div>`;
  }
}
