import { icon } from '../icons.js';
import { update } from '../state.js';
import { navigate } from '../router.js';
import { t, roleLabel } from '../i18n.js';
import { toast, esc } from '../utils.js';
import { setNavVisible } from '../components.js';
import { ROLES } from '../data.js';

function calcAge(birthdateStr) {
  const bd = new Date(birthdateStr);
  if (Number.isNaN(bd.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - bd.getFullYear();
  const m = now.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--;
  return age;
}

export function renderLogin(container) {
  setNavVisible(false);
  let mode = 'login';
  let signupRole = '';
  let idDocName = '';
  // The form re-renders from scratch (innerHTML) whenever the role changes
  // or a document is picked, which would otherwise wipe whatever the user
  // already typed — these keep every field's value across those re-renders.
  let draft = { fullname: '', email: '', password: '', birthdate: '', terms: false, privacy: false };

  function captureDraft() {
    const form = container.querySelector('#auth-form');
    if (!form) return;
    const fd = new FormData(form);
    draft = {
      fullname: fd.get('fullname') || '',
      email: fd.get('email') || '',
      password: fd.get('password') || '',
      birthdate: fd.get('birthdate') || '',
      terms: !!fd.get('terms'),
      privacy: !!fd.get('privacy'),
    };
  }

  function paint() {
    captureDraft();
    container.innerHTML = `
      <div class="screen no-nav-pad">
        <div class="login-hero">
          <img class="brand-logo-hero" src="icons/logo.png" alt="Melody Cloud" />
          <p>${t('welcome_sub')}</p>
          <div class="trial-badge">${icon('sparkles', 14)} ${t('login_trial_badge', { price: '10,99 €/anno' })}</div>
        </div>
        <div class="auth-tabs">
          <button class="${mode === 'login' ? 'active' : ''}" data-mode="login">${t('login')}</button>
          <button class="${mode === 'register' ? 'active' : ''}" data-mode="register">${t('register')}</button>
        </div>
        <form class="auth-form" id="auth-form">
          ${mode === 'register' ? `
          <div class="field">
            <label>${t('login_fullname_label')}</label>
            <input class="input" name="fullname" value="${esc(draft.fullname)}" placeholder="${esc(t('login_fullname_placeholder'))}" required />
          </div>` : ''}
          <div class="field">
            <label>${t('email')}</label>
            <div class="input-with-icon">
              <span class="icon-slot">${icon('user', 16)}</span>
              <input class="input" type="email" name="email" value="${esc(draft.email)}" placeholder="nome@email.com" required />
            </div>
          </div>
          <div class="field">
            <label>${t('password')}</label>
            <div class="input-with-icon">
              <span class="icon-slot">${icon('lock', 16)}</span>
              <input class="input" type="password" name="password" value="${esc(draft.password)}" placeholder="••••••••" minlength="6" required />
            </div>
          </div>
          ${mode === 'register' ? `
          <div class="field">
            <label>${t('signup_birthdate_label')}</label>
            <input class="input" type="date" name="birthdate" id="f-birthdate" value="${esc(draft.birthdate)}" max="${new Date().toISOString().slice(0, 10)}" required />
          </div>
          <div class="field">
            <label>${t('signup_role_label')}</label>
            <select class="select" id="f-signup-role" name="signupRole">
              <option value="">${t('signup_role_placeholder')}</option>
              ${ROLES.map((r) => `<option value="${r.id}" ${signupRole === r.id ? 'selected' : ''}>${esc(roleLabel(r.id))}</option>`).join('')}
            </select>
          </div>
          ${signupRole === 'artista' ? `
          <div class="age-verify-box" style="margin-bottom:12px;">
            ${icon('shield', 18)}
            <p>${t('signup_id_upload_hint')}</p>
          </div>
          <div class="field">
            <label>${t('signup_id_upload_label')}</label>
            <button type="button" class="btn btn-outline btn-sm" id="id-upload-btn" style="width:100%;">${icon('camera', 15)} ${idDocName ? esc(idDocName) : t('verify_upload_btn')}</button>
            <input type="file" id="f-id-doc" accept="image/*,.pdf" style="display:none;" />
          </div>
          ` : ''}
          <div class="checkbox-row">
            <input type="checkbox" id="terms-check" name="terms" ${draft.terms ? 'checked' : ''} />
            <label for="terms-check">${t('signup_accept_prefix')} <a href="#/legal/terms" id="terms-link">${t('signup_terms_link_text')}</a></label>
          </div>
          <div class="checkbox-row">
            <input type="checkbox" id="privacy-check" name="privacy" ${draft.privacy ? 'checked' : ''} />
            <label for="privacy-check">${t('signup_privacy_prefix')} <a href="#/legal/privacy" id="privacy-link">${t('signup_privacy_link_text')}</a></label>
          </div>
          <div style="height:14px"></div>` : ''}
          <button type="submit" class="btn btn-primary">${mode === 'login' ? t('login') : t('register')}</button>
        </form>
        <div class="container-pad">
          <div class="divider-or">${t('common_or')}</div>
          <button class="btn btn-google" id="google-btn">
            <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8c-.2 1.1-.9 2.1-1.8 2.7v2.3h3A8.8 8.8 0 0 0 17.6 9.2Z"/><path fill="#34A853" d="M9 18c2.4 0 4.4-.8 5.9-2.2l-3-2.3c-.8.6-1.9.9-2.9.9-2.2 0-4.1-1.5-4.8-3.6H1.1v2.3A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M4.2 10.8a5.4 5.4 0 0 1 0-3.6V4.9H1.1a9 9 0 0 0 0 8.2l3.1-2.3Z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 1.1 4.9l3.1 2.3C4.9 5.1 6.8 3.6 9 3.6Z"/></svg>
            ${t('continue_google')}
          </button>
        </div>
      </div>
    `;
    container.querySelector('#auth-form').addEventListener('submit', onSubmit);
    container.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; signupRole = ''; idDocName = ''; paint(); }));
    container.querySelector('#google-btn').addEventListener('click', () => doLogin({ name: 'Utente Google', email: 'utente@gmail.com', provider: 'google' }));
    container.querySelector('#terms-link')?.addEventListener('click', (e) => e.stopPropagation());
    container.querySelector('#privacy-link')?.addEventListener('click', (e) => e.stopPropagation());
    container.querySelector('#f-signup-role')?.addEventListener('change', (e) => { signupRole = e.target.value; idDocName = ''; paint(); });
    container.querySelector('#id-upload-btn')?.addEventListener('click', () => container.querySelector('#f-id-doc').click());
    container.querySelector('#f-id-doc')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) { idDocName = file.name; paint(); }
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get('email');
    const name = fd.get('fullname') || email.split('@')[0];

    if (mode === 'register') {
      const birthdate = fd.get('birthdate');
      if (!birthdate || calcAge(birthdate) === null) { toast(t('signup_age_block_msg')); return; }
      if (calcAge(birthdate) < 18) { toast(t('signup_age_block_msg')); return; }
      if (!fd.get('terms') || !fd.get('privacy')) { toast(t('signup_terms_privacy_block_msg')); return; }
      if (signupRole === 'artista' && !idDocName) { toast(t('signup_id_upload_block_msg')); return; }
      doLogin({ name, email, provider: 'email' }, true, { birthdate, role: signupRole, idDocName });
      return;
    }

    doLogin({ name, email, provider: 'email' }, false);
  }

  function doLogin(user, isNewSignup, signupInfo) {
    update((s) => {
      s.auth = { loggedIn: true, user };
      if (isNewSignup) {
        s.subscription = { status: 'trial', trialStartedAt: new Date().toISOString(), trialDays: 90, plan: 'annual', priceLabel: '10,99 €/anno', renewsAt: null };
        if (signupInfo) {
          s.profile.birthdate = signupInfo.birthdate;
          s.profile.age = calcAge(signupInfo.birthdate);
          s.profile.ageVerified = true;
          if (signupInfo.role) s.profile.role = signupInfo.role;
          if (signupInfo.role === 'artista' && signupInfo.idDocName) {
            s.profile.verificationStatus = 'pending';
            s.profile.verificationDocName = signupInfo.idDocName;
          }
        }
      }
    });
    toast(`${t('welcome')}, ${user.name.split(' ')[0]}!`);
    if (signupInfo?.role === 'artista' && signupInfo.idDocName) {
      toast(t('verify_submitted_toast'));
      // Demo-only simulation: there is no real backend review queue here, so
      // the "pending" artist verification auto-approves after a short delay
      // purely to let the badge lifecycle be seen/tested end to end.
      setTimeout(() => {
        update((s) => { if (s.profile.verificationStatus === 'pending') s.profile.verificationStatus = 'verified'; });
        toast(t('verify_approved_toast'));
      }, 12000);
    }
    setNavVisible(true);
    navigate('/home');
  }

  paint();
}
