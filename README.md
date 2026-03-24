# Spotify Now Playing (Cloudflare Pages + Functions)

实时显示 Spotify 正在播放的歌曲、封面、进度等信息。

## 架构

- **前端**：纯静态页面（index.html + style.css + script.js）
- **后端**：Cloudflare Pages Functions（/api/* 路由）
- **存储**：Cloudflare KV（保存 token）

## 部署步骤

### 1. Spotify Developer 设置

1. 访问 [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. 登录并点击 "Create App"
   - App name: 任意（如 "Now Playing Demo"）
   - Redirect URI: `https://你的域名.pages.dev/api/callback`
   - 勾选 `Web API`
3. 创建后记录 `Client ID` 和 `Client Secret`

### 2. Cloudflare 设置

1. 登录 Cloudflare Dashboard → **Workers & Pages** → **KV** → 创建命名空间（如 `spotify-nowplaying-kv`）
2. 记录命名空间 ID

### 3. 配置 Pages 项目

1. 在 Cloudflare 创建新的 Pages 项目，连接到你的 Git 仓库
2. 构建配置：
   - 构建命令：`echo "无构建步骤"`
   - 输出目录：`/` (根目录)
3. 环境变量（在 Pages 设置 → Environment variables）：
   - `SPOTIFY_CLIENT_ID` → 你的 Client ID
   - `SPOTIFY_CLIENT_SECRET` → 你的 Client Secret
   - 可选：`KV_NAMESPACE` → 你的 KV 命名空间 ID（如果绑定名为 `KV_NAMESPACE` 则自动注入）
4. 绑定 KV：
   - 在 Pages 的 **Variables** → **KV** 中添加
   - 变量名：`KV_NAMESPACE`
   - 选择刚才创建的 KV 命名空间

### 4. 部署

Push 代码后 Pages 自动部署。访问你的 pages.dev 域名即可使用。

## 文件结构

```
/
├── index.html
├── style.css
├── script.js
├── functions/
│   └── api/
│       └── [[path]].js   # 处理所有 /api/* 请求
├── wrangler.toml          # 本地开发配置（可选）
└── README.md
```

## OAuth 流程

1. 用户点击"登录 Spotify" → 跳转 Spotify 授权页
2. 授权后回调到 `/api/callback`，交换 access_token/refresh_token
3. token 存入 KV，前端开始轮询 `/api/now-playing`
4. Access token 过期前自动刷新

## 注意事项

- 需在 Spotify Dashboard 设置正确的 Redirect URI
- 首次登录后可勾选“记住我”延长授权时长
- 轮询间隔 2 秒；可调整 `script.js` 中的 `POLL_MS`
- 歌词未提供（Spotify API 不公开），需要可集成第三方服务

## 本地开发（可选）

安装 [Wrangler](https://developers.cloudflare.com/workers/wrangler/)，然后：

```bash
npx wrangler pages dev . --local
```

在环境文件中设置 `SPOTIFY_CLIENT_ID`、`SPOTIFY_CLIENT_SECRET`，并绑定 KV 命名空间。

---

遇到问题？检查 Cloudflare Pages 日志和 KV 绑定是否正确。