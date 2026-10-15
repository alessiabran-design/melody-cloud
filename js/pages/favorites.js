import { icon } from '../icons.js';
import { setNavVisible, pageHeader, wirePageHeader } from '../components.js';
import { ROLES } from '../data.js';
import { state, favoriteCount, toggleFavorite } from '../state.js';
import { esc, toast } from '../utils.js';
import { navigate } from '../router.js';
import { t, roleLabel } from '../i18n.js';

export function renderFavorites(container) {
  setNavVisible(true);
  container.innerHTML = `
    <div class="screen">
      <div class="page-header" style="padding-bottom:6px;">
        <button class="back-btn" id="page-back-btn">${icon('chevronLeft', 20)}</button>
        <h1 style="flex:1;">${icon('heart', 20)} ${t('favorites')}</h1>
      </div>
      <div class="fav-grid">
        ${ROLES.map((r) => `
          <div class="fav-box" data-cat="${r.id}">
            <div class="ic">${icon(r.icon, 20)}</div>
            <div class="lbl">${esc(roleLabel(r.id))}</div>
            <div class="count">${t('fav_saved_count', { n: favoriteCount(r.id) })}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  wirePageHeader('/home');
  container.querySelectorAll('.fav-box').forEach((box) => {
    box.addEventListener('click', () => navigate('/favorites/' + box.dataset.cat));
  });
}

export function renderFavoritesCategory(container, { cat }) {
  setNavVisible(true);
  const title = roleLabel(cat) || t('favorites');

  function paint() {
    const bucket = state.favorites[cat] || {};
    const items = Object.values(bucket);
    container.innerHTML = `
      <div class="screen">
        ${pageHeader(title)}
        ${items.length ? items.map((p) => resultLikeRow(p)).join('') : `
          <div class="empty-state">
            <div class="ic">${icon('heart', 26)}</div>
            <h3>${t('fav_empty_title')}</h3>
            <p>${t('fav_empty_sub')}</p>
          </div>
        `}
      </div>
    `;
    wirePageHeader('/favorites');
    container.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(cat, btn.dataset.remove, null);
        toast(t('common_removed_fav'));
        paint();
      });
    });
  }

  function resultLikeRow(p) {
    const subtitle = p.role || p.region || (p.age ? `${p.age}` : '') || '';
    const priceTag = p.price ? `€${p.price}${p.followers ? '' : '/h'}` : '';
    return `
      <div class="result-row">
        <img src="${p.photo}" alt="${esc(p.name)}" />
        <div class="info">
          <div class="name">${esc(p.name)}</div>
          <div class="role">${esc(subtitle)}</div>
          ${p.city ? `<div class="loc">${icon('mapPin', 12)} ${esc(p.city)}</div>` : ''}
          ${p.rating ? `<div class="rating" style="margin-top:4px;">${icon('star', 12)} ${p.rating.toFixed ? p.rating.toFixed(1) : p.rating}</div>` : ''}
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
          <button class="btn-icon" data-remove="${p.id}" style="width:32px;height:32px; color:#ff5a8a;">${icon('heart', 16)}</button>
          ${priceTag ? `<div class="price">${priceTag}</div>` : ''}
        </div>
      </div>
    `;
  }

  paint();
}
