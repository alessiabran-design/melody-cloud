import { icon } from '../icons.js';
import { t, roleLabel } from '../i18n.js';
import { navigate } from '../router.js';
import { setNavVisible, homeTopHeader, wireHomeTopHeader, profileCard, wireProfileCards, seeAllCard } from '../components.js';
import { MUSIC_HUB_PROFILES, TIKTOKER_PROFILES, BOOKING_PROFILES, simulateTikTokFollowers, sortSponsoredFirst } from '../data.js';
import { esc, toast } from '../utils.js';
import { state, isFavorite, toggleFavorite, openChatWith, trackProfileView } from '../state.js';
import { openCheckout } from '../checkout.js';
import { openCall } from '../callSimulator.js';

const HUB_CAT_IDS = ['artista', 'manager', 'beatmaker', 'coach', 'autore', 'cowriter'];
const CAP = 5;

export function renderHome(container) {
  setNavVisible(true);
  let hubCat = 'artista';
  let promoTab = 'tiktoker';

  function paint() {
    const hubList = sortSponsoredFirst(MUSIC_HUB_PROFILES[hubCat] || []);
    const hubShown = hubList.slice(0, CAP);

    const promoFull = promoTab === 'tiktoker' ? sortSponsoredFirst(TIKTOKER_PROFILES) : sortSponsoredFirst(BOOKING_PROFILES);
    const promoShown = promoFull.slice(0, CAP);

    container.innerHTML = `
      <div class="screen">
        ${homeTopHeader()}

        <div class="section">
          <div class="section-head">
            <div><h2>${t('music_hub')}</h2><div class="sub">${t('home_music_hub_sub')}</div></div>
          </div>
          <div class="chip-row">
            ${HUB_CAT_IDS.map((id) => `<button class="chip ${hubCat === id ? 'active' : ''}" data-hub="${id}">${esc(roleLabel(id))}</button>`).join('')}
          </div>
          <div class="h-scroll" id="hub-scroll">
            ${selfMusicHubCard(hubCat) + hubShown.map((p) => profileCard(p, hubCat)).join('') + (hubList.length > CAP ? seeAllCard() : '')}
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <div><h2>${t('promotion')}</h2><div class="sub">${t('home_promotion_sub')}</div></div>
          </div>
          <div class="chip-row">
            <button class="chip ${promoTab === 'tiktoker' ? 'active' : ''}" data-promo="tiktoker">${esc(roleLabel('tiktoker'))}</button>
            <button class="chip ${promoTab === 'booking' ? 'active' : ''}" data-promo="booking">${esc(roleLabel('booking'))}</button>
          </div>
          <div class="h-scroll" id="promo-scroll">
            ${promoTab === 'tiktoker' ? selfTiktokerCard() : selfBookingCard()}
            ${promoShown.map(promoTab === 'tiktoker' ? tiktokerCard : bookingCard).join('')}
            ${promoFull.length > CAP ? seeAllCard() : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-head">
            <div><h2>${t('writing_beats')}</h2><div class="sub">${t('home_writing_sub')}</div></div>
          </div>
          <div class="h-scroll">
            <div class="tool-card" data-tool="booknote">
              <div class="icon-wrap">${icon('bookmark', 22)}</div>
              <h3>${t('home_booknote_title')}</h3>
              <p>${t('home_booknote_desc')}</p>
            </div>
          </div>
        </div>
        <div style="height:8px"></div>
      </div>
    `;

    wireHomeTopHeader();
    container.querySelectorAll('[data-hub]').forEach((b) => b.addEventListener('click', () => { hubCat = b.dataset.hub; paint(); }));
    container.querySelectorAll('[data-promo]').forEach((b) => b.addEventListener('click', () => { promoTab = b.dataset.promo; paint(); }));
    container.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => navigate('/writing/' + b.dataset.tool)));
    wireProfileCards(container.querySelector('#hub-scroll'), hubCat, hubList);
    wirePromoCards(container.querySelector('#promo-scroll'), promoTab, promoTab === 'tiktoker' ? TIKTOKER_PROFILES : BOOKING_PROFILES);
    container.querySelectorAll('[data-self-edit]').forEach((b) => b.addEventListener('click', () => navigate('/profile/edit')));
    container.querySelector('#hub-scroll')?.querySelector('[data-see-all]')?.addEventListener('click', () => navigate(`/musichub/${hubCat}/all`));
    container.querySelector('#promo-scroll')?.querySelector('[data-see-all]')?.addEventListener('click', () => navigate(`/promotion/${promoTab}/all`));
    container.querySelectorAll('[data-pay]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = TIKTOKER_PROFILES.find((x) => x.id === btn.dataset.pay);
        if (!p) return;
        trackProfileView(p.id);
        openCheckout({
          title: t('pay_book_btn'),
          amount: p.price,
          description: p.name,
          escrow: true,
          type: 'service',
          subjectId: p.id,
          onSuccess: () => {},
        });
      });
    });
  }

  function selfMusicHubCard(cat) {
    const p = state.profile;
    if (p.role !== cat) return '';
    return `
    <div class="profile-card" data-self="1" style="border-color: var(--mc-400);">
      <div class="photo-wrap">
        <img src="${p.photo}" alt="${esc(p.firstName)}" loading="lazy" />
        ${p.boostedUntil && new Date(p.boostedUntil) > new Date() ? `<span class="sponsored-badge">${icon('sparkles', 10)} ${t('featured_badge')}</span>` : ''}
      </div>
      <div class="body">
        <div class="name">${esc(p.firstName)} ${esc(p.lastName)}</div>
        <div class="role">${t('home_self_tiktok_label')}</div>
        <div class="rating">${icon('star', 13)} ${p.reviews.avg.toFixed(1)} <span class="muted">(${p.reviews.count})</span></div>
        <button class="btn btn-secondary btn-sm" data-self-edit style="width:100%;">${icon('edit', 14)} ${t('common_edit')}</button>
      </div>
    </div>`;
  }

  function selfTiktokerCard() {
    const p = state.profile;
    if (p.role !== 'tiktoker') return '';
    const followers = simulateTikTokFollowers(p.tiktokUrl);
    return `
    <div class="profile-card" data-self="1" style="width:168px; border-color: var(--mc-400);">
      <div class="photo-wrap">
        <img src="${p.photo}" alt="${esc(p.firstName)}" loading="lazy" />
        ${p.tiktokPrice != null ? `<span class="price-badge">€${p.tiktokPrice}</span>` : ''}
        ${p.age ? `<span class="age-badge">${p.age}</span>` : ''}
      </div>
      <div class="body">
        <div class="name">${esc(p.firstName)} ${esc(p.lastName)}</div>
        <div class="role">${t('home_self_tiktok_label')}${followers ? ' · ' + followers + ' ' + t('home_follower_suffix') : ''}</div>
        <div class="rating">${icon('star', 13)} ${p.reviews.avg.toFixed(1)} <span class="muted">(${p.reviews.count})</span></div>
        <div class="quick-actions">
          <button class="btn btn-secondary btn-sm" data-self-edit style="width:100%;">${icon('edit', 14)} ${t('common_edit')}</button>
        </div>
        ${p.tiktokUrl ? `<a class="btn btn-secondary btn-sm" href="${esc(p.tiktokUrl)}" target="_blank" rel="noopener noreferrer" style="width:100%; margin-top:6px; text-decoration:none;" onclick="event.stopPropagation()">${icon('tiktok', 13)} ${t('card_tiktok_open')}</a>` : ''}
      </div>
    </div>`;
  }

  function selfBookingCard() {
    const p = state.profile;
    if (p.role !== 'booking') return '';
    const venues = (p.bookingVenues || '').split(',').map((v) => v.trim()).filter(Boolean);
    return `
    <div class="booking-card" data-self="1" style="position:relative;">
      <div class="top">
        <img src="${p.photo}" alt="${esc(p.firstName)}" />
        <div>
          <div class="name">${esc(p.firstName)} ${esc(p.lastName)}</div>
          <div class="region">${icon('mapPin', 12)} ${p.bookingRegion ? esc(p.bookingRegion) : t('profile_location_none')}</div>
        </div>
      </div>
      ${venues.length ? `<div class="venues"><b>${t('home_venues_label')}</b><br/>${venues.map(esc).join(' · ')}</div>` : ''}
      <button class="btn btn-secondary btn-sm" data-self-edit style="width:100%; margin-top:10px;">${icon('edit', 14)} ${t('common_edit')}</button>
    </div>`;
  }

  function tiktokerCard(p) {
    const fav = isFavorite('tiktoker', p.id);
    return `
    <div class="profile-card" style="width:168px;" data-id="${p.id}">
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
        ${p.tiktokUrl ? `<a class="btn btn-secondary btn-sm" href="${esc(p.tiktokUrl)}" target="_blank" rel="noopener noreferrer" style="width:100%; margin-top:6px; text-decoration:none;" onclick="event.stopPropagation()">${icon('tiktok', 13)} ${t('card_tiktok_open')}</a>` : ''}
        <button class="btn btn-primary btn-sm" data-pay="${p.id}" style="width:100%; margin-top:6px;">${t('pay_book_btn')}</button>
      </div>
    </div>`;
  }

  function bookingCard(p) {
    const fav = isFavorite('booking', p.id);
    return `
    <div class="booking-card" style="position:relative;" data-id="${p.id}">
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

  function wirePromoCards(root, category, items) {
    if (!root) return;
    root.querySelectorAll('[data-fav]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.fav;
        const item = items.find((i) => i.id === id);
        toggleFavorite(category, id, item);
        btn.classList.toggle('active');
        toast(isFavorite(category, id) ? t('common_added_fav') : t('common_removed_fav'));
      });
    });
    root.querySelectorAll('[data-qa]').forEach((btn) => {
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
    if (category === 'tiktoker') {
      root.querySelectorAll('.profile-card').forEach((card) => {
        if (card.dataset.self) return;
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => navigate(`/tiktoker/${card.dataset.id}`));
      });
    }
  }

  paint();
}
