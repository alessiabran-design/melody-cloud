import { icon } from '../icons.js';
import { setNavVisible, pageHeader, wirePageHeader } from '../components.js';
import { state, update, addReview, processExpiredMessageUnlocks } from '../state.js';
import { esc, toast, openSheet, closeSheet } from '../utils.js';
import { t, LOCALES } from '../i18n.js';
import { openCheckout } from '../checkout.js';
import { navigate } from '../router.js';
import { downloadReceipt } from '../receipt.js';

function receiptButtonHtml(tx) {
  if (tx.status !== 'completed') return '';
  return `<button class="btn btn-outline btn-sm" data-receipt="${tx.id}" style="width:100%;">${icon('download', 13)} ${t('receipt_download_btn')}</button>`;
}

function reviewButtonHtml(tx) {
  if (tx.type !== 'service' || tx.status !== 'completed' || tx.reviewed || !tx.subjectId) return '';
  return `<button class="btn btn-outline btn-sm" data-review="${tx.id}" style="width:100%;">${icon('star', 13)} ${t('wallet_review_btn')}</button>`;
}

function openReviewSheet(tx, onDone) {
  let stars = 0;
  const html = `
    <div class="sheet-handle"></div>
    <div class="sheet-head"><h2>${icon('star', 18)} ${t('review_sheet_title')}</h2><button class="btn-icon" id="sheet-close">${icon('x', 16)}</button></div>
    <div class="container-pad">
      <p class="muted small" style="margin-bottom:10px;">${esc(tx.description || tx.title)}</p>
      <div class="g-title" style="margin-bottom:8px;">${t('review_stars_label')}</div>
      <div id="star-row" style="display:flex; gap:6px; margin-bottom:16px;">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="btn-icon star-opt" data-star="${n}" style="background:var(--surface-alt);">${icon('star', 20)}</button>`).join('')}
      </div>
      <div class="field mb-0">
        <textarea class="input" id="review-comment" rows="3" placeholder="${esc(t('review_comment_placeholder'))}"></textarea>
      </div>
      <div style="height:14px"></div>
      <button class="btn btn-primary" id="review-submit-btn" style="width:100%;">${t('review_submit_btn')}</button>
    </div>
  `;
  const overlay = openSheet(html);
  overlay.querySelector('#sheet-close').addEventListener('click', closeSheet);
  const starBtns = overlay.querySelectorAll('.star-opt');
  function paintStars() {
    starBtns.forEach((b) => {
      const active = Number(b.dataset.star) <= stars;
      b.style.color = active ? '#f5a623' : '';
      b.style.background = active ? '#fff6e5' : 'var(--surface-alt)';
    });
  }
  starBtns.forEach((b) => b.addEventListener('click', () => { stars = Number(b.dataset.star); paintStars(); }));
  overlay.querySelector('#review-submit-btn').addEventListener('click', () => {
    if (!stars) { toast(t('review_required_stars_msg')); return; }
    const comment = overlay.querySelector('#review-comment').value.trim();
    closeSheet();
    onDone({ stars, comment });
  });
}

function disputeButtonHtml(tx) {
  if (tx.type !== 'service') return '';
  if (tx.dispute && tx.dispute.status !== 'open') return '';
  if (tx.dispute && tx.dispute.status === 'open') {
    return `<button class="btn btn-outline btn-sm" data-dispute="${tx.id}" style="width:100%;">${icon('chat', 13)} ${t('dispute_status_open')}</button>`;
  }
  if (tx.status === 'held') {
    return `<button class="btn btn-outline btn-sm" data-dispute="${tx.id}" style="width:100%;">${icon('shield', 13)} ${t('wallet_dispute_btn')}</button>`;
  }
  return '';
}

export function renderWallet(container) {
  setNavVisible(true);

  function paint() {
    if (processExpiredMessageUnlocks()) toast(t('message_unlock_refunded_toast'));
    const methods = state.wallet.methods;
    const txns = state.wallet.transactions;
    const credit = state.wallet.creditBalance || 0;
    const locale = LOCALES[state.lang] || 'it-IT';

    container.innerHTML = `
      <div class="screen">
        ${pageHeader(t('wallet_title'))}

        ${credit > 0 ? `
        <div class="container-pad" style="margin:4px 0 10px;">
          <div class="sub-card" style="margin:0;">
            <div class="top-row">
              <div>
                <div class="plan-name">${icon('wallet', 15)} ${t('wallet_credit_balance_label')}</div>
                <div class="price">€${credit.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>` : ''}

        <div class="section-head" style="padding-top:6px;">
          <div><h2 style="font-size:15px;">${t('wallet_methods_title')}</h2></div>
          <button class="see-all" id="add-method-btn">${icon('plus', 14)}</button>
        </div>
        ${methods.length ? methods.map((m) => `
          <div class="pm-row">
            <div class="ic">${icon('wallet', 18)}</div>
            <div class="txt"><div class="t">${esc(m.brand)} •••• ${esc(m.last4)}</div><div class="d">${esc(m.exp || '')}</div></div>
          </div>
        `).join('') : `<p class="muted container-pad">${t('wallet_no_methods')}</p>`}

        <div class="container-pad" style="margin: 14px 0;">
          <button class="btn btn-outline" id="add-method-btn2">${icon('plus', 15)} ${t('wallet_add_method')}</button>
        </div>

        <div class="section-head">
          <div><h2 style="font-size:15px;">${t('wallet_transactions_title')}</h2></div>
        </div>
        <div class="container-pad" style="margin:0 0 12px;"><button class="btn btn-outline btn-sm" id="export-btn" style="width:100%;">${icon('wallet', 14)} ${t('wallet_export_btn')}</button></div>
        ${txns.length ? txns.map((tx) => `
          <div class="txn-row" style="flex-direction:column; align-items:stretch; gap:8px;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <div class="txt">
                <div class="t">${esc(tx.title)}</div>
                <div class="d">${esc(tx.method)} · ${new Date(tx.date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
              <div class="right">
                <div class="amount">€${tx.amount.toFixed(2)}</div>
                <span class="txn-status ${tx.status}">${t('txn_status_' + tx.status)}</span>
              </div>
            </div>
            ${receiptButtonHtml(tx)}
            ${reviewButtonHtml(tx)}
            ${disputeButtonHtml(tx)}
          </div>
        `).join('') : `<div class="empty-state"><div class="ic">${icon('wallet', 24)}</div><p>${t('wallet_no_transactions')}</p></div>`}
        <div style="height:16px"></div>
      </div>
    `;
    wirePageHeader('/profile');
    container.querySelector('#add-method-btn').addEventListener('click', addMethod);
    container.querySelector('#add-method-btn2').addEventListener('click', addMethod);
    container.querySelector('#export-btn').addEventListener('click', exportStatement);
    container.querySelectorAll('[data-dispute]').forEach((b) => b.addEventListener('click', () => navigate('/wallet/dispute/' + b.dataset.dispute)));
    container.querySelectorAll('[data-receipt]').forEach((b) => b.addEventListener('click', () => {
      downloadReceipt(txns.find((x) => x.id === b.dataset.receipt));
      toast(t('receipt_toast'));
    }));
    container.querySelectorAll('[data-review]').forEach((b) => b.addEventListener('click', () => {
      const tx = txns.find((x) => x.id === b.dataset.review);
      if (!tx) return;
      openReviewSheet(tx, ({ stars, comment }) => {
        addReview(tx.subjectId, { stars, comment, authorName: `${state.profile.firstName} ${state.profile.lastName}`.trim() });
        update((s) => {
          const t2 = s.wallet.transactions.find((x) => x.id === tx.id);
          if (t2) t2.reviewed = true;
          // Demo-only simulated reciprocity: the professional side has no
          // real account to post a review from, so this stands in for "both
          // parties can review each other" per the spec.
          const r = s.profile.reviews;
          const incoming = 4 + Math.round(Math.random());
          r.avg = r.count ? (r.avg * r.count + incoming) / (r.count + 1) : incoming;
          r.count += 1;
        });
        toast(t('review_submitted_toast'));
        paint();
      });
    }));
  }

  function addMethod() {
    openCheckout({
      title: t('wallet_add_method'),
      chargeless: true,
      onSuccess: () => { toast(t('checkout_success')); paint(); },
    });
  }

  function exportStatement() {
    const now = new Date();
    const monthTxns = state.wallet.transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    if (!monthTxns.length) { toast(t('wallet_export_empty')); return; }

    const rows = [['Date', 'Description', 'Method', 'Amount (EUR)', 'Status']];
    monthTxns.forEach((tx) => rows.push([
      new Date(tx.date).toISOString().slice(0, 10),
      tx.title,
      tx.method,
      tx.amount.toFixed(2),
      t('txn_status_' + tx.status),
    ]));
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `melody-cloud-statement-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(t('wallet_export_toast'));
  }

  paint();
}
