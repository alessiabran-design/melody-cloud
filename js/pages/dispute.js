import { icon } from '../icons.js';
import { setNavVisible } from '../components.js';
import { state, update } from '../state.js';
import { esc, toast } from '../utils.js';
import { navigate } from '../router.js';
import { t, LOCALES } from '../i18n.js';

function nowTime() {
  return new Date().toLocaleTimeString(LOCALES[state.lang] || 'it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function renderDispute(container, { txId }) {
  setNavVisible(false);
  const tx0 = state.wallet.transactions.find((x) => x.id === txId);
  if (!tx0) { navigate('/profile/wallet'); return; }

  if (!tx0.dispute) {
    update((s) => {
      const tx = s.wallet.transactions.find((x) => x.id === txId);
      tx.dispute = {
        status: 'open',
        messages: [{ from: 'system', kind: 'text', text: t('dispute_system_intro', { title: tx.title }), time: nowTime() }],
      };
    });
  }

  const pendingTimers = [];

  function getTx() {
    return state.wallet.transactions.find((x) => x.id === txId);
  }

  function msgBubble(m) {
    if (m.from === 'system') {
      return `<div class="muted small text-center" style="padding: 8px 24px;">${esc(m.text)}</div>`;
    }
    let body;
    if (m.kind === 'image') body = `<img src="${m.dataUrl}" alt="" style="max-width:200px; border-radius:12px; display:block;" />`;
    else if (m.kind === 'link') body = `<a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer" style="color:inherit; display:flex; align-items:center; gap:6px; text-decoration:none;">${icon('mapPin', 13)} <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">${esc(m.url)}</span></a>`;
    else body = esc(m.text);
    return `<div class="msg-bubble ${m.from === 'me' ? 'out' : 'in'}">${body}<div class="msg-time">${esc(m.time)}</div></div>`;
  }

  function paint() {
    const tx = getTx();
    const locale = LOCALES[state.lang] || 'it-IT';
    const overdue = tx.deadlineAt && new Date(tx.deadlineAt) < new Date();
    const resolved = tx.dispute.status !== 'open';

    container.innerHTML = `
      <div class="screen no-nav-pad" style="display:flex; flex-direction:column; min-height:100vh;">
        <div class="chat-detail-header">
          <button class="back-btn" id="page-back-btn" style="background:rgba(255,255,255,0.15); color:#fff;">${icon('chevronLeft', 20)}</button>
          <div style="flex:1;">
            <div class="n">${esc(t('dispute_page_title'))}</div>
            <div class="s">${esc(tx.title)}</div>
          </div>
        </div>

        <div class="dispute-summary-card">
          <div class="row"><span>${esc(tx.title)}</span><b>€${tx.amount.toFixed(2)}</b></div>
          ${tx.deadlineAt ? `
          <div class="dispute-deadline-bar ${overdue ? 'overdue' : ''}">
            ${icon(overdue ? 'alertCircle' : 'clock', 13)}
            ${overdue ? t('dispute_deadline_overdue') : t('dispute_deadline_pending', { date: new Date(tx.deadlineAt).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })}
          </div>` : ''}
        </div>

        <div class="msg-list" id="msg-list" style="flex:1;">
          ${tx.dispute.messages.map(msgBubble).join('')}
        </div>

        ${resolved ? `
        <div class="container-pad" style="padding: 14px 18px calc(14px + var(--safe-b));">
          <p class="muted text-center">${t('dispute_already_resolved')}</p>
        </div>` : `
        <div class="container-pad" style="padding: 10px 18px 0;">
          <button class="btn" style="background:#d92d4a; color:#fff; width:100%;" id="request-refund-btn">${icon('shield', 15)} ${t('dispute_request_refund_btn')}</button>
        </div>
        <form class="chat-input-bar" id="dispute-form">
          <button type="button" class="btn-icon" id="attach-shot" style="background:var(--surface-alt); flex-shrink:0;">${icon('camera', 18)}</button>
          <button type="button" class="btn-icon" id="attach-link" style="background:var(--surface-alt); flex-shrink:0;">${icon('mapPin', 18)}</button>
          <input class="input" id="dispute-input" placeholder="${esc(t('dispute_input_placeholder'))}" autocomplete="off" />
          <button type="submit" class="send-btn">${icon('send', 18)}</button>
        </form>
        <input type="file" id="dispute-file" accept="image/*" style="display:none;" />
        `}
      </div>
    `;

    container.querySelector('#page-back-btn').addEventListener('click', () => {
      if (window.history.length > 1) window.history.back();
      else navigate('/profile/wallet');
    });

    if (resolved) return;

    const list = container.querySelector('#msg-list');
    list.scrollTop = list.scrollHeight;

    function pushMessage(msg) {
      const full = { from: 'me', time: nowTime(), ...msg };
      update((s) => {
        s.wallet.transactions.find((x) => x.id === txId).dispute.messages.push(full);
      });
      list.insertAdjacentHTML('beforeend', msgBubble(full));
      list.scrollTop = list.scrollHeight;
      const t1 = setTimeout(() => {
        const replyMsg = { from: 'them', time: nowTime(), kind: 'text', text: t('dispute_provider_reply_1') };
        update((s) => {
          const cur = s.wallet.transactions.find((x) => x.id === txId);
          if (cur.dispute.status === 'open') cur.dispute.messages.push(replyMsg);
        });
        if (getTx().dispute.status === 'open') {
          list.insertAdjacentHTML('beforeend', msgBubble(replyMsg));
          list.scrollTop = list.scrollHeight;
        }
      }, 1500 + Math.random() * 800);
      pendingTimers.push(t1);
    }

    container.querySelector('#dispute-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = container.querySelector('#dispute-input');
      const text = input.value.trim();
      if (!text) return;
      pushMessage({ kind: 'text', text });
      input.value = '';
    });

    container.querySelector('#attach-link').addEventListener('click', () => {
      const url = prompt(t('link_url_placeholder'));
      if (!url || !url.trim()) return;
      const full = /^https?:\/\//.test(url.trim()) ? url.trim() : 'https://' + url.trim();
      pushMessage({ kind: 'link', url: full });
    });

    const fileInput = container.querySelector('#dispute-file');
    container.querySelector('#attach-shot').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { toast(t('attach_file_too_large')); return; }
      const reader = new FileReader();
      reader.onload = () => pushMessage({ kind: 'image', dataUrl: reader.result });
      reader.readAsDataURL(file);
    });

    container.querySelector('#request-refund-btn').addEventListener('click', () => {
      const btn = container.querySelector('#request-refund-btn');
      btn.disabled = true;
      toast(t('dispute_refund_processing'));
      const t2 = setTimeout(() => {
        update((s) => {
          const cur = s.wallet.transactions.find((x) => x.id === txId);
          cur.status = 'refunded';
          cur.dispute.status = 'refunded';
          cur.dispute.messages.push({ from: 'system', kind: 'text', text: t('dispute_refund_approved', { amount: '€' + cur.amount.toFixed(2) }), time: nowTime() });
        });
        paint();
      }, 1200);
      pendingTimers.push(t2);
    });
  }

  paint();

  return () => { pendingTimers.forEach(clearTimeout); };
}
