/**
 * Spotify Now Playing - Cloudflare Pages Functions
 *
 * 环境变量:
 * - SPOTIFY_CLIENT_ID
 * - SPOTIFY_CLIENT_SECRET
 * - KV_NAMESPACE (绑定 KV 命名空间)
 *
 * 路由 (前缀 /api):
 * - GET /login      → 重定向到 Spotify 授权页
 * - GET /callback   ← Spotify 回调（授权码换 token）
 * - GET /has-token  → { "hasToken": true/false }
 * - GET /now-playing→ 当前播放状态 JSON
 */

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_PLAYER_URL = 'https://api.spotify.com/v1/me/player';

const SCOPES = 'user-read-playback-state user-read-currently-playing';
const KV_TOKEN_KEY = 'spotify_token';

function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function getStoredToken(env) {
  const raw = await env.KV_NAMESPACE.get(KV_TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function setStoredToken(env, tokenObj) {
  await env.KV_NAMESPACE.put(KV_TOKEN_KEY, JSON.stringify(tokenObj));
}

async function refreshAccessToken(env, refreshToken) {
  const credentials = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);
  const resp = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Token refresh failed: ${resp.status}`);
  }

  const data = await resp.json();
  const now = Math.floor(Date.now() / 1000);
  const token = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: now + (data.expires_in || 3600),
    scope: data.scope || SCOPES,
  };
  await setStoredToken(env, token);
  return token;
}

async function getValidToken(env) {
  const token = await getStoredToken(env);
  if (!token) throw new Error('No token stored');

  const now = Math.floor(Date.now() / 1000);
  if (token.expires_at <= now + 60) {
    const refreshed = await refreshAccessToken(env, token.refresh_token);
    return refreshed.access_token;
  }
  return token.access_token;
}

async function fetchSpotifyPlayer(env) {
  const accessToken = await getValidToken(env);
  const resp = await fetch(SPOTIFY_PLAYER_URL, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (resp.status === 204) {
    return null; // 无播放
  }
  if (!resp.ok) {
    if (resp.status === 401) {
      await env.KV_NAMESPACE.delete(KV_TOKEN_KEY);
      throw new Error('Unauthorized');
    }
    throw new Error(`Spotify API error: ${resp.status}`);
  }

  return resp.json();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '');

  try {
    // GET /api/login
    if (path === '/login') {
      const state = randomString(16);
      const params = new URLSearchParams({
        client_id: env.SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: `${url.origin}/api/callback`,
        scope: SCOPES,
        state: state,
      });
      return Response.redirect(`${SPOTIFY_AUTH_URL}?${params}`, 302);
    }

    // GET /api/callback
    if (path === '/callback') {
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        return new Response(`授权失败: ${error}`, { status: 400 });
      }
      if (!code) {
        return new Response('缺少授权码', { status: 400 });
      }

      const credentials = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);
      const tokenResp = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: `${url.origin}/api/callback`,
        }),
      });

      if (!tokenResp.ok) {
        const txt = await tokenResp.text();
        return new Response(`Token exchange failed: ${txt}`, { status: 500 });
      }

      const tokenData = await tokenResp.json();
      const now = Math.floor(Date.now() / 1000);
      const token = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: now + (tokenData.expires_in || 3600),
        scope: tokenData.scope || SCOPES,
      };

      await setStoredToken(env, token);

      const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Spotify 授权成功</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:40px;">
          <h1>✅ 授权成功</h1>
          <p>你可以关闭此窗口并返回前端查看播放状态。</p>
          <script>setTimeout(()=>window.close(),3000);</script>
        </body>
        </html>
      `;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }

    // GET /api/has-token
    if (path === '/has-token') {
      const token = await getStoredToken(env);
      return Response.json({ hasToken: !!token });
    }

    // GET /api/now-playing
    if (path === '/now-playing') {
      const data = await fetchSpotifyPlayer(env);
      return Response.json(data || {});
    }

    return new Response('Not Found', { status: 404 });
  } catch (e) {
    console.error('Worker error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export const onRequest = onRequestGet;