# Spotify Web API Now Playing

基于 Spotify Web API 的实时播放展示，使用 Implicit Grant Flow 纯前端实现。

相比 Last.fm 方案：
- ✅ 获取高清专辑封面（640×640）
- ✅ 数据实时性更好（秒级）
- ✅ 更准确的播放状态
- ⚠️ 需要用户登录授权一次

## 配置步骤

### 1. 获取 Spotify 凭证

1. 访问 [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. 登录后点击 "Create App"
3. 填写应用信息：
   - App name: 任意
   - App description: 任意
   - Redirect URI: **添加你的部署域名**（如 `https://your-site.pages.dev/`）
4. 创建后复制 `Client ID`
5. 注意：不需要 `Client Secret`（Implicit Grant 不需要）

### 2. 修改配置

在 `script.js` 顶部修改：

```javascript
const SPOTIFY_CLIENT_ID = '你的Client ID';
const SPOTIFY_REDIRECT_URI = window.location.origin + window.location.pathname; // 保持默认
const SCOPE = 'user-read-currently-playing user-read-playback-state'; // 保持默认
```

在 `build.js` 顶部设置你的歌单 ID：

```javascript
const PLAYLIST_ID = '你的歌单ID'; // 如 44Xq0ZjwweqahmogY3gM5M
```

### 3. 本地测试

```bash
# 安装依赖（仅 build.js 需要，script.js 纯前端）
# Node.js 环境
node build.js
# 生成 index.html

# 本地预览（需要 HTTP 服务器）
npx serve .
# 或 Python:
python -m http.server 8000
```

访问页面后，点击 "🔗 登录 Spotify" 按钮，授权后即可看到实时播放。

### 4. 部署到 Cloudflare Pages

1. 将整个 `spotify-api/` 文件夹推送到 GitHub
2. 在 Cloudflare Pages 创建项目，指向该仓库
3. Build command: `node build.js`
4. Build output directory: `/`
5. 环境变量：无

**重要：** 确保在 Spotify Dashboard 的 Redirect URI 中已添加你的 Pages 域名（如 `https://your-project.pages.dev/`）。

## 工作原理

1. **首次访问**：显示 "登录 Spotify" 按钮
2. **授权**：跳转到 Spotify 授权页面，用户同意后 redirect 回当前页面，URL hash 中包含 access token
3. **存储**：token 保存到 localStorage（有效期约 1 小时）
4. **轮询**：每 10 秒调用 `/v1/me/player/currently-playing`
5. **更新**：获取当前曲目、艺术家、专辑封面（640×640）
6. **过期处理**：401 时清除 token 并提示重新登录

## 文件结构

```
spotify-api/
├── index.template.html   # 模板（build.js 生成最终 HTML）
├── index.html            # 构建输出（勿编辑）
├── script.js             # 前端逻辑（Spotify API 调用）
├── style.css             # 样式
├── build.js              # 构建脚本
└── README.md
```

## 注意事项

- 用户必须拥有 Spotify  Premium 才能使用 Web API 的当前播放接口
- 使用前需在 Spotify 设置中开启 "Web Player" 和 "Connect to Web" 权限
- 如果歌单封面不显示，可能是歌单为私有或封面图片不可访问
- CORS 问题：Spotify API 支持纯前端调用，无需后端代理

## 与 Last.fm 方案对比

| 特性 | Last.fm | Spotify API |
|------|---------|-------------|
| 封面分辨率 | 通常 300×300 | 可达 640×640 |
| 实时性 | 10-30 秒延迟 | 秒级 |
| 登录要求 | 无需登录 | 需 Spotify 登录授权 |
| 隐私 | 公开 scrobbling | 仅自己可见 |
| 稳定性 | 依赖第三方 | 官方 API |
| 可用性 | 需启用 Last.fm scrobbling | 需 Premium 账号 |

你可以保留两个方案，通过修改 `index.html` 的 `<script src="...">` 来切换。
