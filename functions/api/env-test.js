export async function onRequest(context) {
  const { env } = context;
  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;
  
  console.log('🔍 [env-test] SPOTIFY_CLIENT_ID present:', !!clientId);
  console.log('🔍 [env-test] SPOTIFY_CLIENT_SECRET present:', !!clientSecret);
  
  return new Response(JSON.stringify({
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    clientIdPreview: clientId ? clientId.slice(0, 8) + '...' : null,
    clientSecretPreview: clientSecret ? clientSecret.slice(0, 8) + '...' : null,
    allKeys: Object.keys(env)
  }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}
