export async function onRequest(context) {
  const { request } = context;
  
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    data: {
      token: "admin-token-" + Date.now(),
      user: { id: "1", email: "admin@bob.com", name: "Admin", role: "admin" }
    }
  }), {
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
