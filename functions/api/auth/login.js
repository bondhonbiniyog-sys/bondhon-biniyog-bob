export async function onRequest(context) {
  return new Response(JSON.stringify({
    success: true,
    data: {
      token: "admin-token-123",
      user: { id: "1", email: "admin@bob.com", name: "Admin", role: "admin" }
    }
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
