/**
 * 获取 Spotify 歌单详细信息
 * Route: /api/playlist
 * 使用 Client Credentials 模式（无需用户登录）
 */

export async function onRequest(context) {
  const { env } = context;
  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;
  const playlistId = '75OLnwx0I1L2RKnHItDz3R'; // 你的歌单 ID

  if (!clientId || !clientSecret) {
    const err = 'Missing Spotify credentials (SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not set)';
    console.error('❌', err);
    return new Response(JSON.stringify({ error: err }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. 获取 access token
    console.log('🔑 Getting access token...');
    const token = await getAccessToken(clientId, clientSecret);
    if (!token) {
      throw new Error('Failed to obtain access token from Spotify (check credentials and permissions)');
    }
    console.log('✅ Token obtained');

    // 2. 获取歌单数据
    console.log(`📥 Fetching playlist ${playlistId}...`);
    const playlist = await fetchPlaylist(playlistId, token);
    if (!playlist) {
      throw new Error(`Failed to fetch playlist data (playlistId: ${playlistId})`);
    }
    console.log('✅ Playlist fetched');

    return new Response(JSON.stringify(playlist), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    console.error('❌ Error in /api/playlist:', e);
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Client Credentials 获取 token
async function getAccessToken(clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  try {
    const resp = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('❌ Token request failed:', resp.status, text);
      return null;
    }
    const data = await resp.json();
    return data.access_token;
  } catch (e) {
    console.error('❌ getAccessToken exception:', e);
    return null;
  }
}

// 获取歌单详情
async function fetchPlaylist(playlistId, token) {
  try {
    const resp = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('❌ Spotify API error:', resp.status, text);
      return null;
    }
    const data = await resp.json();

    return {
      title: data.name,
      author: data.owner?.display_name || 'Spotify',
      cover: data.images?.[0]?.url || '',
      trackCount: data.tracks?.total || 0,
      description: data.description || '',
      url: data.external_urls?.spotify || `https://open.spotify.com/playlist/${playlistId}`,
    };
  } catch (e) {
    console.error('❌ fetchPlaylist exception:', e);
    return null;
  }
}
