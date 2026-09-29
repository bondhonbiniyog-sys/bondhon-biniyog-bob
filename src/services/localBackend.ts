// FIX INSUFFICIENT RESOURCES - CACHE + QUEUE
const cache = new Map<string, { time: number, data: any }>();

export async function handleLocalApi(urlPath: string, method: string = 'GET', body?: any) {
  const cacheKey = `${method}:${urlPath}`;
  const now = Date.now();
  
  // GET হলে 5 সেকেন্ড Cache Return করো, বার বার Call করো না
  if (method === 'GET') {
    const cached = cache.get(cacheKey);
    if (cached && (now - cached.time) < 5000) {
      return cached.data;
    }
  }

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
    
    // 500ms Delay দাও যাতে একসাথে সব Call না হয়
    await new Promise(r => setTimeout(r, 300));
    
    const res = await fetch(urlPath, options);
    const data = await res.json().catch(() => ({}));
    const result = { status: res.status, data };
    
    if (method === 'GET' && res.ok) {
      cache.set(cacheKey, { time: now, data: result });
    } else if (method !== 'GET') {
      cache.clear(); // POST হলে Cache Clear
    }
    
    return result;
  } catch (e: any) {
    return { status: 500, data: { success: false, message: e.message } };
  }
}
