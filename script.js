const API_BASE = '/api';

const authSection = document.getElementById('auth-section');
const playerSection = document.getElementById('player-section');
const errorSection = document.getElementById('error-section');

const loginBtn = document.getElementById('login-btn');
const albumCover = document.getElementById('album-cover');
const trackName = document.getElementById('track-name');
const artistName = document.getElementById('artist-name');
const progressFill = document.getElementById('progress-fill');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const statusEl = document.getElementById('status');

let pollInterval = null;
const POLL_MS = 2000;

function formatTime(ms) {
  if (!ms) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function showError() {
  authSection.classList.add('hidden');
  playerSection.classList.add('hidden');
  errorSection.classList.remove('hidden');
}

function showPlayer() {
  authSection.classList.add('hidden');
  errorSection.classList.add('hidden');
  playerSection.classList.remove('hidden');
}

function updateUI(data) {
  if (!data || !data.item) {
    statusEl.textContent = '未播放';
    progressFill.style.width = '0%';
    trackName.textContent = '—';
    artistName.textContent = '—';
    albumCover.src = '';
    return;
  }

  const item = data.item;
  const isPlaying = data.is_playing;
  const progress = data.progress_ms;
  const duration = item.duration_ms;

  trackName.textContent = item.name;
  artistName.textContent = item.artists.map(a => a.name).join(', ');
  albumCover.src = item.album.images[0]?.url;
  albumCover.alt = `${item.album.name} cover`;

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  progressFill.style.width = `${pct}%`;

  currentTimeEl.textContent = formatTime(progress);
  totalTimeEl.textContent = formatTime(duration);

  statusEl.textContent = isPlaying ? '正在播放 ▶️' : '已暂停 ⏸️';
}

async function fetchNowPlaying() {
  try {
    const res = await fetch(`${API_BASE}/now-playing`);
    if (res.status === 204) {
      updateUI(null);
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    updateUI(data);
  } catch (e) {
    console.error('Poll error:', e);
    if (pollInterval) clearInterval(pollInterval);
    showError();
  }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  fetchNowPlaying(); // immediate
  pollInterval = setInterval(fetchNowPlaying, POLL_MS);
}

loginBtn.addEventListener('click', () => {
  window.location.href = `${API_BASE}/login`;
});

(async () => {
  const hasToken = await fetch(`${API_BASE}/has-token`).then(r => r.json()).then(d => d.hasToken).catch(() => false);
  if (hasToken) {
    authSection.classList.add('hidden');
    showPlayer();
    startPolling();
  }
})();