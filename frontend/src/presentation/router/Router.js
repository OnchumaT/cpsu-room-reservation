import { PAGE_TITLES } from '../../shared/constants.js';
import { IC } from '../../shared/icons.js';

/**
 * Router — owns which view renders into #content, and the page title.
 * Each registered view is `{ render, load? }`: `render()` is a
 * zero-argument function returning an HTML string (already bound to its
 * dependencies by the composition root); `load()`, if present, is an
 * async function that refreshes whatever data `render()` reads from a
 * repository's cache — awaited (with a loading placeholder shown) before
 * `render()` runs, so `render()` itself can stay synchronous.
 */
export class Router {
  constructor({ appState, views, onAfterRender }) {
    this.appState = appState;
    this.views = views;
    this.onAfterRender = onAfterRender;
  }

  async navigate(page) {
    this.appState.page = page;
    document.getElementById('tbTitle').textContent = PAGE_TITLES[page] || page;
    await this.renderPage();
    if (this.onAfterRender) this.onAfterRender(page);
  }

  async renderPage() {
    const el = document.getElementById('content');
    const view = this.views[this.appState.page];
    if (!view) { el.innerHTML = this._notFoundPlaceholder(); return; }

    if (view.load) {
      el.innerHTML = this._loadingPlaceholder();
      try {
        await view.load();
      } catch (err) {
        el.innerHTML = this._errorPlaceholder(err);
        return;
      }
    }
    el.innerHTML = view.render();
  }

  _loadingPlaceholder() {
    return `<div class="misc-pg"><div style="font-size:12px;color:#8890B5">กำลังโหลด...</div></div>`;
  }

  _errorPlaceholder(err) {
    return `<div class="misc-pg">${IC.gear}<div style="font-weight:500;color:#991b1b">โหลดข้อมูลไม่สำเร็จ</div><div>${err.message || err}</div></div>`;
  }

  _notFoundPlaceholder() {
    const title = document.getElementById('tbTitle').textContent;
    return `<div class="misc-pg">${IC.gear}<div style="font-weight:500;color:#4A4F7A">${title}</div><div>ไม่พบหน้านี้</div></div>`;
  }
}
