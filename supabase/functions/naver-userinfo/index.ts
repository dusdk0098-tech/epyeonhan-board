const naverUserInfoUrl = 'https://openapi.naver.com/v1/nid/me';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders()
    });
  }

  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return jsonResponse({ error: 'Missing authorization header' }, 401);
  }

  const naverResponse = await fetch(naverUserInfoUrl, {
    headers: {
      authorization
    }
  });

  if (!naverResponse.ok) {
    return jsonResponse({ error: 'Naver userinfo request failed' }, naverResponse.status);
  }

  const payload = await naverResponse.json();
  const profile = payload?.response ?? {};
  const id = String(profile.id ?? '').trim();
  const email = String(profile.email ?? '').trim();
  const name = String(profile.name ?? profile.nickname ?? email).trim();

  if (!id || !email) {
    return jsonResponse({ error: 'Naver userinfo response is missing id or email' }, 400);
  }

  return jsonResponse({
    sub: id,
    email,
    email_verified: true,
    name,
    preferred_username: profile.nickname ?? name,
    picture: profile.profile_image ?? null
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      'content-type': 'application/json; charset=utf-8'
    }
  });
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'GET, OPTIONS'
  };
}
