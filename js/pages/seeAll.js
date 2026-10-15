import { icon } from '../icons.js';
import { setNavVisible, pageHeader, wirePageHeader, profileCard, wireProfileCards } from '../components.js';
import { MUSIC_HUB_PROFILES, TIKTOKER_PROFILES, BOOKING_PROFILES, sortSponsoredFirst, FOLLOWER_TIERS } from '../data.js';
import { esc, toast } from '../utils.js';
import { t, roleLabel } from '../i18n.js';
import { navigate } from '../router.js';
import { state, isFavorite, toggleFavorite, openChatWith, trackProfileView, canCallDirectly } from '../state.js';
import { openCall } from '../callSimulator.js';
import { openCheckout } from '../checkout.js';

export function renderSeeAllMusicHub(container, { cat }) {
  setNavVisible(true);
  const list = sortSponsoredFirst(MUSIC_HUB_PROFILES[cat] || []);
  container.innerHTML = `
    <div class="screen">
      ${pageHeader(roleLabel(cat))}
      <div class="grid-cards-2">
        ${list.map((p) => profileCard(p, cat)).join('')}
      </div>
    </div>
  `;
  wirePageHeader('/home');
  wireProfileCards(container.querySelector('.grid-cards-2'), cat, list);
}

export function renderSeeAllPromo(container, { tab }) {
  setNavVisible(true);
  const isTiktoker = tab === 'tiktoker';
  let priceMin = null;
  let priceMax = null;
  let tier = 'all';

  // No filters applied -> default order (sponsored first, then most
  // popular). Filters narrow the pool first, then keep that same order.
  function getList() {
    const base = isTiktoker ? TIKTOKER_PROFILES : BOOKING_PROFILES;
    let filtered = base;
    if (isTiktoker) {
      if (priceMin != null || priceMax != null) {
        filtered = filtered.filter((p) => (priceMin == null || p.price >= priceMin) && (priceMax == null || p.price <= priceMax));
      }
      if (tier !== 'all') {
        const tierDef = FOLLOWER_TIERS.find((tf) => tf.id === tier);
        filtered = filtered.filter((p) => tierDef.test(p.followersCount ?? 0));
      }
    }
    return sortSponsoredFirst(filtered);
  }

  function tierTabs() {
    return `
      <div class="chip-row" id="tier-tabs" style="padding:0 18px 12px;">
        ${FOLLOWER_TIERS.map((tf) => `<button class="chip ${tier === tf.id ? 'active' : ''}" data-tier="${tf.id}">${t(tf.label)}</button>`).join('')}
      </div>
    `;
  }

  function priceFilterBar() {
    return `
      <div class="date-range-box" id="price-filter-box" style="margin:4px 18px 12px;">
        <div class="date-range-field">
          <label>${t('price_filter_from')}</label>
          <input type="number" min="0" step="10" id="price-min" placeholder="0" value="${priceMin != null ? priceMin : ''}" />
        </div>
        <div class="date-range-divider">${icon('chevronRight', 16)}</div>
        <div class="date-range-field">
          <label>${t('price_filter_to')}</label>
          <input type="number" min="0" step="10" id="price-max" placeholder="∞" value="${priceMax != null ? priceMax : ''}" />
        </div>
      </div>
      <div class="container-pad" style="display:flex; gap:10px; margin-bottom:14px;">
        <button class="btn btn-primary btn-sm" id="price-apply" style="flex:1;">${t('price_filter_apply')}</button>
        ${(priceMin != null || priceMax != null) ? `<button class="btn btn-outline btn-sm" id="price-clear" style="flex:1;">${t('price_filter_clear')}</button>` : ''}
      </div>
    `;
  }

  function paint() {
    const list = getList();
    container.innerHTML = `
      <div class="screen">
        ${pageHeader(roleLabel(tab))}
        ${isTiktoker ? tierTabs() : ''}
        ${isTiktoker ? priceFilterBar() : ''}
        <div class="${isTiktoker ? 'grid-cards-2' : 'grid-cards-1'}">
          ${list.map(isTiktoker ? tiktokerCard : bookingCard).join('') || `<div class="empty-state"><div class="ic">${icon('search', 24)}</div><h3>${t('search_no_results_title')}</h3><p>${t('search_no_results_sub')}</p></div>`}
        </div>
      </div>
    `;
    wirePageHeader('/home');
    wire(list);

    if (isTiktoker) {
      container.querySelectorAll('#tier-tabs [data-tier]').forEach((btn) => btn.addEventListener('click', () => {
        tier = btn.dataset.tier;
        paint();
      }));
      const minInput = container.querySelector('#price-min');
      const maxInput = container.querySelector('#price-max');
      container.querySelector('#price-apply').addEventListener('click', () => {
        priceMin = minInput.value !== '' ? Number(minInput.value) : null;
        priceMax = maxInput.value !== '' ? Number(maxInput.value) : null;
        paint();
      });
      container.querySelector('#price-clear')?.addEventListener('click', () => {
        priceMin = null;
        priceMax = null;
        paint();
      });
    }
  }

  function tiktokerCard(p) {
    const fav = isFavorite('tiktoker', p.id);
    return `
    <div class="profile-card" style="width:100%;" data-id="${p.id}">
      <div class="photo-wrap">
        <img src="${p.photo}" alt="${esc(p.name)}" loading="lazy" />
        ${p.sponsored ? `<span class="sponsored-badge">${icon('sparkles', 10)} ${t('featured_badge')}</span>` : ''}
        <span class="price-badge">€${p.price}</span>
        <button class="fav-btn ${fav ? 'active' : ''}" data-fav="${p.id}" style="top:40px;">${icon('heart', 17)}</button>
        <span class="age-badge">${p.age}</span>
        ${p.clause48 ? `<span class="clause-badge">Clausola 48h</span>` : ''}
      </div>
      <div class="body">
        <div class="name">${esc(p.name)}</div>
        <div class="role">${esc(p.followers)} ${t('home_follower_suffix')}</div>
        <div class="rating">${icon('star', 13)} ${p.rating.toFixed(1)}</div>
        <div class="quick-actions">
          <button class="qa-btn video" data-qa="video" title="${esc(t('qa_video'))}">${icon('video', 15)}</button>
          <button class="qa-btn call" data-qa="call" title="${esc(t('qa_call'))}">${icon('phone', 15)}</button>
          <button class="qa-btn msg" data-qa="msg" title="${esc(t('qa_msg'))}">${icon('message', 15)}</button>
        </div>
        <button class="btn btn-primary btn-sm" data-pay="${p.id}" style="width:100%; margin-top:6px;">${t('pay_book_btn')}</button>
      </div>
    </div>`;
  }

  function bookingCard(p) {
    const fav = isFavorite('booking', p.id);
    return `
    <div class="booking-card" style="position:relative; width:100%;" data-id="${p.id}">
      ${p.sponsored ? `<span class="sponsored-badge" style="top:12px;left:12px;">${icon('sparkles', 10)} ${t('featured_badge')}</span>` : ''}
      <button class="fav-btn ${fav ? 'active' : ''}" data-fav="${p.id}" style="top:12px;right:12px;">${icon('heart', 17)}</button>
      <div class="top">
        <img src="${p.photo}" alt="${esc(p.name)}" />
        <div>
          <div class="name">${esc(p.name)}</div>
          <div class="region">${icon('mapPin', 12)} ${esc(p.region)}</div>
        </div>
      </div>
      <div class="venues"><b>${t('home_venues_label')}</b><br/>${p.venues.map(esc).join(' · ')}</div>
      <div class="quick-actions">
        <button class="qa-btn video" style="background:rgba(255,255,255,0.14);color:#fff;" data-qa="video" title="${esc(t('qa_video'))}">${icon('video', 15)}</button>
        <button class="qa-btn call" style="background:rgba(255,255,255,0.14);color:#fff;" data-qa="call" title="${esc(t('qa_call'))}">${icon('phone', 15)}</button>
        <button class="qa-btn msg" style="background:rgba(255,255,255,0.14);color:#fff;" data-qa="msg" title="${esc(t('qa_msg'))}">${icon('message', 15)}</button>
      </div>
    </div>`;
  }

  function wire(list) {
    const grid = container.querySelector('.grid-cards-2, .grid-cards-1');
    if (!grid) return;
    grid.querySelectorAll('[data-fav]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.fav;
        const item = list.find((i) => i.id === id);
        const cat = isTiktoker ? 'tiktoker' : 'booking';
        toggleFavorite(cat, id, item);
        btn.classList.toggle('active');
        toast(isFavorite(cat, id) ? t('common_added_fav') : t('common_removed_fav'));
      });
    });
    grid.querySelectorAll('[data-qa]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.qa;
        const card = btn.closest('[data-id]');
        const item = card ? list.find((i) => i.id === card.dataset.id) : null;
        if (!item) return;
        trackProfileView(item.id);
        const cat = isTiktoker ? 'tiktoker' : 'booking';
        if (action === 'msg') navigate('/chat/' + openChatWith(item, cat));
        else if (canCallDirectly(item, cat)) openCall(item, action === 'video');
        else { toast(t('call_locked_toast')); navigate('/chat/' + openChatWith(item, cat)); }
      });
    });
    grid.querySelectorAll('[data-pay]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = list.find((x) => x.id === btn.dataset.pay);
        if (!p) return;
        trackProfileView(p.id);
        openCheckout({ title: t('pay_book_btn'), amount: p.price, description: p.name, escrow: true, type: 'service', subjectId: p.id, onSuccess: () => {} });
      });
    });
    if (isTiktoker) {
      grid.querySelectorAll('.profile-card').forEach((card) => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => navigate(`/tiktoker/${card.dataset.id}`));
      });
    }
  }

  paint();
}
