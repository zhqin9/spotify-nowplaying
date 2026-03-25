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
let lastImageUrl = ''; // 记录上一张封面 URL，避免重复提取

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

// 从图片 URL 提取主色调（返回 {r,g,b} 或 null）
async function extractDominantColor(imgUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);
        const data = ctx.getImageData(0, 0, 50, 50).data;

        let bestR, bestG, bestB;
        let maxSat = -1;
        let hasRed = false;

        // 第一遍：找红色优先（避开太亮/太暗）
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const max = Math.max(r, g, b);
          if (max < 40 || max > 230) continue; // 过滤太暗和太亮（接近白）
          const min = Math.min(r, g, b);
          const sat = (max - min) / max;
          
          // 判断是否是红色/红橙色（r 显著高于 g 和 b）
          const isReddish = r > 120 && r > g * 1.3 && r > b * 1.2;
          
          if (isReddish && sat > 0.3) {
            // 找到红色，记录其饱和度
            if (sat > maxSat) {
              maxSat = sat;
              bestR = r; bestG = g; bestB = b;
              hasRed = true;
            }
          }
        }

        // 如果没找到红色或红色饱和太低，再找全局最高饱和度（避开黄色）
        if (!hasRed) {
          maxSat = -1;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i+1], b = data[i+2];
            const max = Math.max(r, g, b);
            if (max < 40 || max > 230) continue; // 过滤太暗和太亮（接近白）
            const min = Math.min(r, g, b);
            const sat = (max - min) / max;
            
            // 避开黄色：r 和 g 都高且接近，b 明显低
            const isYellow = r > 180 && g > 180 && b < 100 && Math.abs(r - g) < 40;
            
            if (!isYellow && sat > maxSat) {
              maxSat = sat;
              bestR = r; bestG = g; bestB = b;
            }
          }
        }

        if (bestR !== undefined) {
          resolve({ r: bestR, g: bestG, b: bestB });
        } else {
          // 回退：取平均色
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i]; g += data[i+1]; b += data[i+2];
            count++;
          }
          resolve({ r: Math.floor(r/count), g: Math.floor(g/count), b: Math.floor(b/count) });
        }
      } catch (e) {
        console.warn('Color extraction failed:', e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imgUrl;
  });
}

// 根据主色生成平滑渐变背景（忠实于封面调性，轻微的竖直渐变）
function applyGradientBackground({ r, g, b }) {
  // 渐变：主色 → 轻微变暗（只做小幅度变化）
  document.body.style.background = `linear-gradient(180deg, 
    rgb(${r},${g},${b}) 0%,
    rgb(${Math.floor(r*0.95)},${Math.floor(g*0.95)},${Math.floor(b*0.95)}) 70%,
    rgb(${Math.floor(r*0.9)},${Math.floor(g*0.9)},${Math.floor(b*0.9)}) 100%)`;
  document.body.style.transition = 'background 0.8s ease';
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
    // 强制替换尺寸为 990x990（高清）
    imgUrl = imgUrl.replace(/\/\d+x\d+\//, '/990x990/');
    
    // 检测是否为 Last.fm 默认占位图（没有专辑封面时返回）
    const isPlaceholder = imgUrl.includes('2a96cbd8b46e442fc41c2b86b821562f');
    if (isPlaceholder) {
      // 使用歌单封面
      imgUrl = playlistCoverEl.src;
    }
    
    // 提取主色并更新背景（仅当封面变化时）
    if (imgUrl !== lastImageUrl) {
      lastImageUrl = imgUrl;
      extractDominantColor(imgUrl).then(color => {
        if (color) applyGradientBackground(color);
      });
    }
    
    albumCover.src = imgUrl;
    albumCover.alt = `${track.album['#text']} cover`;
  } else {
    // fallback: 使用歌单封面
    albumCover.src = playlistCoverEl.src;
    albumCover.alt = `${track.album['#text']} cover (fallback)`;
    // 歌单封面也提取颜色（如果还没设过）
    if (playlistCoverEl.src && playlistCoverEl.src !== lastImageUrl) {
      lastImageUrl = playlistCoverEl.src;
      extractDominantColor(playlistCoverEl.src).then(color => {
        if (color) applyGradientBackground(color);
      });
    }
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