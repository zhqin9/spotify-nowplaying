const LASTFM_USER = 'opentree';
const LASTFM_API_KEY = '95db05848ac514f31444587178d7bfa3';
const PLAYLIST_ID = '44Xq0ZjwweqahmogY3gM5M';
const PLAYLIST_LINK_BASE = 'https://open.spotify.com/playlist/';
const POLL_MS = 10000;

const statusEl = document.getElementById('status');
const playerEl = document.getElementById('player');
const errorEl = document.getElementById('error');
const albumCover = document.getElementById('album-cover');
const trackName = document.getElementById('track-name');
const artistName = document.getElementById('artist-name');
const albumName = document.getElementById('album-name');

const playlistLinkEl = document.getElementById('playlist-link');
const playlistCoverEl = document.getElementById('playlist-cover');
const playlistTitleEl = document.getElementById('playlist-title');
const playlistAuthorEl = document.getElementById('playlist-author');

const statusIconEl = document.getElementById('status-icon');

let pollInterval = null;

async function fetchPlaylistInfo() {
  try {
    const url = `https://open.spotify.com/oembed?url=spotify:playlist:${PLAYLIST_ID}&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load playlist info (${res.status})`);
    const data = await res.json();
    document.title = data.title + ' - Now Playing';
    playlistTitleEl.textContent = data.title;
    playlistAuthorEl.textContent = data.author_name;
    if (data.thumbnail_url) {
      playlistCoverEl.src = data.thumbnail_url;
      playlistCoverEl.alt = `${data.title} cover`;
    }
    playlistLinkEl.href = PLAYLIST_LINK_BASE + PLAYLIST_ID;
  } catch (e) {
    console.warn('Playlist info fetch failed:', e);
    document.title = 'Now Playing';
    playlistTitleEl.textContent = '歌单';
    playlistAuthorEl.textContent = 'Spotify';
    playlistLinkEl.href = PLAYLIST_LINK_BASE + PLAYLIST_ID;
  }
}

function showError(msg) {
  statusEl.classList.add('hidden');
  playerEl.classList.add('hidden');
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
  statusIconEl.className = 'status-icon paused';
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
    statusIconEl.className = 'status-icon paused';
    return;
  }

  showPlayer();
  trackName.textContent = track.name;
  artistName.textContent = track.artist['#text'];
  albumName.textContent = track.album['#text'];

  const images = track.image || [];
  // 按分辨率优先级选择：mega > extralarge > large > medium > small > 任意
  const img = images.find(i => i.size === 'mega') ||
              images.find(i => i.size === 'extralarge') ||
              images.find(i => i.size === 'large') ||
              images.find(i => i.size === 'medium') ||
              images.find(i => i.size === 'small') ||
              images[0];
  if (img) {
    let imgUrl = img['#text'];
    // 强制替换尺寸为 999x999（高清）
    imgUrl = imgUrl.replace(/\/\d+x\d+\//, '/999x999/');
    albumCover.src = imgUrl;
    albumCover.alt = `${track.album['#text']} cover (999x999)`;
  } else {
    // fallback: 使用歌单封面
    albumCover.src = playlistCoverEl.src;
    albumCover.alt = `${track.album['#text']} cover (fallback)`;
  }

  const isNowPlaying = track['@attr']?.nowplaying === 'true';
  statusIconEl.className = isNowPlaying ? 'status-icon playing' : 'status-icon paused';
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

window.addEventListener('load', () => {
  fetchPlaylistInfo().then(startPolling);
});