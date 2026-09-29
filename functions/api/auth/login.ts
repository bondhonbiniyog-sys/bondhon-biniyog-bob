export async function onRequestPost(context: any) {
  const { request, env } = context;
  try {
    const body: any = await request.json().catch(() => ({}));
    const email = body.email || body.Email || "";
    
    // Test mode - DB ছাড়াই login হবে
    if (email.toLowerCase() === "admin@bob.com") {
      return new Response(JSON.stringify({
        success: true,
        data: {
          token: "admin-token-123",
          user: { id: "1", email: "admin@bob.com", name: "Admin", role: "admin" }
        }
      }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    // DB থাকলে DB থেকে check করবে
    if (env.DB) {
      const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
      if (user) {
        return new Response(JSON.stringify({ success: true, data: { token: "db-token", user } }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }

    return new Response(JSON.stringify({ success: false, message: "Invalid email" }), { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
}
