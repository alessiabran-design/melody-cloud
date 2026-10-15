import { icon } from '../icons.js';
import { setNavVisible, openReportBlockSheet } from '../components.js';
import { MUSIC_HUB_PROFILES, TIKTOKER_PROFILES, SERVICE_PROFILES, ROLES, followerTierOf } from '../data.js';
import { isFavorite, toggleFavorite, openChatWith, trackProfileView, isBlocked, getDisplayRating, getReviews, canCallDirectly } from '../state.js';
import { esc, toast } from '../utils.js';
import { navigate } from '../router.js';
import { t, roleLabel } from '../i18n.js';
import { openCall } from '../callSimulator.js';
import { openCheckout } from '../checkout.js';

function notFoundScreen(container) {
  container.innerHTML = `<div class="screen"><div class="empty-state"><h3>${t('pd_not_found')}</h3></div></div>`;
}

function availabilityBadge(p) {
  const status = p.availability || 'online';
  const dotColor = status === 'online' ? '#2ecc71' : status === 'busy' ? '#f5a623' : '#ff5a8a';
  return `<span class="clause-badge" style="position:static; display:inline-flex; align-items:center; gap:5px;"><span style="width:7px; height:7px; border-radius:50%; background:${dotColor}; display:inline-block; flex-shrink:0;"></span>${t('status_' + status)}</span>`;
}

function moreMenuButtonHtml() {
  return `<button class="pd-action-btn" id="pd-more-btn" title="${esc(t('more_options'))}">${icon('info', 20)}</button>`;
}

function wireMoreMenu(container, p) {
  container.querySelector('#pd-more-btn').addEventListener('click', () => openReportBlockSheet({ id: p.id, name: p.name }));
}

function reviewsBlock(p) {
  const extra = getReviews(p.id);
  if (!extra.length) return '';
  return `
    <div class="card-block">
      <div class="g-title" style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px;">${t('pd_reviews_title')}</div>
      ${extra.slice(-5).reverse().map((r) => `
        <div style="padding:8px 0; border-bottom:1px solid var(--border);">
          <div style="color:#f5a623; font-size:13px; letter-spacing:1px;">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
          ${r.comment ? `<p style="font-size:13px; color:var(--text-2); margin-top:4px; line-height:1.5;">${esc(r.comment)}</p>` : ''}
        </div>`).join('')}
    </div>`;
}

function backButtonHtml() {
  return `
    <div class="page-header" style="position:absolute; z-index:2; padding-top:calc(var(--safe-t) + 14px);">
      <button class="back-btn" id="page-back-btn" style="background:rgba(255,255,255,0.22); color:#fff;">${icon('chevronLeft', 20)}</button>
    </div>`;
}

function wireBackButton(container) {
  container.querySelector('#page-back-btn').addEventListener('click', () => {
    if (window.history.length > 1) window.history.back();
    else navigate('/home');
  });
}

function galleryBlock(title, photos) {
  if (!photos || !photos.length) return '';
  return `
    <div class="card-block">
      <div class="g-title" style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.04em; margin-bottom:10px;">${icon('image', 13)} ${esc(title)}</div>
      <div class="gallery-grid">
        ${photos.map((src) => `<div class="gallery-item"><img src="${src}" alt="" loading="lazy" /></div>`).join('')}
      </div>
    </div>`;
}

export function renderMusicHubProfile(container, { cat, id }) {
  setNavVisible(true);
  const list = MUSIC_HUB_PROFILES[cat] || [];
  const p = list.find((i) => i.id === id);

  if (!p) { notFoundScreen(container); return; }
  trackProfileView(p.id);

  function paint() {
    const fav = isFavorite(cat, p.id);
    const { avg, count } = getDisplayRating(p);
    const blocked = isBlocked(p.id);
    container.innerHTML = `
      <div class="screen">
        ${backButtonHtml()}
        <div class="pd-hero">
          <img class="avatar" src="${p.photo}" alt="${esc(p.name)}" />
          <h2>${esc(p.name)} ${p.verified ? `<span title="${esc(t('verify_verified_badge'))}" style="vertical-align:middle;">${icon('checkCircle', 17)}</span>` : ''}</h2>
          <div class="role-tag">${esc(p.role)}${p.city ? ' · ' + esc(p.city) : ''}</div>
          <div class="rating-line">${icon('star', 15)} ${avg.toFixed(1)} <span style="opacity:.8;">(${count} ${t('pd_reviews_suffix')})</span></div>
          <div style="margin-top:8px;">${availabilityBadge(p)}</div>
          <div class="pd-actions">
            <button class="pd-action-btn" data-qa="call" title="${esc(t('qa_call'))}">${icon('phone', 20)}</button>
            <button class="pd-action-btn" data-qa="video" title="${esc(t('qa_video'))}">${icon('video', 20)}</button>
            <button class="pd-action-btn" data-qa="msg" title="${esc(t('qa_msg'))}">${icon('message', 20)}</button>
            <button class="pd-action-btn fav ${fav ? 'active' : ''}" id="pd-fav-btn" title="${esc(t('favorites'))}">${icon('heart', 20)}</button>
            ${moreMenuButtonHtml()}
          </div>
        </div>

        ${blocked ? `<div class="card-block" style="margin-top:18px; background:#fde3e6; border-color:#f5b8c4;"><p style="font-size:13px; color:#d92d4a; margin:0;">${t('blocked_banner_text')}</p></div>` : ''}

        ${p.genres && p.genres.length ? `
        <div class="card-block" style="margin-top:18px;">
          <div class="g-title" style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px;">${t('pd_genres_title')}</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${p.genres.map((g) => `<span class="clause-badge" style="position:static;">${esc(g)}</span>`).join('')}
          </div>
        </div>` : ''}

        <div class="card-block" ${p.genres && p.genres.length ? '' : 'style="margin-top:18px;"'}>
          <div class="g-title" style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px;">${t('profile_presentation')}</div>
          <p style="font-size:13.5px; color:var(--text-2); line-height:1.6;">${p.bio ? esc(p.bio) : t('pd_no_bio')}</p>
        </div>

        ${reviewsBlock(p)}
      </div>
    `;
    wireBackButton(container);
    wireMoreMenu(container, p);
    container.querySelector('#pd-fav-btn').addEventListener('click', () => {
      toggleFavorite(cat, p.id, p);
      toast(isFavorite(cat, p.id) ? t('common_added_fav') : t('common_removed_fav'));
      paint();
    });
    container.querySelectorAll('[data-qa]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.qa;
        if (blocked) { toast(t('blocked_banner_text')); return; }
        if (action === 'msg') navigate('/chat/' + openChatWith(p, cat));
        else if (canCallDirectly(p, cat)) openCall(p, action === 'video');
        else { toast(t('call_locked_toast')); navigate('/chat/' + openChatWith(p, cat)); }
      });
    });
  }

  paint();
}

export function renderTiktokerProfile(container, { id }) {
  setNavVisible(true);
  const p = TIKTOKER_PROFILES.find((x) => x.id === id);
  if (!p) { notFoundScreen(container); return; }
  trackProfileView(p.id);

  function paint() {
    const fav = isFavorite('tiktoker', p.id);
    const tier = followerTierOf(p.followersCount);
    const { avg, count } = getDisplayRating(p);
    const blocked = isBlocked(p.id);
    container.innerHTML = `
      <div class="screen">
        ${backButtonHtml()}
        <div class="pd-hero">
          <img class="avatar" src="${p.photo}" alt="${esc(p.name)}" />
          <h2>${esc(p.name)}</h2>
          <div class="role-tag">${esc(roleLabel('tiktoker'))}${p.age ? ' · ' + p.age : ''}</div>
          <div class="rating-line">${icon('star', 15)} ${avg.toFixed(1)}${count ? ` <span style="opacity:.8;">(${count} ${t('pd_reviews_suffix')})</span>` : ''}</div>
          <div style="margin-top:6px;">${availabilityBadge(p)}</div>
          <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap; margin-top:10px;">
            ${p.sponsored ? `<span class="clause-badge" style="position:static;">${icon('sparkles', 11)} ${t('featured_badge')}</span>` : ''}
            <span class="clause-badge" style="position:static;">${esc(p.followers)} ${t('home_follower_suffix')}</span>
            ${tier ? `<span class="clause-badge" style="position:static;">${t(tier.label)}</span>` : ''}
            ${p.clause48 ? `<span class="clause-badge" style="position:static;">Clausola 48h</span>` : ''}
          </div>
          <div class="pd-actions">
            <button class="pd-action-btn" data-qa="call" title="${esc(t('qa_call'))}">${icon('phone', 20)}</button>
            <button class="pd-action-btn" data-qa="video" title="${esc(t('qa_video'))}">${icon('video', 20)}</button>
            <button class="pd-action-btn" data-qa="msg" title="${esc(t('qa_msg'))}">${icon('message', 20)}</button>
            <button class="pd-action-btn fav ${fav ? 'active' : ''}" id="pd-fav-btn" title="${esc(t('favorites'))}">${icon('heart', 20)}</button>
            ${moreMenuButtonHtml()}
          </div>
        </div>

        ${blocked ? `<div class="card-block" style="margin-top:18px; background:#fde3e6; border-color:#f5b8c4;"><p style="font-size:13px; color:#d92d4a; margin:0;">${t('blocked_banner_text')}</p></div>` : ''}

        <div class="card-block" style="margin-top:18px;">
          <div class="g-title" style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.04em; margin-bottom:10px;">${t('pd_followers_label')}</div>
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span style="font-size:14px; font-weight:700; color:var(--text-1);">€${p.price}</span>
            ${p.tiktokUrl ? `<a href="${esc(p.tiktokUrl)}" target="_blank" rel="noopener noreferrer" style="display:flex; align-items:center; gap:6px; color:var(--mc-600); font-size:13px; font-weight:600; text-decoration:none;">${icon('tiktok', 14)} ${t('card_tiktok_open')}</a>` : ''}
          </div>
        </div>

        ${reviewsBlock(p)}

        <div class="container-pad" style="margin-top:4px;">
          <button class="btn btn-primary" id="pd-pay-btn">${t('pay_book_btn')}</button>
        </div>
      </div>
    `;
    wireBackButton(container);
    wireMoreMenu(container, p);
    container.querySelector('#pd-fav-btn').addEventListener('click', () => {
      toggleFavorite('tiktoker', p.id, p);
      toast(isFavorite('tiktoker', p.id) ? t('common_added_fav') : t('common_removed_fav'));
      paint();
    });
    container.querySelectorAll('[data-qa]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.qa;
        if (blocked) { toast(t('blocked_banner_text')); return; }
        trackProfileView(p.id);
        if (action === 'msg') navigate('/chat/' + openChatWith(p, 'tiktoker'));
        else if (canCallDirectly(p, 'tiktoker')) openCall(p, action === 'video');
        else { toast(t('call_locked_toast')); navigate('/chat/' + openChatWith(p, 'tiktoker')); }
      });
    });
    container.querySelector('#pd-pay-btn').addEventListener('click', () => {
      if (blocked) { toast(t('blocked_banner_text')); return; }
      trackProfileView(p.id);
      openCheckout({ title: t('pay_book_btn'), amount: p.price, description: p.name, escrow: true, type: 'service', subjectId: p.id, onSuccess: () => {} });
    });
  }

  paint();
}

export function renderServiceProfile(container, { id }) {
  setNavVisible(true);
  const p = SERVICE_PROFILES.find((x) => x.id === id);
  if (!p) { notFoundScreen(container); return; }
  trackProfileView(p.id);

  const cat = ROLES.find((r) => r.label === p.role)?.id || 'servizi';
  const isStudio = p.role === 'Studio di Registrazione';

  function paint() {
    const fav = isFavorite(cat, p.id);
    const { avg, count } = getDisplayRating(p);
    const blocked = isBlocked(p.id);
    container.innerHTML = `
      <div class="screen">
        ${backButtonHtml()}
        <div class="pd-hero">
          <img class="avatar" src="${p.photo}" alt="${esc(p.name)}" />
          <h2>${esc(p.name)}</h2>
          <div class="role-tag">${esc(p.role)}${p.city ? ' · ' + esc(p.city) : ''}</div>
          <div class="rating-line">${icon('star', 15)} ${avg.toFixed(1)}${count ? ` <span style="opacity:.8;">(${count} ${t('pd_reviews_suffix')})</span>` : ''}</div>
          <div style="margin-top:8px;">${availabilityBadge(p)}</div>
          <div class="pd-actions">
            <button class="pd-action-btn" data-qa="call" title="${esc(t('qa_call'))}">${icon('phone', 20)}</button>
            <button class="pd-action-btn" data-qa="video" title="${esc(t('qa_video'))}">${icon('video', 20)}</button>
            <button class="pd-action-btn" data-qa="msg" title="${esc(t('qa_msg'))}">${icon('message', 20)}</button>
            <button class="pd-action-btn fav ${fav ? 'active' : ''}" id="pd-fav-btn" title="${esc(t('favorites'))}">${icon('heart', 20)}</button>
            ${moreMenuButtonHtml()}
          </div>
        </div>

        ${blocked ? `<div class="card-block" style="margin-top:18px; background:#fde3e6; border-color:#f5b8c4;"><p style="font-size:13px; color:#d92d4a; margin:0;">${t('blocked_banner_text')}</p></div>` : ''}

        <div style="margin-top:18px;">${galleryBlock(t('pd_gallery_title'), p.gallery)}</div>

        <div class="card-block" ${p.gallery && p.gallery.length ? '' : 'style="margin-top:18px;"'}>
          <div class="g-title" style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px;">${t('profile_presentation')}</div>
          <p style="font-size:13.5px; color:var(--text-2); line-height:1.6;">${p.description ? esc(p.description) : t('pd_no_bio')}</p>
        </div>

        ${p.equipment && p.equipment.length ? `
        <div class="card-block">
          <div class="g-title" style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px;">${icon('sliders', 13)} ${t('pd_equipment_title')}</div>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${p.equipment.map((eq) => `<span class="clause-badge" style="position:static;">${esc(eq)}</span>`).join('')}
          </div>
        </div>` : ''}

        ${p.rules && p.rules.length ? `
        <div class="card-block">
          <div class="g-title" style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px;">${icon('shield', 13)} ${t('pd_rules_title')}</div>
          <ul style="margin:0; padding-left:18px; font-size:13px; color:var(--text-2); line-height:1.8;">
            ${p.rules.map((r) => `<li>${esc(r)}</li>`).join('')}
          </ul>
        </div>` : ''}

        ${galleryBlock(t('pd_portfolio_title'), p.portfolio)}

        <div class="card-block">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span style="font-size:14px; font-weight:700; color:var(--text-1);">€${p.price}/h</span>
            <span class="muted small">${p.distanceKm} km</span>
          </div>
        </div>

        ${reviewsBlock(p)}

        <div class="container-pad" style="margin-top:4px;">
          <button class="btn btn-primary" id="pd-pay-btn">${isStudio ? t('pd_quote_btn') : t('pay_book_btn')}</button>
        </div>
      </div>
    `;
    wireBackButton(container);
    wireMoreMenu(container, p);
    container.querySelector('#pd-fav-btn').addEventListener('click', () => {
      toggleFavorite(cat, p.id, p);
      toast(isFavorite(cat, p.id) ? t('common_added_fav') : t('common_removed_fav'));
      paint();
    });
    container.querySelectorAll('[data-qa]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.qa;
        if (blocked) { toast(t('blocked_banner_text')); return; }
        trackProfileView(p.id);
        if (action === 'msg') navigate('/chat/' + openChatWith(p, cat));
        else if (canCallDirectly(p, cat)) openCall(p, action === 'video');
        else { toast(t('call_locked_toast')); navigate('/chat/' + openChatWith(p, cat)); }
      });
    });
    container.querySelector('#pd-pay-btn').addEventListener('click', () => {
      if (blocked) { toast(t('blocked_banner_text')); return; }
      trackProfileView(p.id);
      openCheckout({
        title: isStudio ? t('pd_quote_btn') : t('pay_book_btn'),
        amount: p.price,
        description: p.name,
        escrow: true,
        type: 'service',
        subjectId: p.id,
        onSuccess: () => {},
      });
    });
  }

  paint();
}
