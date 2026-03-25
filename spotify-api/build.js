// Spotify API 方案的构建脚本
// 功能：从 Spotify oEmbed 获取歌单信息，生成最终 HTML

const PLAYLIST_ID = '44Xq0ZjwweqahmogY3gM5M'; // 你的歌单 ID
const fs = require('fs');
const path = require('path');

async function fetchPlaylistInfo() {
  try {
    const url = `https://open.spotify.com/oembed?url=spotify:playlist:${PLAYLIST_ID}&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load playlist info (${res.status})`);
    return await res.json();
  } catch (e) {
    console.error('获取歌单信息失败:', e);
    return null;
  }
}

function readTemplate() {
  const templatePath = path.join(__dirname, 'index.template.html');
  return fs.readFileSync(templatePath, 'utf-8');
}

function generateHTML(data) {
  const template = readTemplate();

  const ogUrl = `https://open.spotify.com/playlist/${PLAYLIST_ID}`;

  const html = template
    .replace(/\{\{TITLE\}\}/g, data?.title || '歌单')
    .replace(/\{\{OG_TITLE\}\}/g, data?.title || '歌单')
    .replace(/\{\{OG_DESCRIPTION\}\}/g, data?.author_name || 'Spotify')
    .replace(/\{\{OG_IMAGE\}\}/g, data?.thumbnail_url || '')
    .replace(/\{\{OG_URL\}\}/g, ogUrl)
    .replace(/\{\{COVER\}\}/g, data?.thumbnail_url || '')
    .replace(/\{\{AUTHOR\}\}/g, data?.author_name || 'Spotify');

  return html;
}

async function build() {
  console.log('开始构建...');
  const playlistData = await fetchPlaylistInfo();

  if (!playlistData) {
    console.warn('无法获取歌单信息，将使用默认值构建');
  }

  const html = generateHTML(playlistData);
  const outputPath = path.join(__dirname, 'index.html');

  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log('构建完成:', outputPath);
}

build().catch(console.error);
