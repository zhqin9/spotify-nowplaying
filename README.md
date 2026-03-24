# Now Playing (Last.fm 版本)

实时显示当前播放的歌曲信息（无需 Spotify Premium）。

## 架构

- **前端**：纯静态页面（index.html + style.css + script.js）
- **数据源**：Last.fm API (`user.getRecentTracks`)
- **托管**：Cloudflare Pages 或任意静态托管

## 配置

1. 获取 Last.fm API Key：
   - 访问 https://www.last.fm/api/account/create
   - 填写表单，提交后会收到 API Key

2. 修改 `script.js` 中的配置：
```javascript
const LASTFM_USER = '你的Last.fm用户名';
const LASTFM_API_KEY = '你的API Key';
```

3. 部署到 Pages（无需 Functions，无需环境变量）

## 工作原理

- 前端每 10 秒轮询 Last.fm API
- 获取最近一条 scrobble，判断 `@attr.nowplaying` 是否为 true
- 显示歌曲名、艺术家、专辑、封面
- 如果当前没有播放，显示“当前未播放”

## 注意事项

- 延迟约 10–30 秒（取决于 Last.fm 同步）
- 需要在 Spotify 设置中启用“Scrobbling to Last.fm”
- 封面来自 Last.fm 图片（可能与 Spotify 不一致）
- 不需要 Spotify Premium，免费账户可用

## 文件结构

```
/
├── index.html
├── style.css
├── script.js
└── README.md
```

无需后端，无需 KV，无需构建步骤。Pages 直接部署即可。