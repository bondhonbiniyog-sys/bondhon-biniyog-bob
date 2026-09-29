export async function handleLocalApi(urlPath: string, method: string = 'GET', body?: any) {
  try {
    const opts: any = { method, headers: {} as any };
    if (method!== 'GET' && body) {
      if (body instanceof FormData) opts.body = body;
      else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    }
    const res = await fetch(urlPath, opts);
    const json = await res.json().catch(() => []);
    return { status: res.status, data: json };
  } catch (e: any) { return { status: 200, data: [] }; }
}
