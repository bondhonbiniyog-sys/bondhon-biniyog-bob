// 100% D1 API - No Memory, No localStorage
export async function handleLocalApi(urlPath: string, method: string = 'GET', body?: any) {
  try {
    const options: any = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body && method !== 'GET') {
      if (body instanceof FormData) {
        options.body = body;
        delete options.headers['Content-Type'];
      } else {
        options.body = JSON.stringify(body);
      }
    }
    const res = await fetch(urlPath, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (e: any) {
    return { status: 500, data: { success: false, message: e.message } };
  }
}
