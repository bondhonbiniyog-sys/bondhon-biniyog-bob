import { handleLocalApi } from '../../src/services/localBackend';

interface Env {
  DB?: any;
  R2?: any;
  KV?: any;
}

let d1Initialized = false;

async function ensureD1Tables(db: any) {
  if (d1Initialized) return;
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS members (
        member_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        password_hash TEXT,
        role TEXT DEFAULT 'Member',
        status TEXT DEFAULT 'Active',
        monthly_target REAL DEFAULT 5000,
        total_monthly_paid REAL DEFAULT 0,
        total_lumpsum_paid REAL DEFAULT 0,
        grand_total_paid REAL DEFAULT 0,
        due_installments INTEGER DEFAULT 0,
        owned_shares INTEGER DEFAULT 0,
        has_accepted_terms INTEGER DEFAULT 1,
        avatar_url TEXT,
        joined_date TEXT
      );
      CREATE TABLE IF NOT EXISTS monthly_deposits (
        deposit_id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL,
        member_name TEXT,
        month_year TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        trx_id TEXT NOT NULL,
        voucher_url TEXT,
        status TEXT DEFAULT 'Pending',
        submitted_at TEXT NOT NULL,
        approved_by TEXT,
        approved_at TEXT,
        admin_note TEXT
      );
      CREATE TABLE IF NOT EXISTS lumpsum_deposits (
        lumpsum_id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL,
        member_name TEXT,
        purpose TEXT NOT NULL,
        amount REAL NOT NULL,
        target_land_id TEXT,
        target_land_name TEXT,
        payment_method TEXT NOT NULL,
        trx_id TEXT NOT NULL,
        voucher_url TEXT,
        status TEXT DEFAULT 'Pending',
        submitted_at TEXT NOT NULL,
        approved_by TEXT,
        approved_at TEXT,
        admin_note TEXT
      );
      CREATE TABLE IF NOT EXISTS land_investments (
        land_id TEXT PRIMARY KEY,
        land_name TEXT NOT NULL,
        location TEXT NOT NULL,
        area_size TEXT NOT NULL,
        purchase_price REAL NOT NULL,
        current_valuation REAL NOT NULL,
        total_shares INTEGER NOT NULL,
        sold_shares INTEGER DEFAULT 0,
        share_price REAL NOT NULL,
        monthly_installment REAL DEFAULT 5000,
        status TEXT DEFAULT 'Active',
        description TEXT,
        images_json TEXT
      );
      CREATE TABLE IF NOT EXISTS directors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        designation TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        photo_url TEXT,
        message TEXT,
        display_order INTEGER DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        settings_json TEXT NOT NULL
      );
      -- R2 FREE Image Store - সব ছবি Base64 হিসাবে এখানে থাকবে
      CREATE TABLE IF NOT EXISTS file_store (
        id TEXT PRIMARY KEY,
        name TEXT,
        mime TEXT,
        data_url TEXT,
        category TEXT,
        created_at TEXT
      );
    `);
    d1Initialized = true;
  } catch (e) {
    console.error('D1 table creation notice:', e);
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export const onRequest = async (context: { request: Request; env?: Env; params?: any; }): Promise<Response> => {
  const { request, env = {} } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
    });
  }

  if (env.DB) await ensureD1Tables(env.DB);

  // === R2 FREE UPLOAD - 100% Base64 - No Card Needed ===
  if (pathname === '/api/r2/upload' && method === 'POST') {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const category = (formData.get('category') as string) || 'general';
      if (!file) return new Response(JSON.stringify({ success: false, message: 'No file' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

      const buffer = await file.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`;
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;

      if (env.DB) {
        try {
          await env.DB.prepare('INSERT INTO file_store (id, name, mime, data_url, category, created_at) VALUES (?,?,?,?,?,?)')
           .bind(fileId, file.name, file.type, dataUrl, category, new Date().toISOString()).run();
        } catch {}
      }

      return new Response(JSON.stringify({
        success: true,
        url: dataUrl,
        file: { id: fileId, name: file.name, size: file.size, mimeType: file.type, url: dataUrl, uploadedAt: new Date().toISOString(), category }
      }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, message: err?.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
  }

  if (pathname === '/api/r2/upload-dataurl' && method === 'POST') {
    try {
      const json = await request.json() as any;
      const { dataUrl, filename, category = 'statement' } = json || {};
      if (!dataUrl) return new Response(JSON.stringify({ success: false, message: 'dataUrl required' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      if (env.DB) {
        try {
          await env.DB.prepare('INSERT INTO file_store (id, name, mime, data_url, category, created_at) VALUES (?,?,?,?,?,?)')
           .bind(fileId, filename || 'file.jpg', 'image/jpeg', dataUrl, category, new Date().toISOString()).run();
        } catch {}
      }
      return new Response(JSON.stringify({ success: true, url: dataUrl, file: { id: fileId, name: filename, url: dataUrl, category } }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, message: err?.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
  }

  // Serve - R2 থাকলে R2 থেকে, না থাকলে D1 file_store থেকে
  if (pathname.startsWith('/api/r2/file/')) {
    const key = decodeURIComponent(pathname.replace('/api/r2/file/', ''));
    if (key.startsWith('data:')) {
      const m = key.match(/^data:([^;]+);base64,(.*)$/);
      if (m) {
        const mime = m[1];
        const bin = atob(m[2]);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new Response(bytes, { headers: { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' } });
      }
    }
    if (env.R2) {
      try {
        const obj = await env.R2.get(key);
        if (obj) {
          const h = new Headers();
          obj.writeHttpMetadata(h);
          h.set('Access-Control-Allow-Origin', '*');
          return new Response(obj.body, { headers: h });
        }
      } catch {}
    }
    if (env.DB) {
      try {
        const row: any = await env.DB.prepare('SELECT * FROM file_store WHERE id =? OR data_url =?').bind(key, key).first();
        if (row?.data_url) {
          const m = row.data_url.match(/^data:([^;]+);base64,(.*)$/);
          if (m) {
            const mime = m[1];
            const bin = atob(m[2]);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            return new Response(bytes, { headers: { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' } });
          }
          return new Response(JSON.stringify({ url: row.data_url }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
      } catch {}
    }
    return new Response('File not found', { status: 404 });
  }

  if (pathname === '/api/r2/files' && method === 'GET') {
    if (env.DB) {
      try {
        const { results } = await env.DB.prepare('SELECT id, name, mime, data_url, category, created_at FROM file_store ORDER BY created_at DESC LIMIT 100').all();
        const files = (results || []).map((r: any) => ({ id: r.id, name: r.name, mimeType: r.mime, url: r.data_url, category: r.category, uploadedAt: r.created_at }));
        return new Response(JSON.stringify({ success: true, files }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch {}
    }
    return new Response(JSON.stringify({ success: true, files: [] }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  if (pathname.startsWith('/api/r2/files/') && method === 'DELETE') {
    const key = decodeURIComponent(pathname.replace('/api/r2/files/', ''));
    if (env.DB) {
      try { await env.DB.prepare('DELETE FROM file_store WHERE id =?').bind(key).run(); } catch {}
    }
    if (env.R2) { try { await env.R2.delete(key); } catch {} }
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }

  // KV Session - আগের মতোই
  if (pathname.startsWith('/api/kv/session') && env.KV) {
    if (method === 'GET') {
      const token = url.searchParams.get('token');
      if (token) {
        const sessionData = await env.KV.get(`session:${token}`);
        return new Response(sessionData || JSON.stringify(null), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }
    if (method === 'POST') {
      const body = await request.json() as any;
      if (body?.token && body?.user) {
        await env.KV.put(`session:${body.token}`, JSON.stringify(body.user), { expirationTtl: 86400 * 7 });
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }
  }

  // D1 APIs
  if (env.DB) {
    if (pathname === '/api/db/query' && method === 'POST') {
      try {
        const { sql, params = [] } = await request.json() as any;
        const stmt = env.DB.prepare(sql).bind(...params);
        const result = sql.trim().toUpperCase().startsWith('SELECT')? await stmt.all() : await stmt.run();
        return new Response(JSON.stringify({ success: true, result }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch (dbErr: any) {
        return new Response(JSON.stringify({ success: false, message: dbErr?.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }
  }

  let body: any = undefined;
  if (method!== 'GET' && method!== 'HEAD') {
    try { const t = await request.text(); if (t) body = JSON.parse(t); } catch {}
  }

  try {
    const { status, data } = await handleLocalApi(pathname + url.search, method, body);
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'X-Powered-By': 'Cloudflare-D1-Base64' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: 'API Error: ' + (err?.message || err) }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', } });
  }
};
