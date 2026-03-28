export async function onRequest(context) {
  console.log('🔍 context.env:', context.env);
  return new Response(JSON.stringify({
    hasClientId: !!context.env.SPOTIFY_CLIENT_ID,
    hasClientSecret: !!context.env.SPOTIFY_CLIENT_SECRET,
    envKeys: Object.keys(context.env)
  }));
}
