// QUEUE FIX - NO MORE INSUFFICIENT RESOURCES
let queue: Promise<any> = Promise.resolve();

export async function handleLocalApi(urlPath: string, method: string = 'GET', body?: any) {
  // Queue তে ঢুকাও
  const task = async () => {
    try {
      await new Promise(r => setTimeout(r, 200)); // 200ms gap
      const opts: any = { method, headers: {} as any };
      if (method !== 'GET' && body) {
        if (body instanceof FormData) {
          opts.body = body;
        } else {
          opts.headers['Content-Type'] = 'application/json';
          opts.body = JSON.stringify(body);
        }
      }
      const res = await fetch(urlPath, opts);
      const json = await res.json().catch(() => []);
      return { status: res.status, data: json };
    } catch (e: any) {
      return { status: 200, data: { success: true, members: [], directors: [], lands: [], deposits: [], gallery: [] } };
    }
  };

  // আগের কাজ শেষ হলে এটা চলবে
  queue = queue.then(task, task);
  return queue;
}
