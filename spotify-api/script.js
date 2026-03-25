// ============================================
// Spotify API 配置 - 请在此处填入你的凭证
// ============================================
const SPOTIFY_CLIENT_ID = '80b8e6e51ab94f359502926388ae9ab7';
const SPOTIFY_REDIRECT_URI = window.location.origin + window.location.pathname; // 当前页面
const SCOPE = 'user-read-currently-playing user-read-playback-state';
const POLL_MS = 10000;

// ============================================
// 全局变量与DOM元素
// ============================================
const statusEl = document.getElementById('status');
const playerEl = document.getElementById('player');
const errorEl = document.getElementById('error');
const albumCover = document.getElementById('album-cover');
const trackName = document.getElementById('track-name');
const artistName = document.getElementById('artist-name');
const albumName = document.getElementById('album-name');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const statusIconEl = document.getElementById('status-icon');

const tokenKey = 'spotify_access_token';
let pollInterval = null;

// ============================================
// 辅助函数
// ============================================
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getAccessToken() {
  return localStorage.getItem(tokenKey);
}

function setAccessToken(token) {
  localStorage.setItem(tokenKey, token);
}

function removeAccessToken() {
  localStorage.removeItem(tokenKey);
}

function showError(msg) {
  statusEl.classList.add('hidden');
  playerEl.classList.add('hidden');
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
  if (loginBtn) loginBtn.classList.remove('hidden');
  if (logoutBtn) logoutBtn.classList.add('hidden');
  statusIconEl.className = 'status-icon paused';
}

function showPlayer() {
  statusEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  playerEl.classList.remove('hidden');
  if (loginBtn) loginBtn.classList.add('hidden');
  if (logoutBtn) logoutBtn.classList.remove('hidden');
}

function showLogin() {
  statusEl.classList.add('hidden');
  playerEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  if (loginBtn) loginBtn.classList.remove('hidden');
  if (logoutBtn) logoutBtn.classList.add('hidden');
}

function updateUI(track) {
  if (!track || !track.item) {
    statusEl.textContent = '当前未播放';
    playerEl.classList.add('hidden');
    statusEl.classList.remove('hidden');
    statusIconEl.className = 'status-icon paused';
    return;
  }

  showPlayer();
  const item = track.item;
  trackName.textContent = item.name;
  artistName.textContent = item.artists.map(a => a.name).join(', ');
  albumName.textContent = item.album.name;

  // 获取最高分辨率封面 (640x640 或 300x300)
  const images = item.album.images || [];
  const img = images.find(i => i.width === 640 && i.height === 640) ||
              images.find(i => i.width === 300 && i.height === 300) ||
              images[0];
  if (img) {
    albumCover.src = img.url;
    albumCover.alt = `${item.album.name} cover`;
  } else {
    albumCover.src = '';
  }

  const isPlaying = track.is_playing;
  statusIconEl.className = isPlaying ? 'status-icon playing' : 'status-icon paused';
}

// ============================================
// Spotify API 调用
// ============================================
async function fetchCurrentlyPlaying() {
  const token = getAccessToken();
  if (!token) {
    showLogin();
    return;
  }

  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (res.status === 204) {
      updateUI(null);
      return;
    }

    if (res.status === 401) {
      // token 过期或无效
      removeAccessToken();
      showError('登录已过期，请重新登录');
      return;
    }

    if (!res.ok) {
      throw new Error(`Spotify API error: ${res.status}`);
    }

    const data = await res.json();
    updateUI(data);
  } catch (e) {
    console.error('Fetch error:', e);
    showError(e.message);
  }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  fetchCurrentlyPlaying();
  pollInterval = setInterval(fetchCurrentlyPlaying, POLL_MS);
}

// ============================================
// 登录/登出流程
// ============================================
function initiateLogin() {
  const state = generateRandomString(16);
  localStorage.setItem('spotify_auth_state', state);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'token',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SCOPE,
    state: state,
    show_dialog: true
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function handleRedirect() {
  const hash = window.location.hash;
  if (!hash) return;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get('access_token');
  const state = params.get('state');
  const storedState = localStorage.getItem('spotify_auth_state');

  if (accessToken && state === storedState) {
    setAccessToken(accessToken);
    window.location.hash = ''; // 清除 hash
    showPlayer();
    startPolling();
  } else {
    showError('授权失败，请重试');
  }
}

function logout() {
  removeAccessToken();
  showLogin();
  if (pollInterval) clearInterval(pollInterval);
}

// ============================================
// 初始化
// ============================================
window.addEventListener('load', () => {
  // 绑定按钮事件
  if (loginBtn) loginBtn.addEventListener('click', initiateLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // 检查是否从 auth redirect 返回
  handleRedirect();

  // 如果有 token，开始轮询
  if (getAccessToken()) {
    startPolling();
  } else {
    showLogin();
  }
});
