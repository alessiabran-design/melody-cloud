const STORAGE_KEY = 'melodyCloudState_v1';

function defaults() {
  return {
    auth: { loggedIn: false, user: null },
    lang: 'it',
    favorites: {},
    ghostMode: false,
    ghostContacts: {},
    profile: {
      photo: 'https://i.pravatar.cc/300?img=47',
      firstName: 'Alessia',
      lastName: 'Bran',
      age: null,
      ageVerified: false,
      birthdate: null,
      email: '',
      bio: '',
      role: null,
      location: '',
      tiktokPrice: null,
      tiktokUrl: '',
      bookingRegion: '',
      bookingVenues: '',
      servicePrice: null,
      boostedUntil: null,
      reviews: { count: 0, avg: 0 },
      verificationStatus: 'none',
      verificationDocName: null,
      gallery: [],
      availabilityStatus: 'online',
    },
    notes: [],
    profileViews: {},
    chats: {},
    reviews: {},
    blockedUsers: {},
    reports: [],
    subscription: {
      status: 'trial',
      trialStartedAt: new Date().toISOString(),
      trialDays: 90,
      plan: 'annual',
      priceLabel: '10,99 €/anno',
      renewsAt: null,
    },
    wallet: { methods: [], transactions: [], creditBalance: 0 },
    settings: { readReceipts: true, showOnlineStatus: true },
  };
}

// Shallow-merges saved state over fresh defaults so fields introduced in later
// app versions (e.g. wallet, boostedUntil) are present even for sessions whose
// localStorage predates them, without clobbering the user's saved values.
function migrate(saved) {
  const base = defaults();
  const merged = { ...base, ...saved };
  merged.profile = { ...base.profile, ...(saved.profile || {}) };
  merged.subscription = { ...base.subscription, ...(saved.subscription || {}) };
  merged.wallet = { ...base.wallet, ...(saved.wallet || {}) };
  merged.wallet.methods = merged.wallet.methods || [];
  merged.wallet.transactions = merged.wallet.transactions || [];
  merged.settings = { ...base.settings, ...(saved.settings || {}) };
  return merged;
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) { /* ignore corrupt state */ }
  return defaults();
}

export const state = loadInitial();

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
}

export function update(mutator) {
  mutator(state);
  persist();
  listeners.forEach((fn) => fn(state));
}

export function isFavorite(category, id) {
  return !!(state.favorites[category] && state.favorites[category][id]);
}

export function toggleFavorite(category, id, item) {
  update((s) => {
    if (!s.favorites[category]) s.favorites[category] = {};
    if (s.favorites[category][id]) delete s.favorites[category][id];
    else s.favorites[category][id] = item;
  });
}

export function favoriteCount(category) {
  const bucket = state.favorites[category];
  return bucket ? Object.keys(bucket).length : 0;
}

// Lightweight "popularity" signal (views/clicks) used to rank non-sponsored
// profiles by how often users open or interact with them, per point 2 of the
// listing/sorting spec: sponsored profiles first, everyone else by popularity.
export function trackProfileView(id) {
  if (!id) return;
  update((s) => { s.profileViews[id] = (s.profileViews[id] || 0) + 1; });
}

export function getProfileViews(id) {
  return (id && state.profileViews[id]) || 0;
}

// A contact counts as "high-tier" (sponsored/featured, or a top-tier TikToker
// by follower count) for the pay-to-message rule: the first message to them
// requires unlocking the conversation via the Wallet, so professionals in
// high demand aren't flooded by time-wasters.
export function isPremiumContact(contact) {
  if (!contact) return false;
  if (contact.sponsored) return true;
  if (typeof contact.followersCount === 'number' && contact.followersCount > 100000) return true;
  return false;
}

export const MESSAGE_UNLOCK_FEE = 1.99;
export const MESSAGE_UNLOCK_DEADLINE_DAYS = 7;

// The pay-to-message rule has to cover calls too, not just text — a fan
// calling or video-calling a high-tier professional directly would bypass
// the whole protection otherwise. A call is allowed straight away only for
// non-premium contacts, or once the conversation with that contact has
// already been unlocked (same chat id scheme as openChatWith).
export function canCallDirectly(contact, category) {
  if (!isPremiumContact(contact)) return true;
  const id = 'dm_' + category + '_' + contact.id;
  const chat = state.chats[id];
  return !!(chat && chat.unlocked);
}

// Reviews the current user has left for a professional, kept separately from
// each mock profile's static baked-in rating/review-count so the two can be
// blended at display time without mutating the read-only mock data arrays.
export function addReview(subjectId, review) {
  if (!subjectId) return;
  update((s) => {
    if (!s.reviews[subjectId]) s.reviews[subjectId] = [];
    s.reviews[subjectId].push({ ...review, date: new Date().toISOString() });
  });
}

export function getReviews(subjectId) {
  return (subjectId && state.reviews[subjectId]) || [];
}

// Blends a profile's static mock rating/count with any reviews the user has
// since added, so the average shown on a detail page reflects real activity.
export function getDisplayRating(profile) {
  const extra = getReviews(profile.id);
  const baseCount = profile.reviews || 0;
  if (!extra.length) return { avg: profile.rating || 0, count: baseCount };
  const baseSum = (profile.rating || 0) * baseCount;
  const extraSum = extra.reduce((sum, r) => sum + r.stars, 0);
  const count = baseCount + extra.length;
  return { avg: (baseSum + extraSum) / count, count };
}

export function isBlocked(id) {
  return !!(id && state.blockedUsers[id]);
}

export function blockContact(id) {
  if (!id) return;
  update((s) => { s.blockedUsers[id] = true; });
}

export function unblockContact(id) {
  if (!id) return;
  update((s) => { delete s.blockedUsers[id]; });
}

export function reportUser(targetId, targetName, reason) {
  update((s) => {
    s.reports.push({ targetId, targetName, reason, date: new Date().toISOString() });
  });
}

// Pay-to-message credits are refunded automatically into the wallet's credit
// balance if the paid-for professional never actually replies within the
// deadline (set when the unlock payment succeeds) — "rejecting" and "never
// responding" collapse into the same rule here, since a mock marketplace
// contact has no real inbox of its own to explicitly click reject with.
export function processExpiredMessageUnlocks() {
  const now = Date.now();
  let refundedAny = false;
  update((s) => {
    s.wallet.transactions.forEach((tx) => {
      if (tx.type === 'message_unlock' && tx.status === 'completed' && !tx.respondedAt && !tx.refunded && tx.deadlineAt && new Date(tx.deadlineAt).getTime() < now) {
        tx.status = 'refunded';
        tx.refunded = true;
        s.wallet.creditBalance = (s.wallet.creditBalance || 0) + tx.amount;
        refundedAny = true;
      }
    });
  });
  return refundedAny;
}

// Finds (or lazily creates) the single dedicated chat thread for a given
// profile/service card, so tapping the chat icon anywhere in the app always
// opens a direct 1:1 conversation with that contact instead of the chat list.
export function openChatWith(contact, category) {
  const id = 'dm_' + category + '_' + contact.id;
  if (!state.chats[id]) {
    const premium = isPremiumContact(contact);
    update((s) => {
      s.chats[id] = {
        name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        photo: contact.photo,
        online: false,
        last: '',
        time: '',
        unread: 0,
        messages: [],
        premium,
        unlocked: !premium,
        // Reaching out to a marketplace professional is never "fan noise" —
        // it always lands straight in the main Inbox, not Richieste.
        senderRole: 'professional',
        senderSubRole: category,
        verified: !!(contact.verified || contact.sponsored),
        folder: 'inbox',
        // The marketplace profile's own id, kept alongside the chat so
        // report/block actions target the same identity whether triggered
        // from the chat thread or from the profile's detail page.
        profileId: contact.id,
      };
    });
  }
  return id;
}
