import { icon } from '../icons.js';
import { setNavVisible, pageHeader, wirePageHeader } from '../components.js';
import { NOTE_SEED } from '../data.js';
import { state, update } from '../state.js';
import { esc, toast, formatRelative } from '../utils.js';
import { navigate } from '../router.js';
import { t } from '../i18n.js';

export function renderBooknoteList(container) {
  setNavVisible(true);
  if (!state.notes || state.notes.length === 0) {
    update((s) => { s.notes = NOTE_SEED.slice(); });
  }
  function paint() {
    const notes = [...state.notes].sort((a, b) => new Date(b.updated) - new Date(a.updated));
    container.innerHTML = `
      <div class="screen">
        ${pageHeader(t('home_booknote_title'))}
        <div class="notes-toolbar">
          <input class="input note-search" id="note-search" placeholder="${esc(t('w_note_search_placeholder'))}" />
          <button class="btn-icon" id="new-note-btn" style="background:var(--grad-brand); color:#fff;">${icon('plus', 20)}</button>
        </div>
        <div class="notes-list" id="notes-list">
          ${notes.length ? notes.map(noteRow).join('') : `<div class="empty-state"><div class="ic">${icon('bookmark', 26)}</div><h3>${t('w_note_empty_title')}</h3><p>${t('w_note_empty_desc')}</p></div>`}
        </div>
      </div>
    `;
    wirePageHeader('/home');
    container.querySelector('#new-note-btn').addEventListener('click', createNote);
    container.querySelectorAll('.note-row').forEach((row) => row.addEventListener('click', () => navigate('/writing/booknote/' + row.dataset.id)));
    container.querySelector('#note-search').addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const filtered = notes.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
      container.querySelector('#notes-list').innerHTML = filtered.length ? filtered.map(noteRow).join('') : `<div class="empty-state"><p>${t('w_note_no_results')}</p></div>`;
      container.querySelectorAll('.note-row').forEach((row) => row.addEventListener('click', () => navigate('/writing/booknote/' + row.dataset.id)));
    });
  }

  function noteRow(n) {
    return `<div class="note-row" data-id="${n.id}">
      <div class="t">${esc(n.title || t('w_note_untitled'))}</div>
      <div class="meta">${formatRelative(n.updated)}</div>
      <div class="snip">${esc(n.body.replace(/\n/g, ' '))}</div>
    </div>`;
  }

  function createNote() {
    const id = 'n' + Date.now();
    update((s) => { s.notes.push({ id, title: '', body: '', updated: new Date().toISOString() }); });
    navigate('/writing/booknote/' + id);
  }

  paint();
}

export function renderBooknoteEditor(container, { id }) {
  setNavVisible(true);
  const note = state.notes.find((n) => n.id === id);
  if (!note) { navigate('/writing/booknote'); return; }

  container.innerHTML = `
    <div class="screen note-editor-page">
      <div class="page-header">
        <button class="back-btn" id="page-back-btn">${icon('chevronLeft', 20)}</button>
        <h1 style="flex:1;">${t('w_note_editor_title')}</h1>
        <button class="btn-icon" id="delete-note-btn" style="background:#fde3e6; color:#d92d4a;">${icon('trash', 17)}</button>
      </div>
      <input class="note-title-input" id="note-title" placeholder="${esc(t('w_note_title_placeholder'))}" value="${esc(note.title)}" />
      <textarea id="note-body" placeholder="${esc(t('w_note_body_placeholder'))}">${esc(note.body)}</textarea>
    </div>
  `;
  wirePageHeader('/writing/booknote');

  const titleEl = container.querySelector('#note-title');
  const bodyEl = container.querySelector('#note-body');
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      update((s) => {
        const n = s.notes.find((x) => x.id === id);
        n.title = titleEl.value;
        n.body = bodyEl.value;
        n.updated = new Date().toISOString();
      });
    }, 300);
  }
  titleEl.addEventListener('input', save);
  bodyEl.addEventListener('input', save);
  container.querySelector('#delete-note-btn').addEventListener('click', () => {
    update((s) => { s.notes = s.notes.filter((n) => n.id !== id); });
    toast(t('toast_note_deleted'));
    navigate('/writing/booknote');
  });
}
