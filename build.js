const fs = require('fs');
const path = require('path');
const https = require('https');

// 配置
const PLAYLIST_ID = '75OLnwx0I1L2RKnHItDz3R';
// 完整邀请链接
const PLAYLIST_URL = 'https://open.spotify.com/playlist/75OLnwx0I1L2RKnHItDz3R?si=5b566a7afa824a22&pt=94c93bc8c9fcbd6c1c5f2b58261a0fe4';
const TEMPLATE_PATH = path.join(__dirname, 'index.template.html');
const OUTPUT_PATH = path.join(__dirname, 'index.html');

// 获取歌单信息
function fetchPlaylistInfo() {
  const url = `https://open.spotify.com/oembed?url=spotify:playlist:${PLAYLIST_ID}&format=json`;
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
        try {
          const json = JSON.parse(data);
          console.log('Fetched info:', {
            title: json.title,
            author: json.author_name,
            thumbnail: json.thumbnail_url,
          });
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 替换模板占位符
function renderTemplate(template, info) {
  const title = info.title || '歌单';
  const author = info.author_name || 'Spotify';
  const thumbnail = info.thumbnail_url || '';
  const result = template
    .replace(/\{\{OG_TITLE\}\}/g, title)
    .replace(/\{\{OG_DESCRIPTION\}\}/g, `Listen to ${title} by ${author} on Spotify.`)
    .replace(/\{\{OG_IMAGE\}\}/g, thumbnail)
    .replace(/\{\{OG_URL\}\}/g, PLAYLIST_URL)  // 使用完整邀请链接
    .replace(/\{\{TITLE\}\}/g, title)
    .replace(/\{\{AUTHOR\}\}/g, author)
    .replace(/\{\{COVER\}\}/g, thumbnail);
  console.log('Replaced COVER with:', thumbnail);
  return result;
}

// 主流程
(async () => {
  try {
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    const info = await fetchPlaylistInfo();
    const rendered = renderTemplate(template, info);
    fs.writeFileSync(OUTPUT_PATH, rendered, 'utf-8');
    console.log(`✅ Built index.html with playlist info: ${info.title}`);
  } catch (e) {
    console.error('❌ Build failed:', e);
    process.exit(1);
  }
})();
