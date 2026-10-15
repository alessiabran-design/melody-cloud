import { icon } from '../icons.js';
import { setNavVisible, pageHeader, wirePageHeader } from '../components.js';
import { ROLES, simulateTikTokFollowers } from '../data.js';
import { state, update } from '../state.js';
import { esc, toast, openSheet, closeSheet } from '../utils.js';
import { navigate } from '../router.js';
import { t, roleLabel, LOCALES } from '../i18n.js';
import { openCheckout } from '../checkout.js';

const LOCATION_ROLES = ['studio', 'fotografo', 'fonico', 'videomaker'];
const GALLERY_ROLES = ['fotografo', 'videomaker'];

// People commonly type/paste "tiktok.com/@nome" or just "@nome" — fine for a
// human, but an <input type="url"> rejects it without a protocol. Add one
// instead of forcing the user to know/retype the exact syntax.
function normalizeTiktokUrl(raw) {
  const v = raw.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return 'https://' + v.replace(/^\/+/, '');
}

function verificationBadgeHtml(p) {
  if (p.role !== 'artista') return '';
  if (p.verificationStatus === 'verified') return `<span class="clause-badge" style="position:static; background:var(--mc-600); color:#fff;">${icon('checkCircle', 12)} ${t('verify_verified_badge')}</span>`;
  if (p.verificationStatus === 'pending') return `<span class="clause-badge" style="position:static;">${icon('clock', 12)} ${t('verify_pending_badge')}</span>`;
  return '';
}

function trialInfo() {
  const sub = state.subscription || { trialStartedAt: new Date().toISOString(), trialDays: 90, priceLabel: '10,99 €/anno' };
  const startedAt = new Date(sub.trialStartedAt);
  const daysElapsed = Math.floor((Date.now() - startedAt.getTime()) / 86400000);
  const daysLeft = Math.max(0, sub.trialDays - daysElapsed);
  const pct = Math.min(100, Math.round((daysElapsed / sub.trialDays) * 100));
  return { daysLeft, pct, priceLabel: sub.priceLabel, expired: daysLeft <= 0, active: sub.status === 'active' };
}

function isBoostActive(p) {
  return !!(p.boostedUntil && new Date(p.boostedUntil).getTime() > Date.now());
}

export function renderProfile(container) {
  setNavVisible(true);

  function paint() {
    const p = state.profile;
    const trial = trialInfo();
    const boosted = isBoostActive(p);
    const locale = LOCALES[state.lang] || 'it-IT';

    container.innerHTML = `
    <div class="screen">
      <div class="profile-hero">
        <button class="btn-icon settings-icon-btn" id="go-settings" style="background:rgba(255,255,255,0.15); color:#fff;">${icon('settings', 19)}</button>
        <img class="avatar" src="${p.photo}" alt="" />
        <h2>${esc(p.firstName)} ${esc(p.lastName)}</h2>
        <div class="role-tag">${p.role ? esc(roleLabel(p.role)) : ''}${p.age ? ' · ' + p.age : ''}</div>
        ${verificationBadgeHtml(p) ? `<div style="margin-top:6px;">${verificationBadgeHtml(p)}</div>` : ''}
        <div class="rating-line">${icon('star', 15)} ${p.reviews.avg.toFixed(1)} <span style="opacity:.8;">(${p.reviews.count} ${t('pd_reviews_suffix')})</span></div>
        <div class="rating-line" style="margin-top:6px;">
          <span class="status-dot ${p.availabilityStatus === 'online' ? 'online' : 'offline'}"></span>
          ${state.settings.showOnlineStatus ? t('status_' + (p.availabilityStatus || 'online')) : t('profile_status_hidden')}
        </div>
      </div>

      <div class="card-block" style="margin-top:18px;">
        <div class="g-title" style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px;">${t('profile_presentation')}</div>
        <p style="font-size:13.5px; color:var(--text-2); line-height:1.5;">${p.bio ? esc(p.bio) : t('profile_no_bio')}</p>
      </div>

      ${GALLERY_ROLES.includes(p.role) ? `
      <div class="card-block">
        <div class="g-title" style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px;">${t('profile_gallery_title')}</div>
        ${p.gallery && p.gallery.length ? `
        <div class="gallery-grid">
          ${p.gallery.map((src) => `<img src="${src}" alt="" loading="lazy" />`).join('')}
        </div>` : `<p class="muted small">${t('profile_gallery_empty')}</p>`}
      </div>` : ''}

      ${LOCATION_ROLES.includes(p.role) ? `
      <div class="card-block">
        <div class="g-title" style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px;">${t('profile_location_title')}</div>
        <div class="settings-row" style="border:none; padding:0;">
          <div class="ic">${icon('mapPin', 17)}</div>
          <div class="txt"><div class="t">${p.location ? esc(p.location) : t('profile_location_none')}</div><div class="d">${t('profile_location_visible')}</div></div>
        </div>
      </div>` : ''}

      <div class="sub-card">
        <div class="top-row">
          <div>
            <div class="plan-name">${icon('sparkles', 15)} ${t('sub_status_title')}</div>
            <div class="price">${t('sub_plan_annual')} · ${esc(trial.priceLabel)}</div>
          </div>
          ${trial.active
            ? `<span class="clause-badge" style="position:static;">${t('subscription_active_label')}</span>`
            : trial.expired
              ? `<span class="clause-badge" style="position:static;">${t('sub_expired_badge')}</span>`
              : `<span class="clause-badge" style="position:static;">${t('sub_days_left', { n: trial.daysLeft })}</span>`}
        </div>
        ${trial.active ? `
          <div class="days-label">${t('subscription_renews_on', { date: state.subscription.renewsAt ? new Date(state.subscription.renewsAt).toLocaleDateString(locale) : '—' })}</div>
        ` : `
          <div class="bar-track"><div class="bar-fill" style="width:${trial.pct}%;"></div></div>
          <div class="days-label">${trial.expired ? t('sub_expired_desc') : t('sub_days_left_desc', { n: trial.daysLeft, price: esc(trial.priceLabel) })}</div>
          <button class="btn btn-secondary btn-sm" id="subscribe-btn" style="width:100%; margin-top:12px;">${t('subscribe_now_btn')}</button>
        `}
      </div>

      <div class="card-block">
        <div class="g-title" style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.04em; margin-bottom:8px;">${icon('sparkles', 13)} ${t('boost_card_title')}</div>
        ${boosted ? `
          <p style="font-size:13.5px; color:var(--mc-600); font-weight:700; margin-bottom:4px;">${icon('crown', 14)} ${t('boost_active_until', { date: new Date(p.boostedUntil).toLocaleDateString(locale) })}</p>
        ` : `
          <p style="font-size:13px; color:var(--text-2); margin-bottom:12px;">${t('boost_card_desc')}</p>
          <button class="btn btn-primary btn-sm" id="boost-btn" style="width:100%;">${t('boost_cta')}</button>
        `}
      </div>

      <div class="settings-list">
        <div class="settings-group">
          <div class="g-title">${t('profile_group_account')}</div>
          <div class="settings-row" id="row-edit">
            <div class="ic">${icon('edit', 17)}</div>
            <div class="txt"><div class="t">${t('profile_row_edit_t')}</div><div class="d">${t('profile_row_edit_d')}</div></div>
            ${icon('chevronRight', 16)}
          </div>
          <div class="settings-row" id="row-wallet">
            <div class="ic">${icon('wallet', 17)}</div>
            <div class="txt"><div class="t">${t('wallet_row_title')}</div><div class="d">${t('wallet_row_desc')}</div></div>
            ${icon('chevronRight', 16)}
          </div>
          <div class="settings-row" id="row-settings">
            <div class="ic">${icon('shield', 17)}</div>
            <div class="txt"><div class="t">${t('profile_row_settings_t')}</div><div class="d">${t('profile_row_settings_d')}</div></div>
            ${icon('chevronRight', 16)}
          </div>
        </div>
        <div class="settings-group">
          <div class="g-title">${t('profile_group_other')}</div>
          <div class="settings-row danger" id="row-logout">
            <div class="ic">${icon('logout', 17)}</div>
            <div class="txt"><div class="t">${t('profile_logout')}</div></div>
          </div>
        </div>
      </div>
    </div>
  `;
    container.querySelector('#go-settings').addEventListener('click', () => navigate('/profile/settings'));
    container.querySelector('#row-edit').addEventListener('click', () => navigate('/profile/edit'));
    container.querySelector('#row-wallet').addEventListener('click', () => navigate('/profile/wallet'));
    container.querySelector('#row-settings').addEventListener('click', () => navigate('/profile/settings'));
    container.querySelector('#row-logout').addEventListener('click', () => {
      update((s) => { s.auth = { loggedIn: false, user: null }; });
      navigate('/login');
    });
    container.querySelector('#subscribe-btn')?.addEventListener('click', () => {
      openCheckout({
        title: t('subscribe_now_btn'),
        amount: 10.99,
        description: t('sub_plan_annual'),
        type: 'subscription',
        onSuccess: () => {
          update((s) => {
            s.subscription.status = 'active';
            s.subscription.renewsAt = new Date(Date.now() + 365 * 86400000).toISOString();
          });
          paint();
        },
      });
    });
    container.querySelector('#boost-btn')?.addEventListener('click', () => {
      openCheckout({
        title: t('boost_card_title'),
        amount: 4.99,
        description: t('boost_card_title'),
        type: 'boost',
        onSuccess: () => {
          update((s) => { s.profile.boostedUntil = new Date(Date.now() + 7 * 86400000).toISOString(); });
          toast(t('boost_purchased_toast'));
          paint();
        },
      });
    });
  }

  paint();
}

export function renderProfileEdit(container) {
  setNavVisible(true);
  const p = state.profile;
  let draft = JSON.parse(JSON.stringify(p));

  function paint() {
    container.innerHTML = `
      <div class="screen">
        ${pageHeader(t('pe_title'))}
        <div class="container-pad">
          <div class="text-center" style="margin-bottom:18px;">
            <img src="${draft.photo}" alt="" style="width:88px;height:88px;border-radius:50%;object-fit:cover;margin:0 auto 10px;" />
            <button class="btn btn-outline btn-sm" id="change-photo" style="width:auto; display:inline-flex;">${icon('camera', 15)} ${t('pe_change_photo')}</button>
          </div>
          <div class="field"><label>${t('pe_first_name')}</label><input class="input" id="f-first" value="${esc(draft.firstName)}" /></div>
          <div class="field"><label>${t('pe_last_name')}</label><input class="input" id="f-last" value="${esc(draft.lastName)}" /></div>
          <div class="field"><label>${t('pe_age')}</label><input class="input" id="f-age" type="number" min="1" max="120" value="${draft.age || ''}" placeholder="${esc(t('pe_age_placeholder'))}" /></div>
          <div class="age-verify-box">
            ${icon('shield', 18)}
            <p>${t('pe_age_verify_notice')}</p>
          </div>
          <label class="checkbox-row" style="margin: -8px 0 16px;">
            <input type="checkbox" id="f-age-verify" ${draft.ageVerified ? 'checked' : ''} />
            <span>${t('pe_age_verify_checkbox')}</span>
          </label>
          <div class="field"><label>${t('email')}</label><input class="input" type="email" id="f-email" value="${esc(draft.email)}" /></div>
          <div class="field"><label>${t('profile_presentation')}</label><textarea class="input" id="f-bio" rows="4" placeholder="${esc(t('pe_bio_placeholder'))}">${esc(draft.bio)}</textarea></div>

          <div class="field">
            <label>${t('pe_availability_label')}</label>
            <select class="select" id="f-availability">
              <option value="online" ${draft.availabilityStatus === 'online' ? 'selected' : ''}>${t('status_online')}</option>
              <option value="busy" ${draft.availabilityStatus === 'busy' ? 'selected' : ''}>${t('status_busy')}</option>
              <option value="dnd" ${draft.availabilityStatus === 'dnd' ? 'selected' : ''}>${t('status_dnd')}</option>
            </select>
          </div>

          <div class="field">
            <label>${t('pe_role_label')}</label>
          </div>
        </div>
        <div class="role-grid" id="role-grid">
          ${ROLES.map((r) => `
            <div class="role-option ${draft.role === r.id ? 'selected' : ''}" data-role="${r.id}">
              <div class="ic">${icon(r.icon, 16)}</div>
              <span>${esc(roleLabel(r.id))}</span>
            </div>
          `).join('')}
        </div>
        ${draft.role === 'artista' && draft.verificationStatus !== 'none' ? `
        <div class="container-pad" style="margin-top:-6px;">
          ${verificationBadgeHtml(draft)}
        </div>` : ''}

        ${draft.role === 'coach' ? `
        <div class="container-pad" style="margin-top:6px;">
          <p class="muted small">${t('pe_coach_bio_required_hint')}</p>
        </div>` : ''}

        ${GALLERY_ROLES.includes(draft.role) ? `
        <div class="container-pad" style="margin-top:6px;">
          <div class="field mb-0">
            <label>${t('pe_gallery_label')}</label>
            <p class="muted small" style="margin:-4px 0 10px;">${t('pe_gallery_hint')}</p>
            <div class="gallery-grid" id="gallery-grid">
              ${(draft.gallery || []).map((src, i) => `
                <div class="gallery-item">
                  <img src="${src}" alt="" />
                  <button type="button" class="gallery-remove" data-remove-gallery="${i}">${icon('x', 12)}</button>
                </div>`).join('')}
              <button type="button" class="gallery-add" id="gallery-add-btn">${icon('plus', 20)}</button>
            </div>
            <input type="file" id="f-gallery-file" accept="image/*" style="display:none;" />
          </div>
        </div>` : ''}

        ${LOCATION_ROLES.includes(draft.role) ? `
        <div class="container-pad" style="margin-top:6px;">
          <div class="field">
            <label>${t('pe_location_label')}</label>
            <input class="input" id="f-location" value="${esc(draft.location)}" placeholder="${esc(t('pe_location_placeholder'))}" />
            <button type="button" class="geo-note" id="use-geo" style="border:none; cursor:pointer; width:100%; text-align:left;">
              ${icon('mapPin', 15)} ${t('pe_use_geo')}
            </button>
          </div>
          <div class="field mb-0">
            <label>${t('pe_service_price_label')}</label>
            <input class="input" id="f-service-price" type="number" min="0" step="1" value="${draft.servicePrice ?? ''}" placeholder="${esc(t('pe_service_price_placeholder'))}" />
            <p class="muted small" style="margin-top:6px;">${t('pe_service_price_hint')}</p>
          </div>
        </div>` : ''}

        ${draft.role === 'tiktoker' ? `
        <div class="container-pad" style="margin-top:6px;">
          <div class="field">
            <label>${t('pe_tiktok_price_label')}</label>
            <input class="input" id="f-tiktok-price" type="number" min="0" step="1" value="${draft.tiktokPrice ?? ''}" placeholder="${esc(t('pe_tiktok_price_placeholder'))}" />
            <p class="muted small" style="margin-top:6px;">${t('pe_tiktok_price_hint')}</p>
          </div>
          <div class="field mb-0">
            <label>${t('pe_tiktok_url_label')}</label>
            <input class="input" id="f-tiktok-url" type="url" value="${esc(draft.tiktokUrl)}" placeholder="${esc(t('pe_tiktok_url_placeholder'))}" />
            <p class="muted small" id="tiktok-followers-preview" style="margin-top:6px; display:flex; align-items:center; gap:5px;">${icon('tiktok', 12)} ${draft.tiktokUrl ? t('pe_tiktok_followers_hint', { n: simulateTikTokFollowers(draft.tiktokUrl) }) : t('pe_tiktok_followers_none')}</p>
          </div>
        </div>` : ''}

        ${draft.role === 'booking' ? `
        <div class="container-pad" style="margin-top:6px;">
          <div class="field">
            <label>${t('pe_booking_region_label')}</label>
            <input class="input" id="f-booking-region" value="${esc(draft.bookingRegion)}" placeholder="${esc(t('pe_booking_region_placeholder'))}" />
          </div>
          <div class="field mb-0">
            <label>${t('pe_booking_venues_label')}</label>
            <input class="input" id="f-booking-venues" value="${esc(draft.bookingVenues)}" placeholder="${esc(t('pe_booking_venues_placeholder'))}" />
          </div>
        </div>` : ''}

        <div class="container-pad" style="margin-top:20px;">
          <button class="btn btn-primary" id="save-profile">${t('pe_save')}</button>
        </div>
      </div>
    `;
    wirePageHeader('/profile');
    container.querySelector('#change-photo').addEventListener('click', () => {
      const seed = Math.floor(Math.random() * 70) + 1;
      draft.photo = `https://i.pravatar.cc/300?img=${seed}`;
      paint();
    });
    container.querySelectorAll('[data-role]').forEach((el) => el.addEventListener('click', () => {
      const roleId = el.dataset.role;
      if (roleId === 'artista' && draft.role !== 'artista' && draft.verificationStatus === 'none') {
        openArtistVerificationSheet((docName) => {
          draft.role = 'artista';
          draft.verificationStatus = 'pending';
          draft.verificationDocName = docName;
          toast(t('verify_submitted_toast'));
          // Demo-only simulation: no real backend review queue exists here,
          // so "pending" auto-approves after a short delay purely so the
          // badge lifecycle (pending -> verified) can be seen end to end.
          setTimeout(() => {
            update((s) => { if (s.profile.verificationStatus === 'pending') s.profile.verificationStatus = 'verified'; });
            toast(t('verify_approved_toast'));
          }, 12000);
          paint();
        });
        return;
      }
      draft.role = roleId;
      paint();
    }));
    const galleryGrid = container.querySelector('#gallery-grid');
    if (galleryGrid) {
      container.querySelector('#gallery-add-btn').addEventListener('click', () => container.querySelector('#f-gallery-file').click());
      container.querySelector('#f-gallery-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) { toast(t('attach_file_too_large')); return; }
        const reader = new FileReader();
        reader.onload = () => {
          draft.gallery = [...(draft.gallery || []), reader.result];
          paint();
        };
        reader.readAsDataURL(file);
      });
      galleryGrid.querySelectorAll('[data-remove-gallery]').forEach((btn) => btn.addEventListener('click', () => {
        draft.gallery.splice(Number(btn.dataset.removeGallery), 1);
        paint();
      }));
    }
    const tiktokUrlEl = container.querySelector('#f-tiktok-url');
    if (tiktokUrlEl) {
      tiktokUrlEl.addEventListener('input', () => {
        const url = tiktokUrlEl.value.trim();
        const preview = container.querySelector('#tiktok-followers-preview');
        preview.innerHTML = `${icon('tiktok', 12)} ` + (url ? t('pe_tiktok_followers_hint', { n: simulateTikTokFollowers(url) }) : t('pe_tiktok_followers_none'));
      });
      // People commonly type/paste "tiktok.com/@nome" or just "@nome" without
      // a protocol — type="url" then marks the field invalid on blur, which
      // looked like the form refused to save. Auto-complete it instead.
      tiktokUrlEl.addEventListener('blur', () => { tiktokUrlEl.value = normalizeTiktokUrl(tiktokUrlEl.value); });
    }
    const geoBtn = container.querySelector('#use-geo');
    if (geoBtn) geoBtn.addEventListener('click', () => {
      if (!navigator.geolocation) { toast(t('toast_geo_unavailable')); return; }
      toast(t('toast_locating'));
      navigator.geolocation.getCurrentPosition(
        () => { draft.location = t('toast_location_set'); container.querySelector('#f-location').value = draft.location; toast(t('toast_location_updated')); },
        () => toast(t('toast_location_denied'))
      );
    });
    container.querySelector('#save-profile').addEventListener('click', onSave);
  }

  function onSave() {
    draft.firstName = container.querySelector('#f-first').value.trim();
    draft.lastName = container.querySelector('#f-last').value.trim();
    draft.age = Number(container.querySelector('#f-age').value) || null;
    draft.ageVerified = container.querySelector('#f-age-verify').checked;
    draft.email = container.querySelector('#f-email').value.trim();
    draft.bio = container.querySelector('#f-bio').value.trim();
    draft.availabilityStatus = container.querySelector('#f-availability').value;
    const locEl = container.querySelector('#f-location');
    if (locEl) draft.location = locEl.value.trim();
    const servicePriceEl = container.querySelector('#f-service-price');
    if (servicePriceEl) draft.servicePrice = servicePriceEl.value === '' ? null : Number(servicePriceEl.value);
    const priceEl = container.querySelector('#f-tiktok-price');
    if (priceEl) draft.tiktokPrice = priceEl.value === '' ? null : Number(priceEl.value);
    const tiktokUrlEl2 = container.querySelector('#f-tiktok-url');
    if (tiktokUrlEl2) draft.tiktokUrl = normalizeTiktokUrl(tiktokUrlEl2.value);
    const regionEl = container.querySelector('#f-booking-region');
    if (regionEl) draft.bookingRegion = regionEl.value.trim();
    const venuesEl = container.querySelector('#f-booking-venues');
    if (venuesEl) draft.bookingVenues = venuesEl.value.trim();

    if (!draft.role) { toast(t('toast_select_role')); return; }
    if (draft.age !== null && draft.age < 18) { toast(t('toast_min_age')); return; }
    if (draft.age && !draft.ageVerified) { toast(t('toast_confirm_age')); return; }
    if (draft.role === 'coach' && !draft.bio) { toast(t('toast_coach_bio_required')); return; }
    if (GALLERY_ROLES.includes(draft.role) && !(draft.gallery && draft.gallery.length)) { toast(t('toast_gallery_required')); return; }

    update((s) => { s.profile = draft; });
    toast(t('toast_profile_updated'));
    navigate('/profile');
  }

  paint();
}

// Shown when a user selects the "Artista" role for the first time: uploading
// an identity document (ID card / passport) is required before the role is
// applied, so the profile starts "pending verification" rather than
// immediately claiming to be a (possibly impersonated) known artist.
function openArtistVerificationSheet(onSubmitDoc) {
  const html = `
    <div class="sheet-handle"></div>
    <div class="sheet-head"><h2>${icon('shield', 18)} ${t('verify_sheet_title')}</h2><button class="btn-icon" id="sheet-close">${icon('x', 16)}</button></div>
    <div class="container-pad">
      <p class="muted small" style="line-height:1.6; margin-bottom:14px;">${t('verify_sheet_desc')}</p>
      <button type="button" class="btn btn-outline" id="verify-upload-btn" style="width:100%;">${icon('camera', 15)} <span id="verify-filename">${t('verify_upload_btn')}</span></button>
      <input type="file" id="verify-file" accept="image/*,.pdf" style="display:none;" />
      <div style="height:14px"></div>
      <button type="button" class="btn btn-primary" id="verify-submit-btn" style="width:100%;">${t('verify_submit_btn')}</button>
      <button type="button" class="btn btn-secondary" id="verify-cancel-btn" style="width:100%; margin-top:8px;">${t('verify_cancel_btn')}</button>
    </div>
  `;
  const overlay = openSheet(html);
  let fileName = '';
  overlay.querySelector('#sheet-close').addEventListener('click', closeSheet);
  overlay.querySelector('#verify-cancel-btn').addEventListener('click', closeSheet);
  overlay.querySelector('#verify-upload-btn').addEventListener('click', () => overlay.querySelector('#verify-file').click());
  overlay.querySelector('#verify-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) { fileName = file.name; overlay.querySelector('#verify-filename').textContent = fileName; }
  });
  overlay.querySelector('#verify-submit-btn').addEventListener('click', () => {
    if (!fileName) { toast(t('verify_file_required_msg')); return; }
    closeSheet();
    onSubmitDoc(fileName);
  });
}

export function renderProfileSettings(container) {
  setNavVisible(true);
  container.innerHTML = `
    <div class="screen">
      ${pageHeader(t('ps_title'))}
      <div class="settings-list">
        <div class="settings-group">
          <div class="g-title">${t('ps_group_privacy')}</div>
          <div class="settings-row" id="row-visibility">
            <div class="ic">${icon('eyeOff', 17)}</div>
            <div class="txt"><div class="t">${t('ps_visibility_t')}</div><div class="d">${t('ps_visibility_d')}</div></div>
            ${icon('chevronRight', 16)}
          </div>
          <div class="settings-row" id="row-ghost-info">
            <div class="ic">${icon('ghost', 17)}</div>
            <div class="txt"><div class="t">${t('ps_ghost_t')}</div><div class="d">${t('ps_ghost_d')}</div></div>
            ${icon('chevronRight', 16)}
          </div>
          <div class="settings-row">
            <div class="ic">${icon('checkDouble', 17)}</div>
            <div class="txt"><div class="t">${t('ps_read_receipts_t')}</div><div class="d">${t('ps_read_receipts_d')}</div></div>
            <label class="switch">
              <input type="checkbox" id="toggle-read-receipts" ${state.settings.readReceipts ? 'checked' : ''} />
              <span class="track"></span>
            </label>
          </div>
          <div class="settings-row">
            <div class="ic">${icon('user', 17)}</div>
            <div class="txt"><div class="t">${t('ps_online_status_t')}</div><div class="d">${t('ps_online_status_d')}</div></div>
            <label class="switch">
              <input type="checkbox" id="toggle-online-status" ${state.settings.showOnlineStatus ? 'checked' : ''} />
              <span class="track"></span>
            </label>
          </div>
        </div>
        <div class="settings-group">
          <div class="g-title">${t('ps_group_security')}</div>
          <div class="settings-row" id="row-password">
            <div class="ic">${icon('lock', 17)}</div>
            <div class="txt"><div class="t">${t('ps_password_t')}</div></div>
            ${icon('chevronRight', 16)}
          </div>
          <div class="settings-row" id="row-2fa">
            <div class="ic">${icon('shield', 17)}</div>
            <div class="txt"><div class="t">${t('ps_2fa_t')}</div><div class="d">${t('ps_2fa_d')}</div></div>
            ${icon('chevronRight', 16)}
          </div>
        </div>
        <div class="settings-group">
          <div class="g-title">${t('ps_group_data')}</div>
          <div class="settings-row" id="row-export">
            <div class="ic">${icon('wallet', 17)}</div>
            <div class="txt"><div class="t">${t('ps_export_t')}</div></div>
            ${icon('chevronRight', 16)}
          </div>
          <div class="settings-row danger" id="row-delete">
            <div class="ic">${icon('trash', 17)}</div>
            <div class="txt"><div class="t">${t('ps_delete_t')}</div><div class="d">${t('ps_delete_d')}</div></div>
          </div>
        </div>
      </div>
    </div>
  `;
  wirePageHeader('/profile');
  container.querySelectorAll('#row-visibility, #row-ghost-info, #row-password, #row-2fa, #row-export').forEach((row) => {
    row.addEventListener('click', () => toast(t('ps_soon_toast')));
  });
  container.querySelector('#row-delete').addEventListener('click', confirmDelete);
  container.querySelector('#toggle-read-receipts').addEventListener('change', (e) => {
    update((s) => { s.settings.readReceipts = e.target.checked; });
  });
  container.querySelector('#toggle-online-status').addEventListener('change', (e) => {
    update((s) => { s.settings.showOnlineStatus = e.target.checked; });
  });
}

function confirmDelete() {
  const html = `
    <div class="sheet-handle"></div>
    <div class="text-center container-pad" style="padding-top:8px; padding-bottom:20px;">
      <div class="empty-state" style="padding:12px 0 6px;">
        <div class="ic" style="background:#fde3e6; color:#d92d4a;">${icon('trash', 24)}</div>
        <h3>${t('ps_delete_confirm_title')}</h3>
        <p>${t('ps_delete_confirm_desc')}</p>
      </div>
      <button class="btn" style="background:#d92d4a; color:#fff; width:100%; margin-bottom:10px;" id="confirm-delete">${t('ps_delete_confirm_btn')}</button>
      <button class="btn btn-secondary" id="cancel-delete">${t('ps_cancel')}</button>
    </div>
  `;
  const overlay = openSheet(html);
  overlay.querySelector('#cancel-delete').addEventListener('click', closeSheet);
  overlay.querySelector('#confirm-delete').addEventListener('click', () => {
    localStorage.removeItem('melodyCloudState_v1');
    closeSheet();
    location.hash = '/login';
    location.reload();
  });
}
