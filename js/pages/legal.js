import { icon } from '../icons.js';
import { setNavVisible } from '../components.js';
import { t, LOCALES } from '../i18n.js';
import { state } from '../state.js';
import { esc } from '../utils.js';
import { navigate } from '../router.js';

const DOCS = {
  terms: { titleKey: 'legal_terms_title', sections: 5, prefix: 'legal_terms_s' },
  privacy: { titleKey: 'legal_privacy_title', sections: 5, prefix: 'legal_privacy_s' },
};

export function renderLegalPage(container, { slug }) {
  setNavVisible(false);
  const doc = DOCS[slug] || DOCS.terms;
  const locale = LOCALES[state.lang] || 'it-IT';
  const updatedDate = new Date('2026-01-01').toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

  let sections = '';
  for (let i = 1; i <= doc.sections; i++) {
    sections += `
      <div class="card-block">
        <h3 style="font-size:15px; margin:0 0 8px;">${esc(t(`${doc.prefix}${i}_h`))}</h3>
        <p style="font-size:13.5px; color:var(--text-2); line-height:1.6; margin:0;">${esc(t(`${doc.prefix}${i}_b`))}</p>
      </div>`;
  }

  container.innerHTML = `
    <div class="screen">
      <div class="page-header">
        <button class="back-btn" id="page-back-btn">${icon('chevronLeft', 20)}</button>
        <h1>${esc(t(doc.titleKey))}</h1>
      </div>
      <p class="muted small container-pad" style="margin-bottom:16px;">${esc(t('legal_last_updated', { date: updatedDate }))}</p>
      ${sections}
      <div class="age-verify-box" style="margin-top:4px;">
        ${icon('info', 18)}
        <p>${esc(t('legal_demo_notice'))}</p>
      </div>
      <div style="height:16px"></div>
    </div>
  `;
  container.querySelector('#page-back-btn').addEventListener('click', () => {
    if (window.history.length > 1) window.history.back();
    else navigate('/login');
  });
}
