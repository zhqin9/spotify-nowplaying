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
const nowPlayingEl = document.getElementById('now-playing-indicator');

const playlistLinkEl = document.getElementById('playlist-link');
const playlistCoverEl = document.getElementById('playlist-cover');
const playlistTitleEl = document.getElementById('playlist-title');
const playlistAuthorEl = document.getElementById('playlist-author');

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
    // 动态设置跳转链接
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

window.addEventListener('load', () => {
  fetchPlaylistInfo().then(startPolling);
});