import { icon } from '../icons.js';
import { setNavVisible, pageHeader, wirePageHeader } from '../components.js';
import { SERVICE_PROFILES, sortSponsoredFirst } from '../data.js';
import { openCheckout } from '../checkout.js';
import { esc, openSheet, closeSheet, toast } from '../utils.js';
import { isFavorite, toggleFavorite, openChatWith, trackProfileView } from '../state.js';
import { t, roleLabel, LOCALES } from '../i18n.js';
import { state } from '../state.js';
import { navigate } from '../router.js';
import { openCall } from '../callSimulator.js';

const SERVICE_IDS = ['studio', 'fonico', 'videomaker', 'fotografo'];
const SERVICE_ICONS = { studio: 'mic', fonico: 'headphones', videomaker: 'video', fotografo: 'camera' };

const CITIES = ['Milano', 'Roma', 'Torino', 'Napoli', 'Bologna', 'Firenze', 'Bari', 'Palermo'];

export function renderSearch(container) {
  setNavVisible(true);
  const query = { service: null, dateFrom: null, dateTo: null, place: null };
  let showResults = false;

  function formatDateRange() {
    if (!query.dateFrom && !query.dateTo) return null;
    const locale = LOCALES[state.lang] || 'it-IT';
    const fmt = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    if (query.dateFrom && query.dateTo && query.dateFrom !== query.dateTo) return `${fmt(query.dateFrom)} – ${fmt(query.dateTo)}`;
    return fmt(query.dateFrom || query.dateTo);
  }

  function paint() {
    container.innerHTML = `
      <div class="screen">
        ${pageHeader(t('search_title'))}
        <div class="search-stack">
          <div class="search-mod" id="mod-service">
            <div class="ic">${icon(query.service ? SERVICE_ICONS[query.service] : 'sliders', 18)}</div>
            <div class="txt">
              <div class="lbl">${t('search_service_label')}</div>
              <div class="val ${query.service ? '' : 'placeholder'}">${query.service ? esc(roleLabel(query.service)) : t('search_service_placeholder')}</div>
            </div>
            ${icon('chevronRight', 16)}
          </div>
          <div class="search-mod" id="mod-when">
            <div class="ic">${icon('calendar', 18)}</div>
            <div class="txt">
              <div class="lbl">${t('search_when_label')}</div>
              <div class="val ${formatDateRange() ? '' : 'placeholder'}">${formatDateRange() ? esc(formatDateRange()) : t('search_when_placeholder')}</div>
            </div>
            ${icon('chevronRight', 16)}
          </div>
          <div class="search-mod" id="mod-where">
            <div class="ic">${icon('mapPin', 18)}</div>
            <div class="txt">
              <div class="lbl">${t('search_where_label')}</div>
              <div class="val ${query.place ? '' : 'placeholder'}">${query.place ? esc(query.place) : t('search_where_placeholder')}</div>
            </div>
            ${icon('chevronRight', 16)}
          </div>
          <div class="search-submit-wrap">
            <button class="btn btn-primary" id="submit-search">${icon('search', 17)} ${t('search_cta')}</button>
          </div>
        </div>

        ${showResults ? renderResults() : `
          <div class="empty-state">
            <div class="ic">${icon('search', 26)}</div>
            <h3>${t('search_empty_title')}</h3>
            <p>${t('search_empty_sub')}</p>
          </div>
        `}
      </div>
    `;
    wirePageHeader('/home');
    container.querySelector('#mod-service').addEventListener('click', openServiceSheet);
    container.querySelector('#mod-when').addEventListener('click', openCalendarSheet);
    container.querySelector('#mod-where').addEventListener('click', openWhereSheet);
    container.querySelector('#submit-search').addEventListener('click', () => { showResults = true; paint(); });
    if (showResults) {
      wireResultFavorites(container.querySelector('.screen'));
      container.querySelectorAll('[data-self-edit]').forEach((b) => b.addEventListener('click', () => navigate('/profile/edit')));
      container.querySelectorAll('[data-pay-service]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const p = SERVICE_PROFILES.find((x) => x.id === btn.dataset.payService);
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
      container.querySelectorAll('[data-call-service]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const p = SERVICE_PROFILES.find((x) => x.id === btn.dataset.callService);
          if (p) { trackProfileView(p.id); openCall(p, false); }
        });
      });
      container.querySelectorAll('[data-msg-service]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const p = SERVICE_PROFILES.find((x) => x.id === btn.dataset.msgService);
          const cat = btn.closest('.result-row')?.dataset.cat || 'servizi';
          if (p) { trackProfileView(p.id); navigate('/chat/' + openChatWith(p, cat)); }
        });
      });
      container.querySelectorAll('.result-row[data-id]').forEach((row) => {
        if (row.dataset.self) return;
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => navigate(`/service/${row.dataset.id}`));
      });
    }
  }

  function placeMatches(p) {
    if (!query.place || query.place === t('search_use_location')) return true;
    const needle = query.place.split(',')[0].trim().toLowerCase();
    return p.city.toLowerCase().includes(needle);
  }

  function selfServiceRow() {
    const p = state.profile;
    if (!SERVICE_IDS.includes(p.role)) return '';
    if (query.service && query.service !== p.role) return '';
    return `
      <div class="result-row" data-self="1" style="border-color: var(--mc-400); border-width:1.5px; border-style:solid; border-radius: var(--radius-md);">
        <img src="${p.photo}" alt="${esc(p.firstName)}" />
        <div class="info">
          <div class="name">${esc(p.firstName)} ${esc(p.lastName)}</div>
          <div class="role">${esc(roleLabel(p.role))}</div>
          <div class="loc">${icon('mapPin', 12)} ${p.location ? esc(p.location) : t('profile_location_none')}</div>
          <div class="rating" style="margin-top:4px;">${icon('star', 12)} ${p.reviews.avg.toFixed(1)}</div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
          ${p.servicePrice != null ? `<div class="price">€${p.servicePrice}/h</div>` : ''}
          <button class="btn btn-secondary btn-sm" data-self-edit style="width:auto; flex-shrink:0; white-space:nowrap;">${icon('edit', 13)} ${t('common_edit')}</button>
        </div>
      </div>
    `;
  }

  function renderResults() {
    const filtered = SERVICE_PROFILES.filter((p) => {
      if (query.service) {
        const label = roleLabel(query.service);
        if (p.role !== label && p.role !== rolesReverseLookup(query.service)) return false;
      }
      return placeMatches(p);
    }).sort((a, b) => a.distanceKm - b.distanceKm);
    const list = sortSponsoredFirst(filtered);
    const dateRange = formatDateRange();

    return `
      <div class="section-head" style="padding-top:18px;">
        <div><h2>${t('search_results_count', { n: list.length })}</h2><div class="sub">${query.place ? esc(query.place) : t('search_everywhere')}${dateRange ? ' · ' + esc(dateRange) : ''}</div></div>
      </div>
      ${selfServiceRow()}
      ${list.map((p) => {
        const cat = SERVICE_IDS.find((id) => roleLabel(id) === p.role || rolesReverseLookup(id) === p.role) || 'servizi';
        const fav = isFavorite(cat, p.id);
        return `
        <div class="result-row" data-cat="${cat}" data-id="${p.id}" style="position:relative;">
          ${p.sponsored ? `<span class="sponsored-badge" style="top:auto; bottom:8px; left:18px;">${icon('sparkles', 10)} ${t('featured_badge')}</span>` : ''}
          <img src="${p.photo}" alt="${esc(p.name)}" />
          <div class="info">
            <div class="name">${esc(p.name)}</div>
            <div class="role">${esc(p.role)}</div>
            <div class="loc">${icon('mapPin', 12)} ${esc(p.city)} · ${p.distanceKm} km</div>
            <div class="rating" style="margin-top:4px;">${icon('star', 12)} ${p.rating.toFixed(1)}</div>
            ${dateRange ? `<div class="small" style="color:var(--mc-600); font-weight:600; margin-top:3px;">${icon('calendar', 11)} ${t('search_available_on', { date: esc(dateRange) })}</div>` : ''}
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
            <div style="display:flex; gap:6px;">
              <button class="btn-icon" data-call-service="${p.id}" style="width:32px;height:32px;">${icon('phone', 15)}</button>
              <button class="btn-icon" data-msg-service="${p.id}" style="width:32px;height:32px;">${icon('message', 15)}</button>
              <button class="btn-icon" data-fav-result="${p.id}" style="width:32px;height:32px; ${fav ? 'color:#ff5a8a;' : ''}">${icon('heart', 16)}</button>
            </div>
            <div class="price">€${p.price}/h</div>
            <button class="btn btn-primary btn-sm" data-pay-service="${p.id}" style="white-space:nowrap;">${t('pay_book_btn')}</button>
          </div>
        </div>`;
      }).join('') || `<div class="empty-state"><div class="ic">${icon('search', 24)}</div><h3>${t('search_no_results_title')}</h3><p>${t('search_no_results_sub')}</p></div>`}
    `;
  }

  // Service labels in mock data are stored in Italian (e.g. "Fonico"); this keeps the
  // filter working regardless of the active UI language.
  function rolesReverseLookup(id) {
    const IT_LABELS = { studio: 'Studio di Registrazione', fonico: 'Fonico', videomaker: 'Videomaker', fotografo: 'Fotografo' };
    return IT_LABELS[id];
  }

  function wireResultFavorites(root) {
    if (!root) return;
    root.querySelectorAll('[data-fav-result]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.result-row');
        const cat = row.dataset.cat;
        const id = row.dataset.id;
        const item = SERVICE_PROFILES.find((i) => i.id === id);
        toggleFavorite(cat, id, item);
        btn.style.color = isFavorite(cat, id) ? '#ff5a8a' : '';
        toast(isFavorite(cat, id) ? t('common_added_fav') : t('common_removed_fav'));
      });
    });
  }

  function openServiceSheet() {
    const html = `
      <div class="sheet-handle"></div>
      <div class="sheet-head"><h2>${t('search_service_label')}</h2><button class="btn-icon" id="sheet-close">${icon('x', 16)}</button></div>
      <div class="service-grid">
        ${SERVICE_IDS.map((id) => `
          <div class="service-opt ${query.service === id ? 'selected' : ''}" data-svc="${id}">
            <div class="ic">${icon(SERVICE_ICONS[id], 18)}</div>
            <span>${esc(roleLabel(id))}</span>
          </div>`).join('')}
      </div>
    `;
    const overlay = openSheet(html);
    overlay.querySelector('#sheet-close').addEventListener('click', closeSheet);
    overlay.querySelectorAll('[data-svc]').forEach((el) => el.addEventListener('click', () => {
      query.service = el.dataset.svc;
      closeSheet();
      paint();
    }));
  }

  function openCalendarSheet() {
    const todayIso = new Date().toISOString().slice(0, 10);
    const html = `
      <div class="sheet-handle"></div>
      <div class="sheet-head"><h2>${t('search_when_label')}</h2><button class="btn-icon" id="sheet-close">${icon('x', 16)}</button></div>
      <div class="date-range-box">
        <div class="date-range-field">
          <label>${t('search_date_from')}</label>
          <input type="date" id="date-from" value="${esc(query.dateFrom || '')}" min="${todayIso}" />
        </div>
        <div class="date-range-divider">${icon('chevronRight', 16)}</div>
        <div class="date-range-field">
          <label>${t('search_date_to')}</label>
          <input type="date" id="date-to" value="${esc(query.dateTo || '')}" min="${esc(query.dateFrom || todayIso)}" />
        </div>
      </div>
      <div class="container-pad" style="padding-top:16px; display:flex; flex-direction:column; gap:10px;">
        <button class="btn btn-primary" id="apply-date">${t('search_date_apply')}</button>
        <button class="btn btn-outline" id="clear-date">${t('search_clear_date')}</button>
      </div>
    `;
    const overlay = openSheet(html);
    const fromInput = overlay.querySelector('#date-from');
    const toInput = overlay.querySelector('#date-to');
    overlay.querySelector('#sheet-close').addEventListener('click', closeSheet);
    fromInput.addEventListener('change', () => {
      toInput.min = fromInput.value || todayIso;
      if (fromInput.value && toInput.value && toInput.value < fromInput.value) toInput.value = fromInput.value;
    });
    overlay.querySelector('#apply-date').addEventListener('click', () => {
      query.dateFrom = fromInput.value || null;
      query.dateTo = toInput.value || query.dateFrom;
      closeSheet();
      paint();
    });
    overlay.querySelector('#clear-date').addEventListener('click', () => {
      query.dateFrom = null;
      query.dateTo = null;
      closeSheet();
      paint();
    });
  }

  function openWhereSheet() {
    const html = `
      <div class="sheet-handle"></div>
      <div class="sheet-head"><h2>${t('search_where_label')}</h2><button class="btn-icon" id="sheet-close">${icon('x', 16)}</button></div>
      <div class="field"><input class="input" id="city-input" placeholder="${esc(t('search_where_search_placeholder'))}" /></div>
      <div class="where-list">
        <div class="where-item" id="use-location">
          <div class="ic">${icon('mapPin', 17)}</div>
          <span>${t('search_use_location')}</span>
        </div>
        ${CITIES.map((c) => `
          <div class="where-item" data-city="${esc(c)}">
            <div class="ic">${icon('building', 17)}</div>
            <span>${esc(c)}, Italia</span>
          </div>`).join('')}
      </div>
    `;
    const overlay = openSheet(html);
    overlay.querySelector('#sheet-close').addEventListener('click', closeSheet);
    overlay.querySelectorAll('[data-city]').forEach((el) => el.addEventListener('click', () => {
      query.place = el.dataset.city + ', Italia';
      closeSheet();
      paint();
    }));
    overlay.querySelector('#use-location').addEventListener('click', () => {
      if (!navigator.geolocation) { toast(t('toast_geo_unavailable')); return; }
      toast(t('toast_locating'));
      navigator.geolocation.getCurrentPosition(
        () => { query.place = t('search_use_location'); closeSheet(); paint(); toast(t('toast_location_set')); },
        () => { toast(t('toast_location_denied')); }
      );
    });
    overlay.querySelector('#city-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.value.trim()) {
        query.place = e.target.value.trim();
        closeSheet();
        paint();
      }
    });
  }

  paint();
}
