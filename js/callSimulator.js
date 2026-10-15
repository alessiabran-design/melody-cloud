import { icon } from './icons.js';
import { t } from './i18n.js';
import { esc } from './utils.js';

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

function fmtDuration(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function openCall(contact, isVideo = false) {
  const overlay = document.createElement('div');
  overlay.className = 'call-overlay';
  document.body.appendChild(overlay);

  let seconds = 0;
  let muted = false;
  let speaker = false;
  let keypadOpen = false;
  let video = isVideo;
  let dialed = '';

  const timer = setInterval(() => {
    seconds++;
    const t1 = overlay.querySelector('#call-timer');
    if (t1) t1.textContent = fmtDuration(seconds);
  }, 1000);

  render();

  function render() {
    overlay.innerHTML = `
      <div class="call-bg ${video ? 'video-mode' : ''}">
        ${video ? `<img class="call-video-bg" src="${contact.photo}" alt="" />` : ''}
        <div class="call-top">
          ${!video ? `<img class="call-avatar" src="${contact.photo}" alt="" />` : ''}
          <div class="call-name">${esc(contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim())}</div>
          <div class="call-status" id="call-timer">${fmtDuration(seconds)}</div>
        </div>

        ${video ? `<div class="call-self-pip">${icon('user', 26)}</div>` : ''}

        ${keypadOpen ? `
        <div class="call-keypad">
          <div class="call-keypad-display">${esc(dialed) || '&nbsp;'}</div>
          <div class="call-keypad-grid">
            ${KEYPAD_KEYS.map((k) => `<button class="call-key" data-key="${k}">${k}</button>`).join('')}
          </div>
          <button class="call-hide-keypad" id="hide-keypad">${t('call_hide_keypad')}</button>
        </div>` : ''}

        <div class="call-controls">
          <button class="call-ctrl ${muted ? 'active' : ''}" id="ctrl-mute">
            ${icon('mic', 20)}<span>${t('call_mute')}</span>
          </button>
          ${video ? `
          <button class="call-ctrl" id="ctrl-switch-audio">
            ${icon('phone', 20)}<span>${t('call_switch_audio')}</span>
          </button>` : `
          <button class="call-ctrl ${speaker ? 'active' : ''}" id="ctrl-speaker">
            ${icon('volume', 20)}<span>${t('call_speaker')}</span>
          </button>`}
          ${video ? `
          <button class="call-ctrl" id="ctrl-camera">
            ${icon('camera', 20)}<span>${t('call_camera')}</span>
          </button>` : `
          <button class="call-ctrl ${keypadOpen ? 'active' : ''}" id="ctrl-keypad">
            ${icon('sliders', 20)}<span>${t('call_keypad')}</span>
          </button>`}
          ${!video ? `
          <button class="call-ctrl" id="ctrl-facetime">
            ${icon('video', 20)}<span>${t('call_facetime')}</span>
          </button>` : ''}
        </div>

        <button class="call-end-btn" id="ctrl-end">${icon('phone', 26)}</button>
      </div>
    `;
    overlay.querySelector('#ctrl-mute').addEventListener('click', () => { muted = !muted; render(); });
    overlay.querySelector('#ctrl-speaker')?.addEventListener('click', () => { speaker = !speaker; render(); });
    overlay.querySelector('#ctrl-keypad')?.addEventListener('click', () => { keypadOpen = !keypadOpen; render(); });
    overlay.querySelector('#hide-keypad')?.addEventListener('click', () => { keypadOpen = false; render(); });
    overlay.querySelector('#ctrl-facetime')?.addEventListener('click', () => { video = true; render(); });
    overlay.querySelector('#ctrl-switch-audio')?.addEventListener('click', () => { video = false; render(); });
    overlay.querySelector('#ctrl-camera')?.addEventListener('click', () => { /* cosmetic in this demo */ });
    overlay.querySelectorAll('[data-key]').forEach((btn) => btn.addEventListener('click', () => {
      dialed += btn.dataset.key;
      render();
    }));
    overlay.querySelector('#ctrl-end').addEventListener('click', close);
  }

  function close() {
    clearInterval(timer);
    overlay.remove();
  }

  return close;
}
