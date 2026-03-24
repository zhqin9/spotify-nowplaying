const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const KV_TOKEN_KEY = 'spotify_token';

async function getStoredToken(env) {
  const raw = await env.KV_NAMESPACE.get(KV_TOKEN_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

async function setStoredToken(env, tokenObj) {
  await env.KV_NAMESPACE.put(KV_TOKEN_KEY, JSON.stringify(tokenObj));
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
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
    scope: tokenData.scope,
  };

  await setStoredToken(env, token);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Spotify 授权成功</title></head><body style="font-family:sans-serif;text-align:center;padding:40px;"><h1>✅ 授权成功</h1><p>你可以关闭此窗口并返回前端查看播放状态。</p><script>setTimeout(()=>window.close(),3000);</script></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}