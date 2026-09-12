'use strict';

/* ============================================================
   0) إعداد Supabase — ضع بيانات مشروعك الحقيقي هنا
   ============================================================
   احصل عليها من: Supabase Dashboard → Project Settings → API
   SUPABASE_URL يجب أن يكون رابط مشروعك (مثل https://xxxx.supabase.co)
   وليس https://supabase.co (وهو موقع الشركة نفسه وليس رابط مشروع).
   شغّل ملف supabase-schema.sql داخل Supabase SQL Editor قبل الربط.
============================================================ */
const SUPABASE_URL = 'https://wfvhzlpvtgnydhmsxcqr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_B6aT1T-ft6Stj0RfPk0xxw_gxpeXnA1';

const { escapeHtml, clampLength, sanitizeUrl, isValidEmail, isValidHandle,
        secureId, rateLimiter, safeStorage, isValidCoinAmount } = JixSecurity;

const isSupabaseConfigured =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL) &&
  SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'sb_publishable_B6aT1T-ft6Stj0RfPk0xxw_gxpeXnA1';

let sb = null;
if (isSupabaseConfigured && window.supabase) {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/* ============================================================
   1) Toast / إشعارات لحظية
============================================================ */
function toast(msg, ms = 2200) {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg; // نص عادي دائماً — لا innerHTML هنا
  c.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, ms);
}

/* ============================================================
   2) طبقة البيانات (DB) — واجهة موحّدة سواء كنا متصلين بـ Supabase
   أو نعمل بوضع محلي تجريبي كامل الوظائف بدون أي إعداد خارجي.
============================================================ */
const DEMO_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
];

const LocalDB = (() => {
  const KEY = 'demo_state_v1';

  function seed() {
    return {
      me: { id: 'local-me', full_name: 'ضيف JIX', username: 'guest_' + Math.floor(Math.random() * 9000 + 1000),
            bio: '', avatar_url: '', coins: 500, following: [], followers_count: 128, likes_count: 0 },
      posts: [
        { id: 'p1', user_id: 'jix_official', user_name: 'jix_official', video_url: DEMO_VIDEOS[0],
          caption: 'تطبيق JIX يعمل الآن بواجهة حقيقية متصلة بقاعدة بيانات! 🚀 #JIX_App', likes: [], comments: [],
          allow_comments: true, allow_share: true, shares: 0, created_at: Date.now() - 3600_000 },
        { id: 'p2', user_id: 'saddam_jilani', user_name: 'saddam_jilani', video_url: DEMO_VIDEOS[1],
          caption: 'ميزة السحب السلس بين الفيديوهات تعمل بسلاسة على الجوال 📱 #برمجة_جوال', likes: [], comments: [],
          allow_comments: true, allow_share: true, shares: 0, created_at: Date.now() - 7200_000 },
        { id: 'p3', user_id: 'travel_vlogs', user_name: 'travel_vlogs', video_url: DEMO_VIDEOS[2],
          caption: 'أجواء الصيف ☀️🕶️ #سياحة #تحدي_الصيف', likes: [], comments: [],
          allow_comments: true, allow_share: true, shares: 0, created_at: Date.now() - 10800_000 },
        { id: 'p4', user_id: 'cyber_city', user_name: 'cyber_city', video_url: DEMO_VIDEOS[3],
          caption: 'جرّب الآن ميزة الهدايا الجديدة بالبث المباشر 🎁🔴 #JIX_App', likes: [], comments: [],
          allow_comments: true, allow_share: true, shares: 0, created_at: Date.now() - 14400_000 },
      ],
      groupMessages: [
        { id: 'm1', user_name: 'jix_official', text: 'أهلاً بالجميع في دردشة JIX الجماعية 👋', created_at: Date.now() - 5000 },
      ],
      notifications: [
        { id: 'n1', type: 'system', text: 'مرحباً بك في JIX! أكمل ملفك الشخصي لتبدأ.', read: false, created_at: Date.now() },
      ],
      hashtags: [
        { tag: '#JIX_App', views: '1.2M' }, { tag: '#برمجة_جوال', views: '850K' },
        { tag: '#تحدي_الصيف', views: '640K' }, { tag: '#رقص', views: '2.1M' }, { tag: '#طبخ_سريع', views: '410K' },
      ],
      challenges: [
        { tag: '#تحدي_الصيف', title: 'تحدي الصيف الكبير', prize: 5000, ends: 'ينتهي خلال 3 أيام' },
        { tag: '#تحدي_JIX_للرقص', title: 'تحدي الرقص', prize: 3000, ends: 'ينتهي خلال 5 أيام' },
      ],
      suggested: ['space_science', 'cyber_city', 'travel_vlogs', 'saddam_jilani'],
    };
  }

  function load() { return safeStorage.get(KEY) || seed(); }
  function save(state) { safeStorage.set(KEY, state); }
  let state = load();

  return {
    getMe: () => state.me,
    saveMe: (patch) => { Object.assign(state.me, patch); save(state); return state.me; },
    listPosts: () => state.posts.slice().sort((a, b) => b.created_at - a.created_at),
    getPost: (id) => state.posts.find(p => p.id === id),
    toggleLike: (postId) => {
      const p = state.posts.find(x => x.id === postId); if (!p) return null;
      const uid = state.me.id; const i = p.likes.indexOf(uid);
      if (i >= 0) p.likes.splice(i, 1); else p.likes.push(uid);
      save(state); return p;
    },
    addComment: (postId, text) => {
      const p = state.posts.find(x => x.id === postId); if (!p) return null;
      const c = { id: secureId(), user_name: state.me.username, text, created_at: Date.now() };
      p.comments.push(c); save(state); return c;
    },
    listComments: (postId) => (state.posts.find(x => x.id === postId) || { comments: [] }).comments,
    addPost: (post) => {
      const full = Object.assign({ id: secureId(), likes: [], comments: [], shares: 0, created_at: Date.now() }, post);
      state.posts.unshift(full); save(state); return full;
    },
    incShare: (postId) => { const p = state.posts.find(x => x.id === postId); if (p) { p.shares++; save(state); } },
    listGroupMessages: () => state.groupMessages,
    addGroupMessage: (text) => {
      const m = { id: secureId(), user_name: state.me.username, text, created_at: Date.now() };
      state.groupMessages.push(m); save(state); return m;
    },
    listNotifications: () => state.notifications.slice().sort((a, b) => b.created_at - a.created_at),
    addNotification: (n) => { state.notifications.unshift(Object.assign({ id: secureId(), read: false, created_at: Date.now() }, n)); save(state); },
    listHashtags: () => state.hashtags,
    listChallenges: () => state.challenges,
    listSuggested: () => state.suggested,
    search: (q) => {
      const lower = q.toLowerCase();
      const users = state.suggested.filter(u => u.toLowerCase().includes(lower)).map(u => ({ type: 'user', value: u }));
      const tags = state.hashtags.filter(h => h.tag.toLowerCase().includes(lower)).map(h => ({ type: 'tag', value: h.tag }));
      return [...tags, ...users];
    },
    spendCoins: (n) => { if (state.me.coins < n) return false; state.me.coins -= n; save(state); return true; },
    addCoins: (n) => { state.me.coins += n; save(state); },
  };
})();

// طبقة Supabase الحقيقية (تُستخدم تلقائياً إن تم ضبط المفاتيح أعلاه وتشغيل supabase-schema.sql)
const SupaDB = {
  async listPosts() {
    const { data, error } = await sb.from('posts').select('*, profiles(username, avatar_url)').order('created_at', { ascending: false }).limit(30);
    if (error) throw error;
    return data;
  },
  async toggleLike(postId, userId) {
    const { data: existing } = await sb.from('likes').select('*').eq('post_id', postId).eq('user_id', userId).maybeSingle();
    if (existing) await sb.from('likes').delete().eq('post_id', postId).eq('user_id', userId);
    else await sb.from('likes').insert({ post_id: postId, user_id: userId });
  },
  async addComment(postId, userId, text) {
    const { error } = await sb.from('comments').insert({ post_id: postId, user_id: userId, text });
    if (error) throw error;
  },
  async listComments(postId) {
    const { data, error } = await sb.from('comments').select('*, profiles(username)').eq('post_id', postId).order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  async addGroupMessage(userId, userName, text) {
    const { error } = await sb.from('messages').insert({ room: 'global', user_id: userId, user_name: userName, message_text: text });
    if (error) throw error;
  },
  async listGroupMessages() {
    const { data, error } = await sb.from('messages').select('*').eq('room', 'global').order('created_at', { ascending: true }).limit(100);
    if (error) throw error;
    return data;
  },
  subscribeGroupMessages(cb) {
    return sb.channel('room:global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'room=eq.global' }, (payload) => cb(payload.new))
      .subscribe();
  },
};

/* ============================================================
   3) التنقل بين الصفحات
============================================================ */
const PAGES = ['home', 'discover', 'upload', 'inbox', 'profile', 'live'];
function goToTab(tabName) {
  PAGES.forEach(p => document.getElementById(p + '-page')?.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(tabName + '-page')?.classList.add('active');
  document.getElementById('nav-' + tabName)?.classList.add('active');
  document.querySelectorAll('video').forEach(v => { if (tabName !== 'home') v.pause(); });
  if (tabName === 'inbox') renderInbox();
  if (tabName === 'discover') renderDiscover();
  if (tabName === 'profile') renderProfile();
}
document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
  el.addEventListener('click', () => goToTab(el.dataset.tab));
});
document.getElementById('live-shortcut').addEventListener('click', () => goToTab('live'));

/* ============================================================
   4) الخلاصة (Feed): عرض، إعجاب، تعليق، مشاركة
============================================================ */
const feedContainer = document.getElementById('jix-feed');
let currentPosts = [];

async function loadFeed() {
  try {
    currentPosts = sb ? await SupaDB.listPosts() : LocalDB.listPosts();
  } catch (e) {
    console.error(e); toast('تعذّر تحميل الخلاصة، عرض بيانات محلية.');
    currentPosts = LocalDB.listPosts();
  }
  renderFeed();
}

function renderFeed() {
  feedContainer.innerHTML = '';
  currentPosts.forEach((post) => {
    const uname = post.user_name || post.profiles?.username || 'مستخدم';
    const likeCount = (post.likes && post.likes.length) || post.likes_count || 0;
    const commentCount = (post.comments && post.comments.length) || post.comments_count || 0;
    const shareCount = post.shares || post.shares_count || 0;
    const liked = LocalDB.getMe && post.likes?.includes?.(LocalDB.getMe().id);

    const card = document.createElement('div');
    card.className = 'video-card';
    card.dataset.postId = post.id;
    card.innerHTML = `
      <video src="${sanitizeUrl(post.video_url)}" loop muted playsinline></video>
      <div class="side-bar">
        <div class="action-button like-btn ${liked ? 'liked' : ''}"><div class="icon">❤️</div><span class="like-count">${formatCount(likeCount)}</span></div>
        <div class="action-button comment-btn"><div class="icon">💬</div><span class="comment-count">${formatCount(commentCount)}</span></div>
        <div class="action-button share-btn"><div class="icon">➡️</div><span class="share-count">${formatCount(shareCount)}</span></div>
      </div>
      <div class="video-details">
        <div class="username">${escapeHtml(uname)}</div>
        <div class="description">${linkifyHashtags(escapeHtml(post.caption || ''))}</div>
      </div>`;
    feedContainer.appendChild(card);

    const vEl = card.querySelector('video');
    let lastTap = 0;
    card.addEventListener('click', (e) => {
      if (e.target.closest('.action-button')) return;
      const now = Date.now();
      if (now - lastTap < 300) { popHeart(card, e); likePost(post.id, true); }
      else setTimeout(() => { if (Date.now() - lastTap >= 300) vEl.paused ? vEl.play().catch(() => {}) : vEl.pause(); }, 300);
      lastTap = now;
    });
    card.querySelector('.like-btn').addEventListener('click', () => likePost(post.id));
    card.querySelector('.comment-btn').addEventListener('click', () => openComments(post.id));
    card.querySelector('.share-btn').addEventListener('click', () => openShare(post.id));
  });
  setTimeout(() => { const v = feedContainer.querySelector('video'); v?.play().catch(() => {}); }, 300);
}

function formatCount(n) {
  n = Number(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}
function linkifyHashtags(text) {
  return text.replace(/#([\p{L}\p{N}_]+)/gu, '<span class="hashtag">#$1</span>');
}
function popHeart(card, event) {
  const heart = document.createElement('div'); heart.className = 'heart-pop'; heart.textContent = '❤️';
  const rect = card.getBoundingClientRect();
  heart.style.left = (event.clientX - rect.left) + 'px';
  heart.style.top = (event.clientY - rect.top) + 'px';
  card.appendChild(heart);
  setTimeout(() => heart.remove(), 600);
}

async function likePost(postId, forceLike = false) {
  if (!rateLimiter.allow('like', 20, 10_000)) return;
  const me = LocalDB.getMe();
  if (sb) { try { await SupaDB.toggleLike(postId, me.id); } catch (e) { console.error(e); } }
  else LocalDB.toggleLike(postId);
  const card = feedContainer.querySelector(`[data-post-id="${CSS.escape(postId)}"]`);
  if (!card) return;
  const btn = card.querySelector('.like-btn'); const count = card.querySelector('.like-count');
  const isLiked = btn.classList.contains('liked');
  if (forceLike && isLiked) return;
  btn.classList.toggle('liked');
  const nowLiked = btn.classList.contains('liked');
  count.textContent = formatCount(parseCount(count.textContent) + (nowLiked ? 1 : -1));
}
function parseCount(text) {
  if (text.endsWith('M')) return parseFloat(text) * 1_000_000;
  if (text.endsWith('K')) return parseFloat(text) * 1_000;
  return parseFloat(text) || 0;
}

/* ============================================================
   5) التعليقات
============================================================ */
let activePostId = null;
const commentsModal = document.getElementById('comments-modal');
async function openComments(postId) {
  activePostId = postId;
  const post = currentPosts.find(p => p.id === postId);
  if (post && post.allow_comments === false) { toast('التعليقات مغلقة لهذا الفيديو'); return; }
  commentsModal.classList.add('open');
  await renderComments();
}
async function renderComments() {
  let comments = [];
  try { comments = sb ? await SupaDB.listComments(activePostId) : LocalDB.listComments(activePostId); }
  catch (e) { console.error(e); }
  const list = document.getElementById('comments-list');
  document.getElementById('comments-count').textContent = comments.length;
  list.innerHTML = comments.length
    ? comments.map(c => `<div class="comment-row"><b>${escapeHtml(c.user_name || c.profiles?.username || 'مستخدم')}</b><p>${escapeHtml(c.text)}</p></div>`).join('')
    : '<div class="empty-hint">لا تعليقات بعد — كن أول من يعلّق</div>';
  list.scrollTop = list.scrollHeight;
}
document.getElementById('comment-send-btn').addEventListener('click', sendComment);
document.getElementById('comment-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendComment(); });
async function sendComment() {
  const input = document.getElementById('comment-input');
  const text = clampLength(input.value.trim(), 200);
  if (!text) return;
  if (!rateLimiter.allow('comment', 5, 10_000)) { toast('ببطء أكثر 🙂'); return; }
  input.value = '';
  const me = LocalDB.getMe();
  try {
    if (sb) await SupaDB.addComment(activePostId, me.id, text);
    else LocalDB.addComment(activePostId, text);
  } catch (e) { console.error(e); toast('تعذّر إرسال التعليق'); return; }
  const card = feedContainer.querySelector(`[data-post-id="${CSS.escape(activePostId)}"]`);
  const cc = card?.querySelector('.comment-count');
  if (cc) cc.textContent = formatCount(parseCount(cc.textContent) + 1);
  renderComments();
}
document.querySelectorAll('#comments-modal .sheet-handle, #comments-modal').forEach(el => {});
commentsModal.addEventListener('click', (e) => { if (e.target === commentsModal) commentsModal.classList.remove('open'); });

/* ============================================================
   6) المشاركة
============================================================ */
let shareTargetId = null;
const shareModal = document.getElementById('share-modal');
const SHARE_TARGETS = [
  { id: 'copy', label: 'نسخ الرابط', icon: '🔗' },
  { id: 'whatsapp', label: 'واتساب', icon: '💬' },
  { id: 'telegram', label: 'تيليجرام', icon: '✈️' },
  { id: 'twitter', label: 'X', icon: '𝕏' },
  { id: 'native', label: 'المزيد', icon: '⋯' },
];
function openShare(postId) {
  const post = currentPosts.find(p => p.id === postId);
  if (post && post.allow_share === false) { toast('المشاركة مغلقة لهذا الفيديو'); return; }
  shareTargetId = postId;
  const grid = document.getElementById('share-grid');
  grid.innerHTML = SHARE_TARGETS.map(t => `<button class="share-item" data-share="${t.id}"><span class="share-icon">${t.icon}</span>${escapeHtml(t.label)}</button>`).join('');
  shareModal.classList.add('open');
}
document.getElementById('share-grid').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-share]'); if (!btn) return;
  const url = `${location.origin}${location.pathname}#post=${encodeURIComponent(shareTargetId)}`;
  const kind = btn.dataset.share;
  if (kind === 'copy') { await navigator.clipboard.writeText(url).catch(() => {}); toast('تم نسخ الرابط'); }
  else if (kind === 'whatsapp') window.open('https://wa.me/?text=' + encodeURIComponent(url), '_blank', 'noopener');
  else if (kind === 'telegram') window.open('https://t.me/share/url?url=' + encodeURIComponent(url), '_blank', 'noopener');
  else if (kind === 'twitter') window.open('https://twitter.com/intent/tweet?url=' + encodeURIComponent(url), '_blank', 'noopener');
  else if (kind === 'native' && navigator.share) { navigator.share({ url }).catch(() => {}); }
  else { await navigator.clipboard.writeText(url).catch(() => {}); toast('تم نسخ الرابط'); }
  if (sb) { /* يمكن هنا استدعاء دالة RPC لزيادة عداد المشاركة في قاعدة البيانات */ }
  else LocalDB.incShare(shareTargetId);
  const card = feedContainer.querySelector(`[data-post-id="${CSS.escape(shareTargetId)}"]`);
  const sc = card?.querySelector('.share-count');
  if (sc) sc.textContent = formatCount(parseCount(sc.textContent) + 1);
  shareModal.classList.remove('open');
});
document.getElementById('close-share-btn').addEventListener('click', () => shareModal.classList.remove('open'));
shareModal.addEventListener('click', (e) => { if (e.target === shareModal) shareModal.classList.remove('open'); });

/* ============================================================
   7) اكتشف: هاشتاقات، تحديات، اقتراحات، بحث
============================================================ */
function renderDiscover() {
  document.getElementById('trending-list').innerHTML = LocalDB.listHashtags()
    .map(h => `<div class="trending-item"><span class="hashtag">${escapeHtml(h.tag)}</span><strong>${escapeHtml(h.views)} مشاهدة</strong></div>`).join('');
  document.getElementById('challenges-list').innerHTML = LocalDB.listChallenges()
    .map(c => `<div class="challenge-item"><div><b>${escapeHtml(c.title)}</b><div class="challenge-sub">${escapeHtml(c.tag)} · ${escapeHtml(c.ends)}</div></div><div class="challenge-prize">🏆 ${formatCount(c.prize)}</div></div>`).join('');
  document.getElementById('suggested-users').innerHTML = LocalDB.listSuggested()
    .map(u => `<div class="suggested-item"><span>@${escapeHtml(u)}</span><button class="follow-btn" data-user="${escapeHtml(u)}">متابعة</button></div>`).join('');
}
document.getElementById('suggested-users').addEventListener('click', (e) => {
  const btn = e.target.closest('.follow-btn'); if (!btn) return;
  btn.textContent = btn.textContent === 'متابعة' ? 'إلغاء المتابعة' : 'متابعة';
  toast(btn.textContent === 'إلغاء المتابعة' ? `تمت متابعة @${btn.dataset.user}` : 'تم إلغاء المتابعة');
});

const searchInput = document.getElementById('search-input');
let searchDebounce = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  const q = clampLength(searchInput.value, 60);
  if (!q) { document.getElementById('search-results').style.display = 'none'; return; }
  searchDebounce = setTimeout(() => runSearch(q), 250); // debounce = تقليل الحمل وسوء الاستخدام
});
function runSearch(q) {
  if (!rateLimiter.allow('search', 15, 10_000)) return;
  const results = LocalDB.search(q);
  const box = document.getElementById('search-results');
  box.style.display = 'block';
  box.innerHTML = '<div class="trending-title">نتائج البحث</div>' + (results.length
    ? results.map(r => r.type === 'tag'
        ? `<div class="trending-item"><span class="hashtag">${escapeHtml(r.value)}</span></div>`
        : `<div class="suggested-item"><span>@${escapeHtml(r.value)}</span></div>`).join('')
    : '<div class="empty-hint">لا نتائج مطابقة</div>');
}

/* ============================================================
   8) رفع فيديو
============================================================ */
const videoPicker = document.getElementById('video-picker');
document.getElementById('open-picker-btn').addEventListener('click', () => videoPicker.click());
let pickedFile = null;
videoPicker.addEventListener('change', (e) => {
  const file = e.target.files[0]; if (!file) return;
  if (file.size > 200 * 1024 * 1024) { toast('الحجم كبير جداً (الحد 200MB)'); return; } // حد أعلى يمنع استهلاك موارد مفرط
  if (!file.type.startsWith('video/')) { toast('الرجاء اختيار ملف فيديو صالح'); return; }
  pickedFile = file;
  document.getElementById('upload-empty').style.display = 'none';
  const editor = document.getElementById('upload-editor'); editor.style.display = 'flex';
  const preview = document.getElementById('upload-preview');
  preview.src = URL.createObjectURL(file);
  preview.play().catch(() => {});
});
document.getElementById('discard-upload-btn').addEventListener('click', resetUpload);
function resetUpload() {
  pickedFile = null; videoPicker.value = '';
  document.getElementById('upload-caption').value = '';
  document.getElementById('upload-editor').style.display = 'none';
  document.getElementById('upload-empty').style.display = 'flex';
}
document.getElementById('publish-btn').addEventListener('click', async () => {
  if (!pickedFile) return;
  if (!rateLimiter.allow('publish', 5, 60_000)) { toast('انتظر قليلاً قبل نشر فيديو آخر'); return; }
  const caption = clampLength(document.getElementById('upload-caption').value.trim(), 150);
  const allowComments = document.getElementById('allow-comments').checked;
  const allowShare = document.getElementById('allow-share').checked;
  const me = LocalDB.getMe();
  const btn = document.getElementById('publish-btn'); btn.disabled = true; btn.textContent = 'جاري النشر...';
  try {
    let videoUrl;
    if (sb) {
      const path = `${me.id}/${secureId()}.mp4`;
      const { error: upErr } = await sb.storage.from('videos').upload(path, pickedFile, { contentType: pickedFile.type });
      if (upErr) throw upErr;
      videoUrl = sb.storage.from('videos').getPublicUrl(path).data.publicUrl;
      const { error: insErr } = await sb.from('posts').insert({
        user_id: me.id, video_url: videoUrl, caption, allow_comments: allowComments, allow_share: allowShare,
      });
      if (insErr) throw insErr;
    } else {
      videoUrl = URL.createObjectURL(pickedFile); // في الوضع المحلي فقط: رابط مؤقت بالجهاز نفسه
      LocalDB.addPost({ user_id: me.id, user_name: me.username, video_url: videoUrl, caption, allow_comments: allowComments, allow_share: allowShare });
    }
    toast('تم النشر بنجاح 🎉');
    resetUpload();
    goToTab('home');
    loadFeed();
  } catch (e) {
    console.error(e); toast('تعذّر النشر، حاول لاحقاً');
  } finally {
    btn.disabled = false; btn.textContent = 'نشر';
  }
});

/* ============================================================
   9) الرسائل: إشعارات + محادثات + دردشة جماعية
============================================================ */
document.querySelectorAll('.inbox-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.inbox-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.inbox-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.inbox).classList.add('active');
  });
});

function renderInbox() {
  renderNotifications();
  renderDMs();
  renderGroupChat();
  document.getElementById('inbox-badge').style.display = 'none';
}
function renderNotifications() {
  const items = LocalDB.listNotifications();
  document.getElementById('notifications-list').innerHTML = items.length
    ? items.map(n => `<div class="notif-row ${n.read ? '' : 'unread'}"><span class="notif-icon">${notifIcon(n.type)}</span><span>${escapeHtml(n.text)}</span></div>`).join('')
    : '<div class="empty-hint">لا إشعارات بعد</div>';
}
function notifIcon(type) { return ({ like: '❤️', comment: '💬', follow: '➕', gift: '🎁', system: '🔔' })[type] || '🔔'; }
function renderDMs() {
  document.getElementById('dm-list').innerHTML = LocalDB.listSuggested().map(u => `
    <div class="dm-row">
      <div class="dm-avatar">👤</div>
      <div class="dm-body"><b>@${escapeHtml(u)}</b><p>اضغط لبدء محادثة خاصة...</p></div>
    </div>`).join('');
}

const chatBox = document.getElementById('chat-messages-container');
let groupChannel = null;
async function renderGroupChat() {
  let msgs = [];
  try { msgs = sb ? await SupaDB.listGroupMessages() : LocalDB.listGroupMessages(); }
  catch (e) { console.error(e); msgs = LocalDB.listGroupMessages(); }
  paintGroupChat(msgs);
  if (sb && !groupChannel) {
    groupChannel = SupaDB.subscribeGroupMessages((row) => { msgs.push(row); paintGroupChat(msgs); });
  }
}
function paintGroupChat(msgs) {
  const me = LocalDB.getMe();
  chatBox.innerHTML = msgs.length ? msgs.map(m => `
    <div class="message-bubble ${m.user_name === me.username ? 'my-msg' : ''}">
      <div class="msg-user">${escapeHtml(m.user_name)}</div>
      <div class="msg-text">${escapeHtml(m.text || m.message_text)}</div>
    </div>`).join('') : '<div class="empty-hint">لا رسائل بعد — ابدأ الحديث 👋</div>';
  chatBox.scrollTop = chatBox.scrollHeight;
}
document.getElementById('chat-send-btn').addEventListener('click', sendGroupMessage);
document.getElementById('chat-input-field').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendGroupMessage(); });
async function sendGroupMessage() {
  const input = document.getElementById('chat-input-field');
  const text = clampLength(input.value.trim(), 300);
  if (!text) return;
  if (!rateLimiter.allow('groupchat', 8, 10_000)) { toast('أنت ترسل بسرعة كبيرة، انتظر قليلاً'); return; }
  input.value = '';
  const me = LocalDB.getMe();
  try {
    if (sb) await SupaDB.addGroupMessage(me.id, me.username, text);
    else { LocalDB.addGroupMessage(text); renderGroupChat(); }
  } catch (e) { console.error(e); toast('تعذّر إرسال الرسالة'); }
}

/* ============================================================
   10) الملف الشخصي
============================================================ */
function renderProfile() {
  const me = LocalDB.getMe();
  document.getElementById('display-name').textContent = me.full_name;
  document.getElementById('display-handle').textContent = '@' + me.username;
  document.getElementById('display-bio').textContent = me.bio || '';
  document.getElementById('stat-following').querySelector('strong').textContent = formatCount((me.following || []).length);
  document.getElementById('stat-followers').querySelector('strong').textContent = formatCount(me.followers_count || 0);
  document.getElementById('stat-likes').querySelector('strong').textContent = formatCount(me.likes_count || 0);
  document.getElementById('stat-coins').querySelector('strong').textContent = formatCount(me.coins || 0);
  const pic = document.getElementById('display-profile-pic');
  const safePic = sanitizeUrl(me.avatar_url);
  pic.style.backgroundImage = safePic ? `url('${safePic}')` : '';
  pic.textContent = safePic ? '' : '👤';

  const myPosts = LocalDB.listPosts().filter(p => p.user_id === me.id || p.user_name === me.username);
  document.getElementById('profile-grid-videos').innerHTML = myPosts.length
    ? myPosts.map(() => `<div class="grid-item">🎥</div>`).join('')
    : '<div class="empty-hint">لا فيديوهات بعد — انشر أول فيديو لك</div>';
  const likedPosts = LocalDB.listPosts().filter(p => (p.likes || []).includes(me.id));
  document.getElementById('profile-grid-liked').innerHTML = likedPosts.length
    ? likedPosts.map(() => `<div class="grid-item">❤️</div>`).join('')
    : '<div class="empty-hint">لا إعجابات بعد</div>';
}
document.querySelectorAll('.profile-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const isVideos = tab.dataset.ptab === 'videos';
    document.getElementById('profile-grid-videos').style.display = isVideos ? 'grid' : 'none';
    document.getElementById('profile-grid-liked').style.display = isVideos ? 'none' : 'grid';
  });
});

const editModal = document.getElementById('edit-modal');
document.getElementById('edit-profile-open').addEventListener('click', () => {
  const me = LocalDB.getMe();
  document.getElementById('input-name').value = me.full_name;
  document.getElementById('input-handle').value = me.username;
  document.getElementById('input-bio').value = me.bio || '';
  document.getElementById('input-pic').value = me.avatar_url || '';
  editModal.classList.add('open');
});
document.getElementById('close-edit-btn').addEventListener('click', () => editModal.classList.remove('open'));
document.getElementById('save-profile-btn').addEventListener('click', async () => {
  const name = clampLength(document.getElementById('input-name').value.trim(), 30);
  const handle = clampLength(document.getElementById('input-handle').value.trim().toLowerCase(), 20);
  const bio = clampLength(document.getElementById('input-bio').value.trim(), 80);
  const pic = sanitizeUrl(document.getElementById('input-pic').value.trim()) || document.getElementById('input-pic').value.trim();
  if (!name || !isValidHandle(handle)) { toast('اسم مستخدم غير صالح (3-20 حرف/رقم)'); return; }
  if (sb) {
    const me = LocalDB.getMe();
    const { error } = await sb.from('profiles').update({ full_name: name, username: handle, bio, avatar_url: pic }).eq('id', me.id);
    if (error) { toast('تعذّر الحفظ: اسم المستخدم قد يكون محجوزاً'); return; }
  }
  LocalDB.saveMe({ full_name: name, username: handle, bio, avatar_url: pic });
  renderProfile();
  editModal.classList.remove('open');
  toast('تم حفظ التعديلات');
});
document.getElementById('close-wallet-btn').addEventListener('click', () => document.getElementById('wallet-modal').classList.remove('open'));

/* ============================================================
   11) المحفظة (رصيد عملات — للاختبار فقط، راجع README لدمج دفع حقيقي)
============================================================ */
const COIN_PACKS = [
  { coins: 100, label: 'عبوة صغيرة' }, { coins: 500, label: 'عبوة متوسطة' },
  { coins: 2000, label: 'عبوة كبيرة' }, { coins: 10000, label: 'عبوة VIP' },
];
document.getElementById('wallet-btn').addEventListener('click', () => {
  document.getElementById('wallet-coin-balance').textContent = formatCount(LocalDB.getMe().coins);
  document.getElementById('wallet-packs').innerHTML = COIN_PACKS.map(p => `
    <button class="wallet-pack" data-coins="${p.coins}">
      <div>💰 ${formatCount(p.coins)}</div><div class="wallet-pack-label">${escapeHtml(p.label)}</div>
    </button>`).join('') + `<p class="wallet-note">⚠️ الشحن الحقيقي يتطلب ربط بوابة دفع (Stripe/Apple Pay) والتحقق من طرف الخادم — راجع README.</p>`;
  document.getElementById('wallet-modal').classList.add('open');
});
document.getElementById('wallet-packs').addEventListener('click', (e) => {
  const btn = e.target.closest('.wallet-pack'); if (!btn) return;
  const n = parseInt(btn.dataset.coins, 10);
  if (!isValidCoinAmount(n)) return;
  LocalDB.addCoins(n); // وضع تجريبي محلي فقط
  toast(`تمت إضافة ${formatCount(n)} عملة (وضع تجريبي)`);
  document.getElementById('wallet-coin-balance').textContent = formatCount(LocalDB.getMe().coins);
  renderProfile();
});

/* ============================================================
   12) البث المباشر + الهدايا
============================================================ */
document.querySelectorAll('.live-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => document.querySelectorAll('.live-mode-btn').forEach(b => b.classList.toggle('selected', b === btn)));
});
document.getElementById('start-live-btn').addEventListener('click', async () => {
  const selected = document.querySelector('.live-mode-btn.selected');
  const mode = selected ? selected.dataset.mode : 'video';
  const title = clampLength(document.getElementById('live-title-input').value.trim(), 60) || 'بث بدون عنوان';
  try {
    const videoEl = document.getElementById('live-local-video');
    const result = await JixLive.start(videoEl, mode, 'room_' + secureId());
    document.getElementById('live-setup').style.display = 'none';
    document.getElementById('live-room').style.display = 'block';
    document.getElementById('live-viewer-count').textContent = '1';
    if (!result.broadcasting) {
      toast('معاينة محلية فعلية — لتفعيل البث الحقيقي للمشاهدين اضبط مزوّداً في live-config.js');
    }
  } catch (e) {
    console.error(e); toast('تعذّر الوصول للكاميرا/المايك — تحقق من صلاحيات المتصفح');
  }
});
document.getElementById('end-live-btn').addEventListener('click', () => {
  JixLive.stop();
  document.getElementById('live-room').style.display = 'none';
  document.getElementById('live-setup').style.display = 'block';
});

const giftsModal = document.getElementById('gifts-modal');
function renderGiftsGrid() {
  document.getElementById('gift-coin-balance').textContent = formatCount(LocalDB.getMe().coins);
  document.getElementById('gifts-grid').innerHTML = JIX_GIFTS.map(g => `
    <button class="gift-item tier-${g.tier}" data-gift="${g.id}">
      <div class="gift-icon">${g.icon}</div>
      <div class="gift-name">${escapeHtml(g.name)}</div>
      <div class="gift-price">💰 ${formatCount(g.price)}</div>
    </button>`).join('');
}
document.getElementById('live-gift-open').addEventListener('click', () => { renderGiftsGrid(); giftsModal.classList.add('open'); });
document.getElementById('close-gifts-btn').addEventListener('click', () => giftsModal.classList.remove('open'));
giftsModal.addEventListener('click', (e) => { if (e.target === giftsModal) giftsModal.classList.remove('open'); });
document.getElementById('gifts-grid').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-gift]'); if (!btn) return;
  const gift = JIX_GIFTS.find(g => g.id === btn.dataset.gift); if (!gift) return;
  if (!rateLimiter.allow('gift', 10, 10_000)) { toast('ببطء أكثر 🙂'); return; }
  const ok = LocalDB.spendCoins(gift.price);
  if (!ok) { toast('رصيدك غير كافٍ — افتح المحفظة لإضافة عملات'); return; }
  JixFX.celebrate(document.getElementById('live-gift-feed'), gift);
  const feed = document.getElementById('live-gift-feed');
  const row = document.createElement('div'); row.className = 'gift-log-row';
  row.textContent = `أرسل @${LocalDB.getMe().username} هدية ${gift.name} ${gift.icon}`;
  feed.appendChild(row);
  document.getElementById('gift-coin-balance').textContent = formatCount(LocalDB.getMe().coins);
});

/* ============================================================
   13) المصادقة (Auth) — دخول برمز بريد إلكتروني (بدون كلمات مرور مخزّنة)
============================================================ */
const authModal = document.getElementById('auth-modal');
document.getElementById('auth-send-btn').addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  if (!isValidEmail(email)) { toast('بريد إلكتروني غير صالح'); return; }
  if (!rateLimiter.allow('auth', 3, 60_000)) { toast('حاول مرة أخرى بعد قليل'); return; }
  if (!sb) { toast('الوضع التجريبي المحلي لا يحتاج تسجيل دخول حقيقي'); return; }
  const { error } = await sb.auth.signInWithOtp({ email });
  if (error) { toast('تعذّر إرسال الرمز'); return; }
  document.getElementById('auth-otp-group').style.display = 'block';
  toast('تم إرسال رمز الدخول إلى بريدك');
});
document.getElementById('auth-verify-btn').addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const token = document.getElementById('auth-otp').value.trim();
  if (!/^\d{4,6}$/.test(token)) { toast('رمز غير صالح'); return; }
  const { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
  if (error) { toast('رمز غير صحيح أو منتهي'); return; }
  authModal.classList.remove('open');
  toast('تم تسجيل الدخول');
  init();
});
document.getElementById('auth-guest-btn').addEventListener('click', () => {
  authModal.classList.remove('open');
});

/* ============================================================
   14) البدء
============================================================ */
async function init() {
  if (!sb) {
    // وضع محلي: لا حاجة لتسجيل دخول، لكن نعرض ترحيباً بسيطاً أول مرة فقط
    if (!safeStorage.get('seen_welcome')) { safeStorage.set('seen_welcome', true); toast('مرحباً بك — أنت الآن بوضع تجريبي محلي كامل الميزات'); }
  } else {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) authModal.classList.add('open');
  }
  await loadFeed();
  renderProfile();
}
init();
// ========================================================
// 🛡️ نظام حماية JIX المتكامل (ذكاء اصطناعي + بلاغات المستخدمين)
// ========================================================

// ⚠️ ضع مفاتيحك الخاصة التي نسختها من موقع Sightengine هنا بين علامات التنصيص
const SIGHTENGINE_USER = '478295387';
const SIGHTENGINE_SECRET = 'qDYGumGbULyBrUmaHTMUzRVQWqiizW2J';

/**
 * 🤖 1. دالة فحص الفيديو بالذكاء الاصطناعي فور الرفع
 * تمنع ظهور أي فيديو مخالف في التطبيق وتحذفه تلقائياً من السيرفر
 */
async function checkVideoWithAI(videoUrl, postId) {
    try {
        // إرسال رابط الفيديو السحابي إلى سيل الذكاء الاصطناعي لـ Sightengine لفحصه
        const response = await fetch(`https://sightengine.com{encodeURIComponent(videoUrl)}&models=nudity-2.0,wad,gore&api_user=${SIGHTENGINE_USER}&api_secret=${SIGHTENGINE_SECRET}`);
        const result = await response.json();

        if (result.status === 'success') {
            const isNudity = result.summary?.nudity > 0.4; // فحص اللقطات غير الأخلاقية (أعلى من 40%)
            const isViolence = result.summary?.wad > 0.4;  // فحص الأسلحة والعنف (أعلى من 40%)
            const isGore = result.summary?.gore > 0.4;      // فحص الدماء والمشاهد القاسية (أعلى من 40%)

            if (isNudity || isViolence || isGore) {
                // 🚫 إذا ثبتت المخالفة، يتم حذف المنشور فوراً من قاعدة البيانات لحماية المجتمع
                await sb.from('posts').delete().eq('id', postId);
                
                // حذف ملف الفيديو الفيزيائي من الـ Storage لحفظ مساحة مشروعك
                const fileName = videoUrl.split('/').pop();
                await sb.storage.from('videos').remove([fileName]);

                alert("🚨 حظر تلقائي: تم رفض ونشر الفيديو وحذفه فوراً بواسطة الذكاء الاصطناعي لمخالفته معايير الأمان والعنف.");
                return false;
            }
        }
        return true; // الفيديو سليم وآمن تماماً للمشاهدة
    } catch (error) {
        console.error("خطأ أثناء فحص الذكاء الاصطناعي:", error);
        return true; // نمرر الفيديو لتجنب تعطيل التطبيق في حال حدوث بطء في خدمة الفحص خارجية
    }
}

/**
 * 👥 2. دالة تمكين المستخدمين من التبليغ اليدوي عن فيديو سيئ
 * تضع حلاً مجتمعياً يتيح للمشاهدين حماية التطبيق بيدك
 */
async function reportPost(postId) {
    const confirmReport = confirm("هل تود التبليغ عن هذا الفيديو بسبب محتوى عنيف أو غير أخلاقي؟");
    if (!confirmReport) return;

    const sessionData = await sb.auth.getSession();
    const currentUserId = sessionData.data.session?.user?.id;

    if (!currentUserId) {
        alert("يرجى تسجيل الدخول أولاً لتتمكن من التبليغ!");
        return;
    }

    // تسجيل البلاغ في جدول الإشعارات داخل قاعدة بيانات سوبابيز كـ 'report'
    const { error } = await sb.from('notifications').insert([
        { 
            user_id: currentUserId,
            type: 'report',
            post_id: postId,
            message: 'أبلغ مستخدم عن هذا الفيديو كمحتوى مخالف لقواعد مجتمع JIX.'
        }
    ]);

    if (error) {
        alert("تعذر إرسال البلاغ حالياً، يرجى المحاولة لاحقاً.");
        return;
    }

    alert("شكرًا لك على حرصك! تم استلام بلاغك بنجاح، وجاري التحقق من محتوى الفيديو.");
    
    // تشغيل فحص البلاغات؛ إذا تكرر البلاغ 3 مرات من أشخاص مختلفين يتم الحظر تلقائياً
    checkReportThreshold(postId);
}

/**
 * ⚙️ 3. دالة التحقق من وصول البلاغات للحد الأقصى (3 بلاغات) واختفاء الفيديو
 */
async function checkReportThreshold(postId) {
    const { count, error } = await sb
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('type', 'report');

    if (!error && count >= 3) {
        // حذف الفيديو نهائياً من قاعدة البيانات بعد تكرار شكاوى المستخدمين
        await sb.from('posts').delete().eq('id', postId);
        alert("تم إخفاء وحذف هذا المنشور تلقائياً بعد مراجعته وحصوله على بلاغات متعددة لحماية المشاهدين.");
        location.reload(); // تحديث واجهة التطبيق لإخفاء الفيديو فوراً من الشاشة
    }
}
