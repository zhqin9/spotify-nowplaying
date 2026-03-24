const SPOTIFY_PLAYER_URL = 'https://api.spotify.com/v1/me/player';
const KV_TOKEN_KEY = 'spotify_token';

async function getStoredToken(env) {
  const raw = await env.KV_NAMESPACE.get(KV_TOKEN_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

async function setStoredToken(env, tokenObj) {
  await env.KV_NAMESPACE.put(KV_TOKEN_KEY, JSON.stringify(tokenObj));
}

async function refreshAccessToken(env, refreshToken) {
  const credentials = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);
  const resp = await fetch('https://accounts.spotify.com/api/token', {
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
    const txt = await resp.text();
    throw new Error(`Token refresh failed: ${resp.status} - ${txt}`);
  }

  const data = await resp.json();
  const now = Math.floor(Date.now() / 1000);
  const token = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: now + (data.expires_in || 3600),
    scope: data.scope,
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
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });

  if (resp.status === 204) return null;
  if (!resp.ok) {
    if (resp.status === 401) {
      await env.KV_NAMESPACE.delete(KV_TOKEN_KEY);
      throw new Error('Unauthorized (invalid token)');
    }
    const txt = await resp.text();
    throw new Error(`Spotify API error: ${resp.status} - ${txt}`);
  }

  return resp.json();
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const data = await fetchSpotifyPlayer(env);
    return Response.json(data || {});
  } catch (e) {
    return Response.json({
      error: e.message,
      stack: e.stack || 'no stack',
      name: e.name
    }, { status: 500 });
  }
}