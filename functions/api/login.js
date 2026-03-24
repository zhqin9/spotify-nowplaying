const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SCOPES = 'user-read-playback-state user-read-currently-playing';

function randomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // GET /api/login
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