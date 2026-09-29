export async function onRequestPost(context) {
  return handleLogin();
}
export async function onRequestGet(context) {
  return handleLogin();
}
export async function onRequest(context) {
  return handleLogin();
}
export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

function handleLogin() {
  return new Response(JSON.stringify({
    success: true,
    data: {
      token: "test123",
      user: { id: "1", email: "sajib@bob.com", name: "Sajib", role: "admin" }
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
