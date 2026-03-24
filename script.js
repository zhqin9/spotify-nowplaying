const LASTFM_USER = 'opentree';
const LASTFM_API_KEY = '95db05848ac514f31444587178d7bfa3';
const POLL_MS = 10000;

const statusEl = document.getElementById('status');
const playerEl = document.getElementById('player');
const errorEl = document.getElementById('error');
const albumCover = document.getElementById('album-cover');
const trackName = document.getElementById('track-name');
const artistName = document.getElementById('artist-name');
const albumName = document.getElementById('album-name');
const nowPlayingEl = document.getElementById('now-playing-indicator');

let pollInterval = null;

function showError(msg) {
  statusEl.classList.add('hidden');
  playerEl.classList.add('hidden');
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
}

function showPlayer() {
  statusEl.classList.add('hidden');
  errorEl.classList.add('hidden');
  playerEl.classList.remove('hidden');
}

function updateUI(track) {
  if (!track) {
    statusEl.textContent = '当前未播放';
    playerEl.classList.add('hidden');
    statusEl.classList.remove('hidden');
    return;
  }

  showPlayer();
  trackName.textContent = track.name;
  artistName.textContent = track.artist['#text'];
  albumName.textContent = track.album['#text'];

  const images = track.image || [];
  const img = images.find(i => i.size === 'large' || i.size === 'extralarge') || images[0];
  if (img) {
    albumCover.src = img['#text'];
    albumCover.alt = `${track.album['#text']} cover`;
  } else {
    albumCover.src = '';
  }

  nowPlayingEl.style.display = track['@attr']?.nowplaying === 'true' ? 'block' : 'none';
}

async function fetchNowPlaying() {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USER}&api_key=${LASTFM_API_KEY}&format=json&limit=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const track = data.recenttracks?.track?.[0];
    updateUI(track);
  } catch (e) {
    console.error('Poll error:', e);
    if (pollInterval) clearInterval(pollInterval);
    showError(e.message);
  }
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  fetchNowPlaying();
  pollInterval = setInterval(fetchNowPlaying, POLL_MS);
}

window.addEventListener('load', startPolling);