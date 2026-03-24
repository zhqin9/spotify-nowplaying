const fs = require('fs');
const path = require('path');
const https = require('https');

// 配置
const PLAYLIST_ID = '44Xq0ZjwweqahmogY3gM5M';
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
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 替换模板占位符
function renderTemplate(template, info) {
  return template
    .replace(/\{\{OG_TITLE\}\}/g, info.title)
    .replace(/\{\{OG_DESCRIPTION\}\}/g, `Listen to ${info.title} by ${info.author_name} on Spotify.`)
    .replace(/\{\{OG_IMAGE\}\}/g, info.thumbnail_url)
    .replace(/\{\{OG_URL\}\}/g, `https://open.spotify.com/playlist/${PLAYLIST_ID}`)
    .replace(/\{\{TITLE\}\}/g, info.title)
    .replace(/\{\{AUTHOR\}\}/g, info.author_name)
    .replace(/\{\{COVER\}\}/g, info.thumbnail_url);
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