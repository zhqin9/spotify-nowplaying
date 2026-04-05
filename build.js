const fs = require('fs');
const path = require('path');
const https = require('https');

// 配置
const PLAYLIST_ID = '75OLnwx0I1L2RKnHItDz3R';
// 完整邀请链接（OG 使用）
const PLAYLIST_URL = 'https://open.spotify.com/playlist/75OLnwx0I1L2RKnHItDz3R?si=9013196dfe444aa8&pt=e9a44114a87f46c9fb58215b41de1553';
const TEMPLATE_PATH = path.join(__dirname, 'index.template.html');
const OUTPUT_PATH = path.join(__dirname, 'index.html');

// 获取歌单信息
function fetchPlaylistInfo() {
  // 改为用完整歌单 URL 请求 oembed，而非 URI
  const targetUrl = `https://open.spotify.com/playlist/${PLAYLIST_ID}`;
  const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`;
  console.log(`[DEBUG] 请求 oembed URL: ${oembedUrl}`);

  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SpotiBuild/1.0; +https://github.com/zhqin9/spotify-nowplaying)',
        'Accept': 'application/json',
      },
    };
    https.get(oembedUrl, options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[DEBUG] 响应状态码: ${res.statusCode}`);
        console.log(`[DEBUG] 响应体前500字: ${data.slice(0, 500)}`);
        if (res.statusCode !== 200) {
          let errMsg = `HTTP ${res.statusCode}`;
          try {
            const errJson = JSON.parse(data);
            errMsg += ` - ${JSON.stringify(errJson)}`;
          } catch (_) {
            errMsg += ` - ${data}`;
          }
          return reject(new Error(errMsg));
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
          reject(new Error(`JSON parse failed: ${e.message}. Raw: ${data.slice(0, 200)}`));
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
