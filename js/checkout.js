import { icon } from './icons.js';
import { state, update, MESSAGE_UNLOCK_DEADLINE_DAYS } from './state.js';
import { openSheet, closeSheet, toast, esc } from './utils.js';
import { t } from './i18n.js';

function detectBrand(number) {
  const n = number.replace(/\s/g, '');
  if (n.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  return t('checkout_card_generic');
}

function formatCardNumber(v) {
  return v.replace(/[^\d]/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

function addTransaction(record) {
  update((s) => { s.wallet.transactions.unshift(record); });
}

function saveCardMethod(number, exp) {
  const last4 = number.replace(/\s/g, '').slice(-4);
  const brand = detectBrand(number);
  const id = 'pm' + Date.now();
  update((s) => {
    if (!s.wallet.methods.some((m) => m.last4 === last4 && m.brand === brand)) {
      s.wallet.methods.push({ id, brand, last4, exp });
    }
  });
  return id;
}

/**
 * Opens a unified checkout sheet. No real payment processor is configured in
 * this demo (no Stripe/Apple Pay/Google Pay credentials) — every path here
 * simulates success locally and records a wallet transaction, it never
 * transmits card data anywhere. Only brand + last 4 digits are ever persisted.
 *
 * options: {
 *   title, amount (number, EUR), description,
 *   escrow (bool) — service payments held until delivery is confirmed,
 *   type — 'subscription' | 'boost' | 'service',
 *   onSuccess(txn) — called after the simulated payment completes
 * }
 */
const GOOGLE_G = `<svg width="16" height="16" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8c-.2 1.1-.9 2.1-1.8 2.7v2.3h3A8.8 8.8 0 0 0 17.6 9.2Z"/><path fill="#34A853" d="M9 18c2.4 0 4.4-.8 5.9-2.2l-3-2.3c-.8.6-1.9.9-2.9.9-2.2 0-4.1-1.5-4.8-3.6H1.1v2.3A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M4.2 10.8a5.4 5.4 0 0 1 0-3.6V4.9H1.1a9 9 0 0 0 0 8.2l3.1-2.3Z"/><path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 1.1 4.9l3.1 2.3C4.9 5.1 6.8 3.6 9 3.6Z"/></svg>`;

// Share of each escrow (service/TikToker) payment Melody Cloud retains before
// releasing the rest to the professional — shown transparently at checkout.
export const PLATFORM_FEE_PCT = 15;

export function openCheckout({ title, amount, description, escrow = false, type = 'service', chargeless = false, subjectId = null, onSuccess }) {
  let method = chargeless ? 'new-card' : (state.wallet.methods[0] ? state.wallet.methods[0].id : 'new-card');
  let processing = false;
  let authStep = false;
  const feeAmount = escrow ? +(amount * PLATFORM_FEE_PCT / 100).toFixed(2) : 0;
  const netAmount = escrow ? +(amount - feeAmount).toFixed(2) : amount;

  const overlay = openSheet('<div id="checkout-body"></div>');
  render();

  function render() {
    const body = overlay.querySelector('#checkout-body');
    const showCardForm = method === 'new-card';
    const needsAuth = !chargeless && ['apple', 'google', 'paypal'].includes(method) && !authStep;
    body.innerHTML = `
      <div class="sheet-handle"></div>
      <div class="sheet-head"><h2>${icon('wallet', 18)} ${esc(title)}</h2><button class="btn-icon" id="sheet-close">${icon('x', 16)}</button></div>

      ${chargeless ? '' : `
      <div class="checkout-summary">
        <div class="row"><span>${esc(description)}</span><b>€${amount.toFixed(2)}</b></div>
        ${escrow ? `
        <div class="row muted small"><span>${t('checkout_fee_label', { pct: PLATFORM_FEE_PCT })}</span><span>-€${feeAmount.toFixed(2)}</span></div>
        <div class="row muted small"><span>${t('checkout_net_label')}</span><span>€${netAmount.toFixed(2)}</span></div>
        <div class="escrow-note">${icon('shield', 13)} ${t('checkout_escrow_note')}</div>` : ''}
      </div>`}

      ${chargeless ? '' : `
      <div class="pm-list">
        ${state.wallet.methods.map((m) => `
          <label class="pm-opt ${method === m.id ? 'selected' : ''}">
            <input type="radio" name="pm" value="${m.id}" ${method === m.id ? 'checked' : ''} />
            ${icon('wallet', 15)} <span>${esc(m.brand)} •••• ${esc(m.last4)}</span>
          </label>`).join('')}
        <label class="pm-opt ${method === 'apple' ? 'selected' : ''}">
          <input type="radio" name="pm" value="apple" ${method === 'apple' ? 'checked' : ''} />
          <span class="brand-badge apple">${icon('apple', 14)} Pay</span>
        </label>
        <label class="pm-opt ${method === 'google' ? 'selected' : ''}">
          <input type="radio" name="pm" value="google" ${method === 'google' ? 'checked' : ''} />
          <span class="brand-badge" style="background:#fff; border:1px solid var(--border); color:#3c4043;">${GOOGLE_G} Pay</span>
        </label>
        <label class="pm-opt ${method === 'paypal' ? 'selected' : ''}">
          <input type="radio" name="pm" value="paypal" ${method === 'paypal' ? 'checked' : ''} />
          <span class="brand-badge paypal">Pay<span class="paypal-word">Pal</span></span>
        </label>
        <label class="pm-opt ${method === 'new-card' ? 'selected' : ''}">
          <input type="radio" name="pm" value="new-card" ${method === 'new-card' ? 'checked' : ''} />
          ${icon('plus', 15)} <span>${t('checkout_new_card')}</span>
        </label>
      </div>`}

      ${showCardForm ? `
      <div class="card-form">
        <div class="field"><label>${t('checkout_card_number')}</label><input class="input" id="cc-number" inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="19" /></div>
        <div style="display:flex; gap:10px;">
          <div class="field" style="flex:1;"><label>${t('checkout_card_exp')}</label><input class="input" id="cc-exp" placeholder="MM/AA" maxlength="5" /></div>
          <div class="field" style="flex:1;"><label>${t('checkout_card_cvc')}</label><input class="input" id="cc-cvc" inputmode="numeric" placeholder="123" maxlength="4" /></div>
        </div>
        <div class="field mb-0"><label>${t('checkout_card_name')}</label><input class="input" id="cc-name" placeholder="Mario Rossi" /></div>
      </div>` : ''}

      ${needsAuth && method === 'paypal' ? `
      <div class="checkout-summary" style="text-align:center;">
        <p class="muted small" style="line-height:1.5;">${icon('shield', 13)} ${t('checkout_paypal_redirect_note')}</p>
      </div>` : ''}

      <div class="container-pad" style="padding-top:14px;">
        ${needsAuth ? `
          <button class="btn" style="width:100%; ${method === 'apple' ? 'background:#000;color:#fff;' : method === 'google' ? 'background:#fff;color:#3c4043;border:1.5px solid var(--border);' : 'background:#003087;color:#fff;'}" id="checkout-auth">
            ${method === 'apple' ? icon('apple', 16) : method === 'google' ? GOOGLE_G : ''}
            ${method === 'apple' ? t('checkout_confirm_biometric') : method === 'google' ? t('checkout_confirm_google') : t('checkout_paypal_login_btn')}
          </button>
        ` : `
          <button class="btn btn-primary" id="checkout-pay" ${processing ? 'disabled' : ''}>
            ${processing ? t('checkout_processing') : (chargeless ? t('wallet_add_method') : t('checkout_pay_btn', { amount: amount.toFixed(2) }))}
          </button>
        `}
        <p class="muted small text-center" style="margin-top:12px; line-height:1.5;">${t('checkout_disclaimer')}</p>
        ${chargeless ? '' : `<p class="muted small text-center" style="margin-top:8px; line-height:1.5;">${icon('shield', 11)} ${t('checkout_legal_note')}</p>`}
      </div>
    `;
    body.querySelector('#sheet-close').addEventListener('click', closeSheet);
    body.querySelectorAll('input[name=pm]').forEach((r) => r.addEventListener('change', () => { method = r.value; authStep = false; render(); }));
    const numEl = body.querySelector('#cc-number');
    if (numEl) numEl.addEventListener('input', (e) => { e.target.value = formatCardNumber(e.target.value); });
    const expEl = body.querySelector('#cc-exp');
    if (expEl) expEl.addEventListener('input', (e) => {
      let v = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
      if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
      e.target.value = v;
    });
    body.querySelector('#checkout-pay')?.addEventListener('click', onPay);
    body.querySelector('#checkout-auth')?.addEventListener('click', onAuth);
  }

  // Apple/Google/PayPal never collect credentials inside this app — each
  // hands off to the real provider's own authenticated surface (device
  // biometrics, the browser's own password manager, or PayPal's own login).
  // This step only simulates that hand-off completing successfully.
  function onAuth() {
    authStep = true;
    onPay();
  }

  function onPay() {
    let methodLabel;
    if (method === 'new-card') {
      const number = overlay.querySelector('#cc-number')?.value || '';
      const exp = overlay.querySelector('#cc-exp')?.value || '';
      const cvc = overlay.querySelector('#cc-cvc')?.value || '';
      const name = overlay.querySelector('#cc-name')?.value || '';
      if (number.replace(/\s/g, '').length < 12 || exp.length < 4 || cvc.length < 3 || !name.trim()) {
        toast(t('checkout_invalid_card'));
        return;
      }
      const id = saveCardMethod(number, exp);
      methodLabel = `${detectBrand(number)} •••• ${number.replace(/\s/g, '').slice(-4)}`;
      method = id;
    } else if (method === 'apple') {
      methodLabel = 'Apple Pay';
    } else if (method === 'google') {
      methodLabel = 'Google Pay';
    } else if (method === 'paypal') {
      methodLabel = 'PayPal';
    } else {
      const m = state.wallet.methods.find((x) => x.id === method);
      methodLabel = m ? `${m.brand} •••• ${m.last4}` : t('checkout_card_generic');
    }

    processing = true;
    render();
    setTimeout(() => {
      let txn = null;
      if (!chargeless) {
        txn = {
          id: 'txn' + Date.now(),
          date: new Date().toISOString(),
          type, title, description: description || null, amount, method: methodLabel, status: escrow ? 'held' : 'completed',
          deadlineAt: escrow
            ? new Date(Date.now() + 48 * 3600 * 1000).toISOString()
            : (type === 'message_unlock' ? new Date(Date.now() + MESSAGE_UNLOCK_DEADLINE_DAYS * 86400000).toISOString() : null),
          platformFee: escrow ? feeAmount : null,
          netPayout: escrow ? netAmount : null,
          dispute: null,
          subjectId,
          reviewed: false,
          respondedAt: type === 'message_unlock' ? null : undefined,
          refunded: false,
        };
        addTransaction(txn);
        toast(escrow ? t('checkout_success_held') : t('checkout_success'));
      }
      closeSheet();
      if (onSuccess) onSuccess(txn);
    }, 900);
  }
}
