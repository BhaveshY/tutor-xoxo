export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

export function createCorsResponse(body: any, status = 200) {
  return new Response(
    JSON.stringify(body),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}

export function handleOptionsRequest() {
  return new Response('ok', { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
} 