# Now Playing (Last.fm + 歌单预览)

实时显示当前播放的歌曲信息，并展示关联的 Spotify 歌单。

## 特性

- 使用 Last.fm API 获取当前播放（免费账户）
- 通过 Spotify oEmbed 显示歌单封面、标题、作者（静态生成）
- 点击歌单头部跳转到 Spotify 歌单页
- 预注入 Open Graph/Twitter meta 标签，利于分享和抓取

## 配置

1. 在 `build.js` 顶部设置你的歌单 ID：
```javascript
const PLAYLIST_ID = '你的歌单ID';
```

2. 在 `script.js` 顶部同步配置（用于前端显示）：
```javascript
const LASTFM_USER = '你的Last.fm用户名';
const LASTFM_API_KEY = '你的Last.fm API Key';
const PLAYLIST_ID = '你的歌单ID';
```

## 构建与部署

Cloudflare Pages 构建设置：

- **Build command**: `node build.js`
- **Build output directory**: `/`

构建脚本 `build.js` 会：
1. 请求 Spotify oEmbed API 获取歌单元数据
2. 读取 `index.template.html`
3. 替换占位符，生成最终的 `index.html`

## 文件结构

```
/
├── build.js          # 构建脚本
├── index.template.html
├── script.js
├── style.css
├── .gitignore
└── README.md
```

## 注意事项

- 构建过程需要访问 `open.spotify.com`（无鉴权）
- 页面的 `<title>`、OG 标签在构建时确定，不会随播放变化
- 当前播放内容由前端轮询 Last.fm 更新（延迟约 10–30 秒）
- 需要启用 Spotify → Last.fm scrobbling