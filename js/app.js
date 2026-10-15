import { route, notFound, startRouter, replace } from './router.js';
import { state, subscribe } from './state.js';
import { mountBottomNav, updateBottomNav, setNavVisible } from './components.js';
import { renderLogin } from './pages/login.js';
import { renderHome } from './pages/home.js';
import { renderSearch } from './pages/search.js';
import { renderFavorites, renderFavoritesCategory } from './pages/favorites.js';
import { renderChatList, renderChatDetail } from './pages/chat.js';
import { renderProfile, renderProfileEdit, renderProfileSettings } from './pages/profile.js';
import { renderBooknoteList, renderBooknoteEditor } from './pages/writing.js';
import { renderMusicHubProfile, renderTiktokerProfile, renderServiceProfile } from './pages/profileDetail.js';
import { renderWallet } from './pages/wallet.js';
import { renderDispute } from './pages/dispute.js';
import { renderLegalPage } from './pages/legal.js';
import { renderSeeAllMusicHub, renderSeeAllPromo } from './pages/seeAll.js';

const appRoot = document.getElementById('app');
const pageEl = document.createElement('div');
pageEl.id = 'page-root';
appRoot.appendChild(pageEl);
mountBottomNav(appRoot);

function guard(renderFn) {
  return (params) => {
    if (!state.auth.loggedIn) { replace('/login'); return; }
    updateBottomNav();
    return renderFn(pageEl, params);
  };
}

route('/', () => { replace(state.auth.loggedIn ? '/home' : '/login'); });
route('/login', () => { if (state.auth.loggedIn) { replace('/home'); return; } return renderLogin(pageEl); });
route('/legal/:slug', (params) => renderLegalPage(pageEl, params));

route('/home', guard(renderHome));
route('/search', guard(renderSearch));
route('/favorites', guard(renderFavorites));
route('/favorites/:cat', guard(renderFavoritesCategory));
route('/chat', guard(renderChatList));
route('/chat/:id', guard(renderChatDetail));
route('/writing/booknote', guard(renderBooknoteList));
route('/writing/booknote/:id', guard(renderBooknoteEditor));
route('/musichub/:cat/all', guard(renderSeeAllMusicHub));
route('/promotion/:tab/all', guard(renderSeeAllPromo));
route('/musichub/:cat/:id', guard(renderMusicHubProfile));
route('/tiktoker/:id', guard(renderTiktokerProfile));
route('/service/:id', guard(renderServiceProfile));
route('/profile', guard(renderProfile));
route('/profile/edit', guard(renderProfileEdit));
route('/profile/settings', guard(renderProfileSettings));
route('/profile/wallet', guard(renderWallet));
route('/wallet/dispute/:txId', guard(renderDispute));

notFound(() => { replace(state.auth.loggedIn ? '/home' : '/login'); });

subscribe(() => updateBottomNav());

startRouter();
setNavVisible(state.auth.loggedIn);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
