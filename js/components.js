import { icon } from './icons.js';
import { state, isFavorite, toggleFavorite, openChatWith, trackProfileView, isBlocked, blockContact, unblockContact, reportUser } from './state.js';
import { navigate } from './router.js';
import { t, LANGUAGES } from './i18n.js';
import { esc, openSheet, closeSheet, toast } from './utils.js';
import { update } from './state.js';
import { openCall } from './callSimulator.js';

const REPORT_REASONS = ['spam', 'scam', 'fake', 'behavior'];

// Shared Segnala/Blocca sheet used both from a profile's detail page and from
// a chat thread, so the protection flow is identical everywhere a user can
// encounter another person's identity (per the report/block spec).
export function openReportBlockSheet(target) {
  const blocked = isBlocked(target.id);
  const html = `
    <div class="sheet-handle"></div>
    <div class="sheet-head"><h2>${esc(target.name)}</h2><button class="btn-icon" id="sheet-close">${icon('x', 16)}</button></div>
    <div class="where-list">
      <div class="where-item" id="report-opt"><div class="ic">${icon('alertCircle', 17)}</div><span>${t('report_user_btn')}</span></div>
      <div class="where-item" id="block-opt"><div class="ic" style="background:#fde3e6; color:#d92d4a;">${icon('shield', 17)}</div><span style="color:#d92d4a;">${blocked ? t('unblock_user_btn') : t('block_user_btn')}</span></div>
    </div>
  `;
  const overlay = openSheet(html);
  overlay.querySelector('#sheet-close').addEventListener('click', closeSheet);
  overlay.querySelector('#report-opt').addEventListener('click', () => {
    closeSheet();
    openReportReasonSheet(target);
  });
  overlay.querySelector('#block-opt').addEventListener('click', () => {
    if (blocked) { unblockContact(target.id); toast(t('unblock_confirm_toast')); }
    else { blockContact(target.id); toast(t('block_confirm_toast')); }
    closeSheet();
  });
}

function openReportReasonSheet(target) {
  const html = `
    <div class="sheet-handle"></div>
    <div class="sheet-head"><h2>${t('report_reason_title')}</h2><button class="btn-icon" id="sheet-close">${icon('x', 16)}</button></div>
    <div class="where-list">
      ${REPORT_REASONS.map((r) => `<div class="where-item" data-reason="${r}"><div class="ic">${icon('alertCircle', 17)}</div><span>${t('report_reason_' + r)}</span></div>`).join('')}
    </div>
  `;
  const overlay = openSheet(html);
  overlay.querySelector('#sheet-close').addEventListener('click', closeSheet);
  overlay.querySelectorAll('[data-reason]').forEach((el) => el.addEventListener('click', () => {
    reportUser(target.id, target.name, el.dataset.reason);
    closeSheet();
    toast(t('report_submitted_toast'));
  }));
}

const NAV_ITEMS = [
  { route: '/home', label: 'nav_home', icon: 'home' },
  { route: '/search', label: 'nav_search', icon: 'search' },
  { route: '/favorites', label: 'nav_fav', icon: 'heart' },
  { route: '/chat', label: 'nav_chat', icon: 'chat' },
  { route: '/profile', label: 'nav_profile', icon: 'user' },
];

export function mountBottomNav(root) {
  const el = document.createElement('nav');
  el.className = 'bottom-nav';
  el.id = 'bottom-nav';
  root.appendChild(el);
  updateBottomNav();
  el.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item');
    if (btn) navigate(btn.dataset.route);
  });
  return el;
}

export function updateBottomNav() {
  const el = document.getElementById('bottom-nav');
  if (!el) return;
  const active = '/' + (location.hash.slice(1).split('/')[1] || 'home');
  el.innerHTML = NAV_ITEMS.map((item) => `
    <button class="nav-item ${active === item.route ? 'active' : ''}" data-route="${item.route}">
      ${icon(item.icon, 22)}
      <span>${t(item.label)}</span>
    </button>
  `).join('');
}

export function setNavVisible(visible) {
  const el = document.getElementById('bottom-nav');
  if (el) el.style.display = visible ? 'flex' : 'none';
}

export function homeTopHeader() {
  return `
  <div class="top-header">
    <div class="brand">
      <img class="brand-logo-header" src="icons/logo.png" alt="Melody Cloud" />
    </div>
    <div class="actions">
      <button class="icon-btn" id="lang-btn" aria-label="${esc(t('common_language'))}">${icon('globe', 20)}</button>
    </div>
  </div>`;
}

export function wireHomeTopHeader() {
  document.getElementById('lang-btn')?.addEventListener('click', openLanguageSheet);
}

export function pageHeader(title, { onBack } = {}) {
  return `
  <div class="page-header">
    <button class="back-btn" id="page-back-btn">${icon('chevronLeft', 20)}</button>
    <h1>${esc(title)}</h1>
  </div>`;
}

export function wirePageHeader(fallback = '/home') {
  document.getElementById('page-back-btn')?.addEventListener('click', () => {
    if (window.history.length > 1) window.history.back();
    else navigate(fallback);
  });
}

export function openLanguageSheet() {
  const html = `
    <div class="sheet-handle"></div>
    <div class="sheet-head"><h2>${icon('globe', 18)} ${t('common_language')}</h2><button class="btn-icon" id="sheet-close">${icon('x', 16)}</button></div>
    <div class="lang-list">
      ${LANGUAGES.map((l) => `
        <div class="lang-item" data-lang="${l.code}">
          <span class="l-name"><span class="flag">${l.flag}</span>${l.name}</span>
          ${state.lang === l.code ? `<span class="check">${icon('check', 18)}</span>` : ''}
        </div>`).join('')}
    </div>
  `;
  const overlay = openSheet(html);
  overlay.querySelector('#sheet-close').addEventListener('click', closeSheet);
  overlay.querySelectorAll('.lang-item').forEach((elm) => {
    elm.addEventListener('click', () => {
      update((s) => { s.lang = elm.dataset.lang; });
      closeSheet();
      window.dispatchEvent(new Event('hashchange'));
    });
  });
}

export function profileCard(p, category) {
  const fav = isFavorite(category, p.id);
  return `
  <div class="profile-card" data-id="${p.id}">
    <div class="photo-wrap">
      <img src="${p.photo}" alt="${esc(p.name)}" loading="lazy" />
      ${p.sponsored ? `<span class="sponsored-badge">${icon('sparkles', 10)} ${t('featured_badge')}</span>` : ''}
      <button class="fav-btn ${fav ? 'active' : ''}" data-fav="${p.id}">${icon('heart', 17)}</button>
    </div>
    <div class="body">
      <div class="name">${esc(p.name)}</div>
      <div class="role">${esc(p.role)}</div>
      <div class="rating">${icon('star', 13)} ${p.rating.toFixed(1)} <span class="muted">(${p.reviews})</span></div>
      <div class="quick-actions">
        <button class="qa-btn video" data-qa="video" title="${esc(t('qa_video'))}">${icon('video', 15)}</button>
        <button class="qa-btn call" data-qa="call" title="${esc(t('qa_call'))}">${icon('phone', 15)}</button>
        <button class="qa-btn msg" data-qa="msg" title="${esc(t('qa_msg'))}">${icon('message', 15)}</button>
      </div>
    </div>
  </div>`;
}

export function seeAllCard() {
  return `<div class="see-all-card" data-see-all="1">
    <div class="ic">${icon('chevronRight', 16)}</div>
    ${esc(t('see_all'))}
  </div>`;
}

export function wireProfileCards(container, category, items) {
  if (!container) return;
  container.querySelectorAll('[data-fav]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.fav;
      const item = items.find((i) => i.id === id);
      toggleFavorite(category, id, item);
      btn.classList.toggle('active');
      toast(isFavorite(category, id) ? t('common_added_fav') : t('common_removed_fav'));
    });
  });
  container.querySelectorAll('[data-qa]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.qa;
      const card = btn.closest('[data-id]');
      const item = card ? items.find((i) => i.id === card.dataset.id) : null;
      if (!item) return;
      trackProfileView(item.id);
      if (action === 'msg') navigate('/chat/' + openChatWith(item, category));
      else openCall(item, action === 'video');
    });
  });
  container.querySelectorAll('.profile-card').forEach((card) => {
    if (card.dataset.self) return;
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => navigate(`/musichub/${category}/${card.dataset.id}`));
  });
}
