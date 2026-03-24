const KV_TOKEN_KEY = 'spotify_token';

export async function onRequestGet(context) {
  const { env } = context;
  const raw = await env.KV_NAMESPACE.get(KV_TOKEN_KEY);
  return Response.json({ hasToken: !!raw });
}