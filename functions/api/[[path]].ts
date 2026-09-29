import { handleLocalApi } from '../../src/services/localBackend';

/**
 * Cloudflare Pages Functions API Handler
 * Uses 100% Cloudflare Stack:
 * - Database: Cloudflare D1 (env.DB) using DB.prepare("SELECT...").all()
 * - Storage: Cloudflare R2 (env.R2) using R2.put(key, file)
 * - Cache: Cloudflare KV (env.KV) for session & fast settings
 */

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
    `);
    d1Initialized = true;
  } catch (e) {
    console.error('D1 table creation notice:', e);
  }
}

export const onRequest = async (context: {
  request: Request;
  env?: Env;
  params?: any;
  next?: () => Promise<Response>;
}): Promise<Response> => {
  const { request, env = {} } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method.toUpperCase();

  // 1. CORS Preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // 2. Cloudflare R2 Object Storage Direct Operations
  if (pathname.startsWith('/api/r2/')) {
    // 2.1 File Upload via FormData
    if (pathname === '/api/r2/upload' && method === 'POST') {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const category = (formData.get('category') as string) || 'general';

        if (!file) {
          return new Response(JSON.stringify({ success: false, message: 'No file provided' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }

        const fileId = `r2-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `${category}/${fileId}-${sanitized}`;

        if (env.R2) {
          await env.R2.put(key, file.stream(), {
            httpMetadata: { contentType: file.type || 'application/octet-stream' },
            customMetadata: {
              originalName: file.name,
              category,
              uploadedAt: new Date().toISOString(),
            },
          });
          const publicUrl = `/api/r2/file/${encodeURIComponent(key)}`;
          return new Response(
            JSON.stringify({
              success: true,
              url: publicUrl,
              file: {
                id: fileId,
                name: file.name,
                size: file.size,
                mimeType: file.type,
                url: publicUrl,
                uploadedAt: new Date().toISOString(),
                category,
              },
            }),
            { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, message: err?.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // 2.2 Base64 DataURL Direct Upload
    if (pathname === '/api/r2/upload-dataurl' && method === 'POST') {
      try {
        const json = await request.json() as any;
        const { dataUrl, filename, category = 'statement' } = json || {};
        if (!dataUrl) {
          return new Response(JSON.stringify({ success: false, message: 'dataUrl required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }

        const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        const mimeType = matches ? matches[1] : 'image/jpeg';
        const base64Data = matches ? matches[2] : dataUrl;
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const fileId = `r2-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const key = `${category}/${fileId}-${filename || 'file.jpg'}`;

        if (env.R2) {
          await env.R2.put(key, bytes, {
            httpMetadata: { contentType: mimeType },
            customMetadata: {
              originalName: filename || 'file.jpg',
              category,
              uploadedAt: new Date().toISOString(),
            },
          });
          const publicUrl = `/api/r2/file/${encodeURIComponent(key)}`;
          return new Response(
            JSON.stringify({
              success: true,
              url: publicUrl,
              file: {
                id: fileId,
                name: filename,
                size: bytes.byteLength,
                mimeType,
                url: publicUrl,
                uploadedAt: new Date().toISOString(),
                category,
              },
            }),
            { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, message: err?.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // 2.3 Serve R2 File
    if (pathname.startsWith('/api/r2/file/')) {
      const key = decodeURIComponent(pathname.replace('/api/r2/file/', ''));
      if (env.R2) {
        const object = await env.R2.get(key);
        if (!object) {
          return new Response('File not found in R2 storage', { status: 404 });
        }
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Access-Control-Allow-Origin', '*');
        return new Response(object.body, { headers });
      }
    }

    // 2.4 List Files in R2
    if (pathname === '/api/r2/files' && method === 'GET') {
      if (env.R2) {
        const category = url.searchParams.get('category');
        const listed = await env.R2.list({ prefix: category ? `${category}/` : undefined });
        const files = (listed.objects || []).map((obj: any) => ({
          id: obj.key,
          name: obj.customMetadata?.originalName || obj.key.split('/').pop(),
          size: obj.size,
          mimeType: obj.httpMetadata?.contentType || 'application/octet-stream',
          url: `/api/r2/file/${encodeURIComponent(obj.key)}`,
          uploadedAt: obj.uploaded.toISOString(),
          category: obj.customMetadata?.category || 'general',
        }));
        return new Response(JSON.stringify({ success: true, files }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // 2.5 Delete File in R2
    if (pathname.startsWith('/api/r2/files/') && method === 'DELETE') {
      const key = decodeURIComponent(pathname.replace('/api/r2/files/', ''));
      if (env.R2) {
        await env.R2.delete(key);
        return new Response(JSON.stringify({ success: true, message: 'Deleted from R2' }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }
  }

  // 3. Cloudflare KV Session Support
  if (pathname.startsWith('/api/kv/session') && env.KV) {
    if (method === 'GET') {
      const token = url.searchParams.get('token');
      if (token) {
        const sessionData = await env.KV.get(`session:${token}`);
        return new Response(sessionData || JSON.stringify(null), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }
    if (method === 'POST') {
      const body = await request.json() as any;
      if (body?.token && body?.user) {
        await env.KV.put(`session:${body.token}`, JSON.stringify(body.user), { expirationTtl: 86400 * 7 });
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }
  }

  // 4. Cloudflare D1 Database Direct SQL Execution
  if (env.DB) {
    await ensureD1Tables(env.DB);

    // 4.1 Custom Query Endpoint
    if (pathname === '/api/db/query' && method === 'POST') {
      try {
        const { sql, params = [] } = await request.json() as any;
        const stmt = env.DB.prepare(sql).bind(...params);
        const result = sql.trim().toUpperCase().startsWith('SELECT') ? await stmt.all() : await stmt.run();
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } catch (dbErr: any) {
        return new Response(JSON.stringify({ success: false, message: dbErr?.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // 4.2 Members API via D1
    if (pathname === '/api/members' && method === 'GET') {
      try {
        const { results } = await env.DB.prepare('SELECT * FROM members ORDER BY member_id ASC').all();
        if (results && results.length > 0) {
          return new Response(JSON.stringify({ success: true, members: results }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      } catch (e) {
        // Fallback to local
      }
    }

    // 4.3 Monthly Deposits API via D1
    if (pathname === '/api/deposits/monthly' && method === 'GET') {
      try {
        const { results } = await env.DB.prepare('SELECT * FROM monthly_deposits ORDER BY submitted_at DESC').all();
        if (results && results.length > 0) {
          return new Response(JSON.stringify({ success: true, deposits: results }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      } catch (e) {
        // Fallback to local
      }
    }

    // 4.4 Lumpsum Deposits API via D1
    if (pathname === '/api/deposits/lumpsum' && method === 'GET') {
      try {
        const { results } = await env.DB.prepare('SELECT * FROM lumpsum_deposits ORDER BY submitted_at DESC').all();
        if (results && results.length > 0) {
          return new Response(JSON.stringify({ success: true, deposits: results }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      } catch (e) {
        // Fallback to local
      }
    }

    // 4.5 Lands API via D1
    if (pathname === '/api/lands' && method === 'GET') {
      try {
        const { results } = await env.DB.prepare('SELECT * FROM land_investments ORDER BY land_id ASC').all();
        if (results && results.length > 0) {
          const parsed = results.map((r: any) => ({
            ...r,
            images: r.images_json ? JSON.parse(r.images_json) : [],
          }));
          return new Response(JSON.stringify({ success: true, lands: parsed }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      } catch (e) {
        // Fallback to local
      }
    }

    // 4.6 Directors API via D1
    if (pathname === '/api/directors' && method === 'GET') {
      try {
        const { results } = await env.DB.prepare('SELECT * FROM directors ORDER BY display_order ASC').all();
        if (results && results.length > 0) {
          return new Response(JSON.stringify({ success: true, directors: results }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      } catch (e) {
        // Fallback to local
      }
    }
  }

  // 5. Default REST API Handlers
  let body: any = undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Ignore body parse errors
    }
  }

  try {
    const { status, data } = await handleLocalApi(pathname + url.search, method, body);
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'X-Powered-By': 'Cloudflare-Pages-D1-R2',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, message: 'Cloudflare Pages API Error: ' + (err?.message || err) }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
