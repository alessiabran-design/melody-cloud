export const ROLES = [
  { id: 'artista', label: 'Artista', icon: 'mic2', group: 'musichub' },
  { id: 'manager', label: 'Manager', icon: 'briefcase', group: 'musichub' },
  { id: 'beatmaker', label: 'Beatmaker', icon: 'sliders', group: 'musichub' },
  { id: 'coach', label: 'Coach Musicale', icon: 'users', group: 'musichub' },
  { id: 'autore', label: 'Autore', icon: 'penTool', group: 'musichub' },
  { id: 'cowriter', label: 'Co-writer', icon: 'edit', group: 'musichub' },
  { id: 'tiktoker', label: 'TikToker', icon: 'tiktok', group: 'promotion' },
  { id: 'booking', label: 'Booking', icon: 'building', group: 'promotion' },
  { id: 'fotografo', label: 'Fotografo', icon: 'camera', group: 'services' },
  { id: 'studio', label: 'Studio di Registrazione', icon: 'mic', group: 'services' },
  { id: 'fonico', label: 'Fonico', icon: 'headphones', group: 'services' },
  { id: 'videomaker', label: 'Videomaker', icon: 'video', group: 'services' },
];

import { getProfileViews } from './state.js';

const AV = (i) => `https://i.pravatar.cc/300?img=${i}`;
// Generic stock-style photography (rooms, gear, portfolio shots) — distinct
// from AV() which only serves headshot-style avatars.
const PH = (seed) => `https://picsum.photos/seed/${seed}/480/320`;

// Sponsored ("Promotion/AI-Boost") profiles always surface first within a
// category — a profile is "sponsored" either via its static `sponsored` flag
// (mock data) or a live `boostedUntil` timestamp still in the future (the
// logged-in user's own profile, purchased from Profilo > Promuovi il tuo
// Profilo). Everyone else is then ranked by popularity (profile views/clicks,
// tracked via state.trackProfileView), most-clicked first, so the default
// order is always: sponsored first, then most popular.
export function sortSponsoredFirst(list) {
  return [...list].sort((a, b) => {
    const boostDiff = (isBoosted(b) ? 1 : 0) - (isBoosted(a) ? 1 : 0);
    if (boostDiff !== 0) return boostDiff;
    return getProfileViews(b.id) - getProfileViews(a.id);
  });
}

export function isBoosted(p) {
  if (!p) return false;
  if (p.sponsored) return true;
  if (p.boostedUntil) return new Date(p.boostedUntil).getTime() > Date.now();
  return false;
}

export const MUSIC_HUB_PROFILES = {
  artista: [
    { id: 'a1', name: 'Giulia Fontana', role: 'Artista Pop', photo: AV(5), rating: 4.9, reviews: 128, city: 'Milano', bio: 'Cantautrice pop, due EP pubblicati e collaborazioni con producer italiani ed europei. Cerco nuove sonorità per il prossimo album.', sponsored: true, verified: true, genres: ['Pop', 'Indie Pop'], availability: 'busy' },
    { id: 'a2', name: 'Marco Ferretti', role: 'Artista Rap', photo: AV(12), rating: 4.7, reviews: 84, city: 'Roma', bio: 'Rapper romano, freestyle e scrittura diretta. Aperto a feat e sessioni in studio last minute.', genres: ['Rap', 'Hip-Hop'] },
    { id: 'a3', name: 'Sara Conti', role: 'Cantautrice', photo: AV(9), rating: 5.0, reviews: 61, city: 'Torino', bio: 'Voce e chitarra, cantautorato italiano contemporaneo. Amo il lavoro in acustico e gli arrangiamenti minimali.', verified: true, genres: ['Cantautorato', 'Acustico'] },
    { id: 'a4', name: 'Luca Bianchi', role: 'Artista Trap', photo: AV(14), rating: 4.6, reviews: 47, city: 'Napoli', bio: 'Trap melodica, produco anche le mie basi. Sempre alla ricerca di beatmaker con cui crescere insieme.', genres: ['Trap'] },
    { id: 'a5', name: 'Chiara Neri', role: 'Artista R&B', photo: AV(24), rating: 4.8, reviews: 39, city: 'Bologna', bio: 'Voce soul/R&B, cerco producer per un EP in uscita in autunno.', genres: ['R&B', 'Soul'] },
    { id: 'a6', name: 'Davide Conte', role: 'Artista Indie', photo: AV(30), rating: 4.5, reviews: 22, city: 'Firenze', bio: 'Cantautore indie-rock, chitarra e scrittura diretta, disponibile per collab e session live.', genres: ['Indie Rock'] },
  ],
  manager: [
    { id: 'm1', name: 'Elena Rossi', role: 'Manager Artisti', photo: AV(23), rating: 4.8, reviews: 55, city: 'Milano', bio: 'Gestisco carriere di artisti emergenti da 8 anni: booking, contratti e strategia di crescita sui social.', sponsored: true },
    { id: 'm2', name: 'Davide Greco', role: 'Talent Manager', photo: AV(15), rating: 4.6, reviews: 39, city: 'Bologna', bio: 'Talent manager specializzato in hip-hop e trap, network diretto con etichette indipendenti.' },
    { id: 'm3', name: 'Chiara Villa', role: 'Manager Booking', photo: AV(28), rating: 4.9, reviews: 72, city: 'Roma', bio: 'Booking manager per live club e festival, organizzo tour e date in tutta Italia.' },
  ],
  beatmaker: [
    { id: 'b1', name: 'Andrea Marino', role: 'Beatmaker Trap', photo: AV(33), rating: 4.9, reviews: 210, city: 'Napoli', bio: 'Produco beat trap e drill da 6 anni, oltre 200 basi vendute. Consegna rapida e revisioni incluse.', sponsored: true },
    { id: 'b2', name: 'Sofia Rinaldi', role: 'Producer Pop', photo: AV(44), rating: 4.7, reviews: 96, city: 'Milano', bio: 'Producer pop/dance, mix e master inclusi in ogni progetto. Studio proprio in centro a Milano.' },
    { id: 'b3', name: 'Tommaso De Luca', role: 'Beatmaker Drill', photo: AV(51), rating: 4.5, reviews: 58, city: 'Roma', bio: 'Sound drill UK/IT, sample originali e bassi pesanti. Lavoro spesso in collaborazione con altri producer.' },
  ],
  coach: [
    { id: 'c1', name: 'Paola Serra', role: 'Coach Vocale', photo: AV(29), rating: 5.0, reviews: 143, city: 'Firenze', bio: 'Insegnante di canto certificata, tecnica ed estensione vocale per generi pop, soul e RnB.', sponsored: true },
    { id: 'c2', name: 'Fabio Moretti', role: 'Coach Performance', photo: AV(18), rating: 4.8, reviews: 67, city: 'Milano', bio: 'Coach di performance live: presenza scenica, gestione del microfono ed energia sul palco.' },
  ],
  autore: [
    { id: 'au1', name: 'Valentina Longo', role: 'Autrice Testi', photo: AV(36), rating: 4.9, reviews: 88, city: 'Roma', bio: 'Scrivo testi per pop, indie e cantautorato. Curo anche la struttura melodica insieme all\'artista.', sponsored: true },
    { id: 'au2', name: 'Nicola Farina', role: 'Autore & Produttore', photo: AV(21), rating: 4.6, reviews: 44, city: 'Bari', bio: 'Autore e produttore a 360°: dal topline alla produzione finita, lavoro spesso da remoto.' },
  ],
  cowriter: [
    { id: 'cw1', name: 'Martina Costa', role: 'Co-writer Pop', photo: AV(41), rating: 4.8, reviews: 52, city: 'Milano', bio: 'Co-writing per progetti pop e mainstream, sessioni di scrittura anche online.', sponsored: true },
    { id: 'cw2', name: 'Riccardo Neri', role: 'Co-writer Rap', photo: AV(53), rating: 4.7, reviews: 33, city: 'Torino', bio: 'Co-writer rap/trap, aiuto a strutturare hook e ritornelli d\'impatto.' },
  ],
};

export const TIKTOKER_PROFILES = [
  { id: 't1', name: 'Bea Lux', age: 22, photo: AV(47), price: 350, clause48: true, followers: '820K', followersCount: 820000, rating: 4.9, tiktokUrl: 'https://www.tiktok.com/@bealux', availability: 'dnd' },
  { id: 't2', name: 'Kevin Storm', age: 19, photo: AV(60), price: 220, clause48: true, followers: '410K', followersCount: 410000, rating: 4.6, tiktokUrl: 'https://www.tiktok.com/@kevinstorm' },
  { id: 't3', name: 'Nina Rey', age: 25, photo: AV(25), price: 480, clause48: true, followers: '1.2M', followersCount: 1200000, rating: 5.0, tiktokUrl: 'https://www.tiktok.com/@ninarey', sponsored: true },
  { id: 't4', name: 'Leo Sound', age: 21, photo: AV(8), price: 190, clause48: true, followers: '265K', followersCount: 265000, rating: 4.5, tiktokUrl: 'https://www.tiktok.com/@leosound' },
  { id: 't5', name: 'Giorgia Blu', age: 23, photo: AV(42), price: 300, clause48: true, followers: '540K', followersCount: 540000, rating: 4.8, tiktokUrl: 'https://www.tiktok.com/@giorgiablu' },
  { id: 't6', name: 'Marco Neve', age: 20, photo: AV(50), price: 150, clause48: true, followers: '198K', followersCount: 198000, rating: 4.4, tiktokUrl: 'https://www.tiktok.com/@marconeve' },
  { id: 't7', name: 'Alex Nova', age: 18, photo: AV(16), price: 40, clause48: true, followers: '7.2K', followersCount: 7200, rating: 4.3, tiktokUrl: 'https://www.tiktok.com/@alexnova' },
  { id: 't8', name: 'Sara Wave', age: 24, photo: AV(27), price: 90, clause48: true, followers: '45K', followersCount: 45000, rating: 4.6, tiktokUrl: 'https://www.tiktok.com/@sarawave' },
];

// Follower bands used both to filter the TikToker listing and to label a
// single profile's reach on its detail page. 'all' is a non-matching filter
// bucket (never returned by followerTierOf), kept here so seeAll's filter
// tabs and the detail-page badge share one source of truth.
export const FOLLOWER_TIERS = [
  { id: 'all', label: 'tier_all', test: () => true },
  { id: 'emerging', label: 'tier_emerging', test: (n) => n < 10000 },
  { id: 'mid', label: 'tier_mid', test: (n) => n >= 10000 && n <= 100000 },
  { id: 'top', label: 'tier_top', test: (n) => n > 100000 },
];

export function followerTierOf(count) {
  return FOLLOWER_TIERS.find((tf) => tf.id !== 'all' && tf.test(count ?? 0)) || null;
}

// Simulated auto-detection of TikTok follower counts from a profile URL.
// No TikTok API credentials are configured, so this deterministically derives
// a plausible-looking figure from the URL string instead of calling the real API.
export function simulateTikTokFollowers(url) {
  if (!url || !url.trim()) return null;
  let hash = 0;
  for (let i = 0; i < url.length; i++) hash = (hash * 31 + url.charCodeAt(i)) >>> 0;
  const base = 4000 + (hash % 1300000);
  if (base >= 1000000) return (base / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (base >= 1000) return Math.round(base / 1000) + 'K';
  return String(base);
}

export const BOOKING_PROFILES = [
  { id: 'bk1', name: 'Fabrizio Colombo', photo: AV(31), region: 'Lombardia', venues: ['Fabrique', 'Magazzini Generali', 'Old Fashion'] },
  { id: 'bk2', name: 'Ilaria De Santis', photo: AV(37), region: 'Lazio', venues: ['Qube', 'Goa Club', 'Shari Vari'], sponsored: true },
  { id: 'bk3', name: 'Simone Greco', photo: AV(43), region: 'Campania', venues: ['S10', 'Duel Beat Club'] },
];

export const SERVICE_PROFILES = [
  { id: 's1', name: 'Sonic Lab Studio', role: 'Studio di Registrazione', photo: AV(64), city: 'Milano, IT', rating: 4.9, price: 45, distanceKm: 3, sponsored: true,
    description: 'Sala di registrazione professionale nel cuore di Milano, trattamento acustico su misura e cabina voce isolata. Ideale per produzioni pop, rap e trap.',
    gallery: [PH('studio-s1-a'), PH('studio-s1-b'), PH('studio-s1-c'), PH('studio-s1-d')],
    equipment: ['Microfono Neumann U87', 'Console SSL AWS 948', 'Monitor Genelec 8341', 'Convertitori Universal Audio Apollo x8'],
    rules: ['Puntualità richiesta, ritardo max 15 min', 'Vietato fumare in sala', 'Cancellazione gratuita fino a 24h prima'], availability: 'busy' },
  { id: 's2', name: 'Enrico Pace', role: 'Fonico', photo: AV(52), city: 'Roma, IT', rating: 4.7, price: 60, distanceKm: 8,
    description: 'Fonico di mix e mastering con 10 anni di esperienza su produzioni pop e indie, lavoro anche da remoto con revisioni incluse.', availability: 'dnd' },
  { id: 's3', name: 'Giada Ferri', role: 'Videomaker', photo: AV(20), city: 'Torino, IT', rating: 4.8, price: 90, distanceKm: 12,
    description: 'Videomaker specializzata in music video e contenuti social, dalla pre-produzione al montaggio finale.',
    portfolio: [PH('video-s3-a'), PH('video-s3-b'), PH('video-s3-c')] },
  { id: 's4', name: 'Matteo Villa', role: 'Fotografo', photo: AV(11), city: 'Bologna, IT', rating: 4.6, price: 70, distanceKm: 5,
    description: 'Fotografo di scena e cover art per artisti musicali, stile cinematografico ed editing incluso.',
    portfolio: [PH('photo-s4-a'), PH('photo-s4-b'), PH('photo-s4-c'), PH('photo-s4-d')] },
  { id: 's5', name: 'Deep Room Studio', role: 'Studio di Registrazione', photo: AV(63), city: 'Napoli, IT', rating: 5.0, price: 40, distanceKm: 20,
    description: 'Studio indipendente con due sale (voce e live room), ambiente rilassato e ingegnere del suono sempre incluso nel prezzo.',
    gallery: [PH('studio-s5-a'), PH('studio-s5-b'), PH('studio-s5-c')],
    equipment: ['Microfono Shure SM7B', 'Console Allen & Heath Qu-16', 'Monitor Yamaha HS8', 'Outboard analogico vintage'],
    rules: ['Acconto 30% alla prenotazione', 'Materiale extra (chitarre, synth) su richiesta', 'Sala disponibile anche nei weekend'] },
  { id: 's6', name: 'Anna Ricci', role: 'Fonico', photo: AV(48), city: 'Milano, IT', rating: 4.9, price: 55, distanceKm: 2, sponsored: true,
    description: 'Fonico live e studio, specializzata in mix vocale per generi urban. Turnaround rapido, 2 revisioni incluse per traccia.' },
  { id: 's7', name: 'Lorenzo Bruni', role: 'Videomaker', photo: AV(35), city: 'Roma, IT', rating: 4.7, price: 85, distanceKm: 6,
    description: 'Regista e montatore per videoclip e behind-the-scenes, drone incluso su richiesta.',
    portfolio: [PH('video-s7-a'), PH('video-s7-b'), PH('video-s7-c')] },
  { id: 's8', name: 'Camilla Esposito', role: 'Fotografo', photo: AV(39), city: 'Milano, IT', rating: 4.9, price: 65, distanceKm: 4,
    description: 'Fotografa ritrattista e di eventi musicali, luce naturale e pellicola analogica su richiesta.',
    portfolio: [PH('photo-s8-a'), PH('photo-s8-b'), PH('photo-s8-c'), PH('photo-s8-d')] },
];

export const CHATS = [
  { id: 'ch1', name: 'Andrea Marino (Beatmaker)', photo: AV(33), last: 'Ti mando il beat entro stasera 🔥', time: '12:41', unread: 2, online: true, senderSubRole: 'beatmaker' },
  { id: 'ch2', name: 'Giulia Fontana', photo: AV(5), last: 'Perfetto, ci vediamo in studio', time: '11:05', unread: 0, online: true, senderSubRole: 'artista', verified: true },
  { id: 'ch3', name: 'Fabrizio Colombo (Booking)', photo: AV(31), last: 'Confermato per il 14 settembre', time: 'Ieri', unread: 0, online: false, senderSubRole: 'booking' },
  { id: 'ch4', name: 'Sonic Lab Studio', photo: AV(64), last: 'La sala B è libera sabato', time: 'Ieri', unread: 1, online: false, senderSubRole: 'studio', verified: true },
  { id: 'ch5', name: 'Bea Lux (TikToker)', photo: AV(47), last: 'Video pubblicato, parte la clausola 48h', time: 'Lun', unread: 0, online: true, senderSubRole: 'tiktoker' },
];

// Simulated unsolicited first-contact messages from fans/standard users — in
// a single-user demo there's no second real account to send these live, so
// they're seeded directly into the "Richieste" (pending) folder to make that
// folder's triage flow (Accetta/Rifiuta) demonstrable out of the box.
export const FAN_REQUESTS = [
  { id: 'req1', name: 'Simone R.', photo: AV(70), last: 'Ciao! Sono un tuo grande fan, mi faresti un duetto?', time: '09:12' },
  { id: 'req2', name: 'Giulia_92', photo: AV(55), last: "Complimenti per l'ultimo singolo! Possiamo collaborare?", time: 'Ieri' },
  { id: 'req3', name: 'Marco T.', photo: AV(44), last: 'Ehi puoi ascoltare la mia demo? È il mio sogno 🙏', time: 'Lun' },
];

export const CHAT_MESSAGES = {
  ch1: [
    { from: 'them', text: 'Ciao! Ho ascoltato la tua ultima traccia, top 🔥', time: '12:20' },
    { from: 'me', text: 'Grazie mille! Ti andrebbe di lavorare su un beat insieme?', time: '12:25' },
    { from: 'them', text: 'Assolutamente sì, ti mando il beat entro stasera 🔥', time: '12:41' },
  ],
  ch2: [
    { from: 'them', text: 'Ci vediamo domani in studio alle 15?', time: '10:50' },
    { from: 'me', text: 'Perfetto, ci vediamo in studio', time: '11:05' },
  ],
};

export const NOTE_SEED = [
  { id: 'n1', title: 'Hook nuovo singolo', body: 'Non voglio più fuggire da\nquesta città che brucia già...', updated: '2026-08-20T10:30:00' },
  { id: 'n2', title: 'Idee ritornello estate', body: 'Sole alto, mare blu\nsiamo noi, non torno più giù...', updated: '2026-08-18T18:12:00' },
];
