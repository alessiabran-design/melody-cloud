import { icon } from '../icons.js';
import { setNavVisible, pageHeader, wirePageHeader, openReportBlockSheet } from '../components.js';
import { CHATS, CHAT_MESSAGES, FAN_REQUESTS } from '../data.js';
import { state, update, MESSAGE_UNLOCK_FEE, isBlocked, unblockContact, processExpiredMessageUnlocks } from '../state.js';
import { esc, toast, openSheet, closeSheet } from '../utils.js';
import { navigate } from '../router.js';
import { t, LOCALES, roleLabel } from '../i18n.js';
import { openCall } from '../callSimulator.js';
import { openCheckout } from '../checkout.js';

function seedChatsIfEmpty() {
  if (Object.keys(state.chats).length > 0) return;
  update((s) => {
    CHATS.forEach((c) => {
      s.chats[c.id] = {
        name: c.name, photo: c.photo, online: c.online,
        last: c.last, time: c.time, unread: c.unread,
        // Pre-seeded demo history is treated as already read (it's not a
        // message the user just sent, so it shouldn't sit at "sent").
        messages: (CHAT_MESSAGES[c.id] || []).map((m) => (m.from === 'me' ? { ...m, status: m.status || 'read' } : m)),
        // Pre-existing demo conversations are established relationships, not
        // a stranger's first contact, so they're never pay-gated.
        premium: false,
        unlocked: true,
        senderRole: 'professional',
        senderSubRole: c.senderSubRole || null,
        verified: !!c.verified,
        folder: 'inbox',
      };
    });
    // Unsolicited first contact from fans/standard users always starts in
    // the "Richieste" (pending) folder — muted, and requiring an explicit
    // Accetta before the sender can be replied to.
    FAN_REQUESTS.forEach((c) => {
      s.chats[c.id] = {
        name: c.name, photo: c.photo, online: false,
        last: c.last, time: c.time, unread: 1,
        messages: [{ from: 'them', kind: 'text', text: c.last, time: c.time, status: 'read' }],
        premium: false,
        unlocked: true,
        senderRole: 'fan',
        senderSubRole: 'fan',
        verified: false,
        folder: 'pending',
      };
    });
  });
}

function ticksInner(status) {
  if (status === 'read') return `<span class="msg-ticks read" title="${esc(t('msg_status_read'))}">${icon('checkDouble', 13)}</span>`;
  if (status === 'delivered') return `<span class="msg-ticks" title="${esc(t('msg_status_delivered'))}">${icon('checkDouble', 13)}</span>`;
  if (status === 'failed') return `<span class="msg-ticks failed" data-retry="1" title="${esc(t('msg_status_failed'))}">${icon('alertCircle', 13)}</span>`;
  return `<span class="msg-ticks" title="${esc(t('msg_status_sent'))}">${icon('check', 13)}</span>`;
}

function fileSizeLabel(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function youtubeId(url) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,})/);
  return m ? m[1] : null;
}

const CHAT_FILTERS = [
  { id: 'all', label: 'chat_filter_all', test: () => true },
  { id: 'professionals', label: 'chat_filter_professionals', test: (c) => c.senderRole === 'professional' },
  { id: 'fans', label: 'chat_filter_fans', test: (c) => c.senderRole === 'fan' },
  { id: 'priority', label: 'chat_filter_priority', test: (c) => !!c.premium },
];

export function renderChatList(container) {
  setNavVisible(true);
  seedChatsIfEmpty();
  if (processExpiredMessageUnlocks()) toast(t('message_unlock_refunded_toast'));
  let folder = 'inbox';
  let filter = 'all';

  function paint() {
    const all = Object.entries(state.chats);
    const inboxCount = all.filter(([, c]) => c.folder !== 'pending').length;
    const pendingCount = all.filter(([, c]) => c.folder === 'pending').length;
    const filterTest = CHAT_FILTERS.find((f) => f.id === filter).test;
    const entries = all
      .filter(([, c]) => (folder === 'pending' ? c.folder === 'pending' : c.folder !== 'pending'))
      .filter(([, c]) => filterTest(c))
      .sort((a, b) => (b[1].unread || 0) - (a[1].unread || 0));

    container.innerHTML = `
      <div class="screen">
        <div class="page-header" style="padding-bottom:4px;">
          <h1 style="flex:1;">${icon('chat', 20)} ${t('chats')}</h1>
        </div>
        <div class="chip-row" style="padding-bottom:8px;">
          <button class="chip ${folder === 'inbox' ? 'active' : ''}" data-folder="inbox">${t('inbox_folder_label')}${inboxCount ? ' · ' + inboxCount : ''}</button>
          <button class="chip ${folder === 'pending' ? 'active' : ''}" data-folder="pending">${t('requests_folder_label')}${pendingCount ? ' · ' + pendingCount : ''}</button>
        </div>
        <div class="chip-row">
          ${CHAT_FILTERS.map((f) => `<button class="chip ${filter === f.id ? 'active' : ''}" data-filter="${f.id}">${t(f.label)}</button>`).join('')}
        </div>
        <div class="ghost-toggle-bar">
          <span class="lbl">${icon('ghost', 17)} Ghost Mode — ${t('chat_ghost_label_suffix')}</span>
          <label class="switch">
            <input type="checkbox" id="ghost-toggle" ${state.ghostMode ? 'checked' : ''} />
            <span class="track"></span>
          </label>
        </div>
        <div style="padding-top:6px;">
          ${entries.length ? entries.map(([id, c]) => chatRow(id, c)).join('') : `
            <div class="empty-state"><div class="ic">${icon('chat', 24)}</div><p>${folder === 'pending' ? t('requests_empty') : t('inbox_empty')}</p></div>
          `}
        </div>
      </div>
    `;
    wirePageHeader('/home');
    container.querySelectorAll('[data-folder]').forEach((b) => b.addEventListener('click', () => { folder = b.dataset.folder; paint(); }));
    container.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.filter; paint(); }));
    container.querySelector('#ghost-toggle').addEventListener('change', (e) => {
      update((s) => { s.ghostMode = e.target.checked; });
      toast(e.target.checked ? t('toast_ghost_on') : t('toast_ghost_off'));
    });
    container.querySelectorAll('.chat-row').forEach((row) => row.addEventListener('click', () => navigate('/chat/' + row.dataset.id)));
    container.querySelectorAll('[data-accept]').forEach((btn) => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      update((s) => { s.chats[btn.dataset.accept].folder = 'inbox'; });
      toast(t('chat_request_accepted_toast'));
      paint();
    }));
    container.querySelectorAll('[data-reject]').forEach((btn) => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      update((s) => { delete s.chats[btn.dataset.reject]; });
      toast(t('chat_request_rejected_toast'));
      paint();
    }));
  }

  function chatRow(id, c) {
    const ghost = !!state.ghostContacts[id];
    const pending = c.folder === 'pending';
    return `
      <div class="chat-row" data-id="${id}">
        <div class="avatar-wrap">
          <img src="${c.photo}" alt="${esc(c.name)}" />
          ${ghost ? `<span class="ghost-dot">${icon('ghost', 9)}</span>` : (c.online ? '<span class="online-dot"></span>' : '')}
        </div>
        <div class="mid">
          <div class="top-line"><span class="name">${esc(c.name)}</span><span class="time">${esc(c.time || '')}</span></div>
          <div class="last">${esc(c.last || '')}</div>
          ${pending ? `
          <div style="display:flex; gap:6px; margin-top:6px;">
            <button class="btn btn-primary btn-sm" data-accept="${id}">${icon('check', 12)} ${t('chat_accept_btn')}</button>
            <button class="btn btn-outline btn-sm" data-reject="${id}">${icon('x', 12)} ${t('chat_reject_btn')}</button>
          </div>` : ''}
        </div>
        ${!pending && c.unread ? `<span class="unread-badge">${c.unread}</span>` : ''}
      </div>
    `;
  }

  paint();
}

function senderRoleLabel(chat) {
  if (chat.senderRole === 'fan' || !chat.senderSubRole) return t('chat_role_fan');
  return roleLabel(chat.senderSubRole);
}

export function renderChatDetail(container, { id }) {
  setNavVisible(false);
  seedChatsIfEmpty();
  const chat = state.chats[id];
  if (!chat) { navigate('/chat'); return; }
  const blockId = chat.profileId || id;
  const blocked = isBlocked(blockId);
  // Blocking is the most final state — it wins over both the fan-request
  // triage banner and the pay-to-message paywall.
  const pending = chat.folder === 'pending' && !blocked;
  if (chat.unread && !pending) update((s) => { s.chats[id].unread = 0; });
  const isGhost = !!state.ghostContacts[id];
  const locked = !pending && !blocked && !!chat.premium && !chat.unlocked;

  container.innerHTML = `
    <div class="screen no-nav-pad" style="display:flex; flex-direction:column; min-height:100vh;">
      <div class="chat-detail-header">
        <button class="back-btn" id="page-back-btn" style="background:rgba(255,255,255,0.15); color:#fff;">${icon('chevronLeft', 20)}</button>
        <img src="${chat.photo}" alt="${esc(chat.name)}" />
        <div style="flex:1;">
          <div class="n">${esc(chat.name)}</div>
          <div class="s">${isGhost ? '👻 ' + t('chat_incognito') : `<span class="status-dot ${chat.online ? 'online' : 'offline'}"></span>${chat.online ? t('chat_online_now') : t('chat_last_seen')}`}</div>
        </div>
        <button class="icon-btn" id="ctrl-call" style="margin-right:6px;">${icon('phone', 17)}</button>
        <button class="icon-btn" id="ctrl-video" style="margin-right:6px;">${icon('video', 17)}</button>
        <button class="icon-btn" id="ghost-chip" style="margin-right:6px; ${state.ghostMode ? 'background:rgba(255,255,255,0.3);' : ''}">${icon('ghost', 17)}</button>
        <button class="icon-btn" id="more-chip">${icon('info', 17)}</button>
      </div>
      <div class="sender-mini-card">
        <img src="${chat.photo}" alt="" />
        <div class="info">
          <div class="name">${esc(chat.name)} ${chat.verified ? icon('checkCircle', 14) : ''}</div>
          <div class="role">${esc(senderRoleLabel(chat))}</div>
        </div>
      </div>
      <div class="msg-list" id="msg-list" style="flex:1;">
        ${chat.messages.map((m, i) => msgBubble(m, i)).join('')}
      </div>
      ${blocked ? `
      <div class="chat-paywall">
        ${icon('shield', 20)}
        <p>${t('blocked_banner_text')}</p>
        <button class="btn btn-outline btn-sm" id="unblock-chat-btn">${t('blocked_banner_btn')}</button>
      </div>
      ` : pending ? `
      <div class="chat-paywall">
        ${icon('info', 20)}
        <p>${t('chat_request_banner')}</p>
        <div style="display:flex; gap:10px; width:100%; max-width:280px;">
          <button class="btn btn-primary btn-sm" id="accept-request-btn" style="flex:1;">${icon('check', 14)} ${t('chat_accept_btn')}</button>
          <button class="btn btn-outline btn-sm" id="reject-request-btn" style="flex:1;">${icon('x', 14)} ${t('chat_reject_btn')}</button>
        </div>
      </div>
      ` : locked ? `
      <div class="chat-paywall">
        ${icon('lock', 20)}
        <p>${t('chat_paywall_desc', { name: esc(chat.name) })}</p>
        <button class="btn btn-primary btn-sm" id="unlock-chat-btn">${icon('wallet', 14)} ${t('chat_paywall_btn', { amount: MESSAGE_UNLOCK_FEE.toFixed(2) })}</button>
      </div>
      ` : `
      <form class="chat-input-bar" id="chat-form">
        <button type="button" class="btn-icon" id="attach-btn" style="background:var(--surface-alt); flex-shrink:0;">${icon('plus', 20)}</button>
        <input class="input" id="chat-input" placeholder="${esc(t('chat_input_placeholder'))}" autocomplete="off" />
        <button type="submit" class="send-btn">${icon('send', 18)}</button>
      </form>
      <input type="file" id="file-photo" accept="image/*" style="display:none;" />
      <input type="file" id="file-video" accept="video/*" style="display:none;" />
      <input type="file" id="file-doc" style="display:none;" />
      `}
    </div>
  `;
  wirePageHeader('/chat');

  container.querySelector('#ghost-chip').addEventListener('click', () => {
    toast(state.ghostMode ? t('toast_ghost_active_info') : t('toast_ghost_hint'));
  });
  container.querySelector('#ctrl-call').addEventListener('click', () => openCall(chat, false));
  container.querySelector('#ctrl-video').addEventListener('click', () => openCall(chat, true));
  container.querySelector('#more-chip').addEventListener('click', () => openReportBlockSheet({ id: blockId, name: chat.name }));

  const list = container.querySelector('#msg-list');
  const pendingTimers = [];

  function msgBubble(m, idx) {
    const ticks = m.from === 'me' ? `<span class="ticks-slot" id="ticks-${idx}" data-idx="${idx}">${ticksInner(m.status)}</span>` : '';
    const time = m.time ? `<div class="msg-time">${esc(m.time)}${ticks}</div>` : (ticks ? `<div class="msg-time">${ticks}</div>` : '');
    let body = '';
    if (m.kind === 'image') {
      body = `<img src="${m.dataUrl}" alt="" style="max-width:220px; border-radius:12px; display:block;" />`;
    } else if (m.kind === 'video') {
      body = `<video src="${m.dataUrl}" controls style="max-width:220px; border-radius:12px; display:block;"></video>`;
    } else if (m.kind === 'audio') {
      body = `<audio src="${m.dataUrl}" controls style="width:220px;"></audio>`;
    } else if (m.kind === 'file') {
      body = `<div style="display:flex; align-items:center; gap:8px; min-width:180px;">${icon('bookmark', 20)}<div><div style="font-weight:700; font-size:13px;">${esc(m.fileName)}</div><div style="font-size:11px; opacity:.75;">${esc(m.fileSize)}</div></div></div>`;
    } else if (m.kind === 'link') {
      const yt = youtubeId(m.url);
      body = `<a href="${esc(m.url)}" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:none; display:block;">
        ${yt ? `<img src="https://img.youtube.com/vi/${yt}/hqdefault.jpg" alt="" style="width:220px; border-radius:10px; display:block; margin-bottom:6px;" />` : ''}
        <div style="display:flex; align-items:center; gap:6px; font-size:13px; font-weight:600;">${icon('mapPin', 13)} <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px;">${esc(m.url)}</span></div>
      </a>`;
    } else {
      body = esc(m.text);
    }
    return `<div class="msg-bubble ${m.from === 'me' ? 'out' : 'in'}">${body}${time}</div>`;
  }

  function setStatus(idx, status) {
    update((s) => {
      const m = s.chats[id].messages[idx];
      if (m) m.status = status;
    });
    const slot = document.getElementById('ticks-' + idx);
    if (slot) slot.innerHTML = ticksInner(status);
  }

  function simulateDelivery(idx) {
    setStatus(idx, 'sent');
    const willFail = Math.random() < 0.08;
    const t1 = setTimeout(() => {
      if (willFail) { setStatus(idx, 'failed'); return; }
      setStatus(idx, 'delivered');
      const t2 = setTimeout(() => {
        if (state.settings.readReceipts) setStatus(idx, 'read');
      }, 1600 + Math.random() * 1200);
      pendingTimers.push(t2);
    }, 600 + Math.random() * 500);
    pendingTimers.push(t1);
  }

  function pushMessage(msg) {
    const time = new Date().toLocaleTimeString(LOCALES[state.lang] || 'it-IT', { hour: '2-digit', minute: '2-digit' });
    const full = { from: 'me', time, status: 'sent', ...msg };
    let idx;
    update((s) => {
      idx = s.chats[id].messages.push(full) - 1;
      s.chats[id].last = msg.kind && msg.kind !== 'text' ? '📎 ' + t('attach_' + msg.kind) : msg.text;
      s.chats[id].time = time;
      if (state.ghostMode) s.ghostContacts[id] = true;
    });
    list.insertAdjacentHTML('beforeend', msgBubble(full, idx));
    list.scrollTop = list.scrollHeight;
    simulateDelivery(idx);
  }

  list.addEventListener('click', (e) => {
    const retryBtn = e.target.closest('[data-retry]');
    if (!retryBtn) return;
    const idx = Number(retryBtn.closest('.ticks-slot').dataset.idx);
    simulateDelivery(idx);
  });

  if (blocked) {
    container.querySelector('#unblock-chat-btn').addEventListener('click', () => {
      unblockContact(blockId);
      toast(t('unblock_confirm_toast'));
      renderChatDetail(container, { id });
    });
  } else if (pending) {
    container.querySelector('#accept-request-btn').addEventListener('click', () => {
      update((s) => { s.chats[id].folder = 'inbox'; });
      toast(t('chat_request_accepted_toast'));
      renderChatDetail(container, { id });
    });
    container.querySelector('#reject-request-btn').addEventListener('click', () => {
      update((s) => { delete s.chats[id]; });
      toast(t('chat_request_rejected_toast'));
      navigate('/chat');
    });
  } else if (locked) {
    container.querySelector('#unlock-chat-btn').addEventListener('click', () => {
      openCheckout({
        title: t('chat_paywall_btn', { amount: MESSAGE_UNLOCK_FEE.toFixed(2) }),
        amount: MESSAGE_UNLOCK_FEE,
        description: t('chat_unlock_receipt_desc', { name: chat.name }),
        type: 'message_unlock',
        onSuccess: (txn) => {
          update((s) => {
            s.chats[id].unlocked = true;
            s.chats[id].unlockTxnId = txn ? txn.id : null;
          });
          toast(t('chat_unlocked_toast'));
          // Demo-only simulation: most of the time the professional actually
          // replies, so the "refund if unanswered" rule has a real chance of
          // NOT firing — only the unlucky minority (who never hear back)
          // reaches the 7-day auto-refund in processExpiredMessageUnlocks().
          if (txn && Math.random() < 0.7) {
            const replyDelay = 2500 + Math.random() * 2000;
            const rt = setTimeout(() => {
              const time = new Date().toLocaleTimeString(LOCALES[state.lang] || 'it-IT', { hour: '2-digit', minute: '2-digit' });
              update((s) => {
                const tx = s.wallet.transactions.find((x) => x.id === txn.id);
                if (tx) tx.respondedAt = new Date().toISOString();
                const c = s.chats[id];
                if (c) {
                  c.messages.push({ from: 'them', kind: 'text', text: t('chat_sim_reply'), time });
                  c.last = t('chat_sim_reply');
                  c.time = time;
                }
              });
              const list2 = document.getElementById('msg-list');
              if (list2) {
                list2.insertAdjacentHTML('beforeend', msgBubble({ from: 'them', kind: 'text', text: t('chat_sim_reply'), time }, chat.messages.length));
                list2.scrollTop = list2.scrollHeight;
              }
            }, replyDelay);
            pendingTimers.push(rt);
          }
          renderChatDetail(container, { id });
        },
      });
    });
  } else {
    container.querySelector('#chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = container.querySelector('#chat-input');
      const text = input.value.trim();
      if (!text) return;
      pushMessage({ kind: 'text', text });
      input.value = '';
    });

    container.querySelector('#attach-btn').addEventListener('click', openAttachSheet);
  }

  function openAttachSheet() {
    const html = `
      <div class="sheet-handle"></div>
      <div class="sheet-head"><h2>${t('attach_title')}</h2><button class="btn-icon" id="sheet-close">${icon('x', 16)}</button></div>
      <div class="where-list">
        <div class="where-item" data-attach="photo"><div class="ic">${icon('camera', 17)}</div><span>${t('attach_photo')}</span></div>
        <div class="where-item" data-attach="video"><div class="ic">${icon('video', 17)}</div><span>${t('attach_video')}</span></div>
        <div class="where-item" data-attach="file"><div class="ic">${icon('bookmark', 17)}</div><span>${t('attach_file')}</span></div>
        <div class="where-item" data-attach="audio"><div class="ic">${icon('mic', 17)}</div><span>${t('attach_audio')}</span></div>
        <div class="where-item" data-attach="link"><div class="ic">${icon('mapPin', 17)}</div><span>${t('attach_link')}</span></div>
      </div>
    `;
    const overlay = openSheet(html);
    overlay.querySelector('#sheet-close').addEventListener('click', closeSheet);
    overlay.querySelectorAll('[data-attach]').forEach((el) => el.addEventListener('click', () => {
      closeSheet();
      const kind = el.dataset.attach;
      if (kind === 'photo') container.querySelector('#file-photo').click();
      else if (kind === 'video') container.querySelector('#file-video').click();
      else if (kind === 'file') container.querySelector('#file-doc').click();
      else if (kind === 'audio') startAudioRecording();
      else if (kind === 'link') openLinkSheet();
    }));
  }

  function handleFile(input, kind) {
    input.addEventListener('change', () => {
      const file = input.files[0];
      input.value = '';
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { toast(t('attach_file_too_large')); return; }
      const reader = new FileReader();
      reader.onload = () => {
        if (kind === 'file') pushMessage({ kind: 'file', fileName: file.name, fileSize: fileSizeLabel(file.size), dataUrl: reader.result });
        else pushMessage({ kind, dataUrl: reader.result });
      };
      reader.readAsDataURL(file);
    });
  }
  if (!locked && !pending && !blocked) {
    handleFile(container.querySelector('#file-photo'), 'image');
    handleFile(container.querySelector('#file-video'), 'video');
    handleFile(container.querySelector('#file-doc'), 'file');
  }

  function openLinkSheet() {
    const html = `
      <div class="sheet-handle"></div>
      <div class="sheet-head"><h2>${t('attach_link')}</h2><button class="btn-icon" id="sheet-close">${icon('x', 16)}</button></div>
      <div class="field"><input class="input" id="link-input" placeholder="${esc(t('link_url_placeholder'))}" /></div>
      <div class="container-pad"><button class="btn btn-primary" id="link-add">${t('link_add_btn')}</button></div>
    `;
    const overlay = openSheet(html);
    overlay.querySelector('#sheet-close').addEventListener('click', closeSheet);
    const submit = () => {
      const url = overlay.querySelector('#link-input').value.trim();
      if (!url) return;
      const full = /^https?:\/\//.test(url) ? url : 'https://' + url;
      closeSheet();
      pushMessage({ kind: 'link', url: full });
    };
    overlay.querySelector('#link-add').addEventListener('click', submit);
    overlay.querySelector('#link-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  }

  let mediaRecorder = null;
  let recordChunks = [];
  function startAudioRecording() {
    if (!navigator.mediaDevices?.getUserMedia) { toast(t('attach_mic_unavailable')); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      recordChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => recordChunks.push(e.data);
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(recordChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => pushMessage({ kind: 'audio', dataUrl: reader.result });
        reader.readAsDataURL(blob);
        closeSheet();
      };
      mediaRecorder.start();
      const html = `
        <div class="sheet-handle"></div>
        <div class="text-center container-pad" style="padding: 20px 0 26px;">
          <div class="empty-state" style="padding:0;">
            <div class="ic" style="background:#fde3e6; color:#d92d4a; animation: pulse 1.2s infinite;">${icon('mic', 26)}</div>
            <p>${t('attach_recording')}</p>
          </div>
          <button class="btn" style="background:#d92d4a; color:#fff; width:100%; margin-top:14px;" id="stop-rec">${icon('x', 16)} ${t('call_end')}</button>
        </div>
      `;
      const overlay = openSheet(html);
      overlay.querySelector('#stop-rec').addEventListener('click', () => mediaRecorder.stop());
    }).catch(() => toast(t('attach_mic_denied')));
  }

  // --- Anti-screenshot shield (best-effort demo: browsers cannot reliably detect OS screenshots) ---
  const shield = document.createElement('div');
  shield.className = 'screenshot-shield';
  shield.style.display = 'none';
  shield.innerHTML = `${icon('shield', 40)}<div style="font-weight:700;">${t('shield_title')}</div><p style="opacity:.7; font-size:13px; max-width:260px;">${t('shield_desc')}</p>`;
  document.body.appendChild(shield);

  function showShield() { shield.style.display = 'flex'; }
  function hideShield() { setTimeout(() => { shield.style.display = 'none'; }, 900); }

  function onKeydown(e) {
    const isPrintScreen = e.key === 'PrintScreen';
    const isMacShot = e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key);
    const isWinShot = e.key === 'Meta' && e.shiftKey;
    if (isPrintScreen || isMacShot || isWinShot) { showShield(); hideShield(); }
  }
  function onVisibility() { if (document.hidden) showShield(); else hideShield(); }

  document.addEventListener('keyup', onKeydown);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    document.removeEventListener('keyup', onKeydown);
    document.removeEventListener('visibilitychange', onVisibility);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    pendingTimers.forEach(clearTimeout);
    shield.remove();
  };
}
