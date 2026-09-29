export async function onRequest(context: any) {
  const { request, env } = context;
  
  // CORS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Use POST" }), { status: 405, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const body: any = await request.json().catch(() => ({}));
    const email = (body.email || "").toLowerCase();

    // Direct login success for admin
    return new Response(JSON.stringify({
      success: true,
      data: {
        token: "admin-token-" + Date.now(),
        user: { id: "1", email: "admin@bob.com", name: "Admin", role: "admin" }
      }
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
}
