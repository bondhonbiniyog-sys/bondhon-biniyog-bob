export function onRequest(context) {
  return new Response(JSON.stringify({
    success: true,
    data: {
      token: "test123",
      user: { id: "1", email: "sajib@bob.com", name: "Sajib", role: "admin" }
    }
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
