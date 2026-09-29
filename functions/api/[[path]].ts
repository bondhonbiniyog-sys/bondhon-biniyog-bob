// 100% D1 BASE64 - NO R2 - NO CARD NEEDED
export async function onRequest(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    if (!env.DB) throw new Error('DB not found');
    await ensureD1Tables(env.DB);

    // FILES UPLOAD - FORM DATA
    if (path.startsWith('files/upload') && method === 'POST' &&!path.includes('dataurl')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (!file) throw new Error('No file');
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const dataUrl = `data:${file.type};base64,${base64}`;
      const id = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(7);
      await env.DB.prepare('INSERT INTO file_store (id, name, mime, data_url, category, created_at) VALUES (?,?,?,?,?,?)')
       .bind(id, file.name, file.type, dataUrl, 'general', new Date().toISOString()).run();
      return jsonResponse({ success: true, url: `/api/files/${id}`, id, data_url: dataUrl, data: { url: `/api/files/${id}` } });
    }

    // FILES UPLOAD - DATA URL (FOR AVATAR, DIRECTOR, LAND)
    if (path === 'files/upload-dataurl' && method === 'POST') {
      const body = await request.json();
      const dataUrl = body.dataUrl;
      const filename = body.filename || 'image.jpg';
      const category = body.category || 'general';
      if (!dataUrl) throw new Error('No dataUrl');
      const id = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(7);
      const mime = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
      await env.DB.prepare('INSERT INTO file_store (id, name, mime, data_url, category, created_at) VALUES (?,?,?,?,?,?)')
       .bind(id, filename, mime, dataUrl, category, new Date().toISOString()).run();
      const urlPath = `/api/files/${id}`;
      return jsonResponse({ success: true, url: urlPath, file: { id, name: filename, url: urlPath, mimeType: mime }, data: { url: urlPath } });
    }

    // FILES GET - RETURN IMAGE FROM D1
    if (path.startsWith('files/') && method === 'GET') {
      const fileId = path.split('/')[1];
      const row: any = await env.DB.prepare('SELECT * FROM file_store WHERE id =?').bind(fileId).first();
      if (!row) return jsonResponse({ error: 'Not found' }, 404);
      const dataUrl = row.data_url as string;
      const mime = (row.mime as string) || 'image/jpeg';
      const base64Data = dataUrl.split(',')[1];
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Response(bytes, { headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=31536000',...corsHeaders() } });
    }

    // MEMBERS GET
    if (path === 'members' && method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM members').all();
      return jsonResponse({ success: true, members: results });
    }

    // MEMBERS POST/PUT
    if (path.startsWith('members') && (method === 'POST' || method === 'PUT')) {
      const body = await request.json();
      if (body.avatar_url && body.avatar_url.startsWith('data:')) {
        const fileId = 'file_' + Date.now();
        await env.DB.prepare('INSERT INTO file_store (id, name, mime, data_url, category, created_at) VALUES (?,?,?,?,?,?)')
         .bind(fileId, 'avatar', 'image/jpeg', body.avatar_url, 'avatar', new Date().toISOString()).run();
        body.avatar_url = `/api/files/${fileId}`;
      }
      const id = body.member_id;
      await env.DB.prepare(`INSERT INTO members (member_id, full_name, email, phone, role, status, monthly_target, total_monthly_paid, total_lumpsum_paid, grand_total_paid, due_installments, owned_shares, avatar_url, joined_date)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(member_id) DO UPDATE SET full_name=excluded.full_name, email=excluded.email, phone=excluded.phone, role=excluded.role, status=excluded.status, avatar_url=excluded.avatar_url, monthly_target=excluded.monthly_target, total_monthly_paid=excluded.total_monthly_paid, total_lumpsum_paid=excluded.total_lumpsum_paid, grand_total_paid=excluded.grand_total_paid, owned_shares=excluded.owned_shares`)
       .bind(id, body.full_name, body.email, body.phone, body.role || 'Member', body.status || 'Active', body.monthly_target || 5000, body.total_monthly_paid || 0, body.total_lumpsum_paid || 0, body.grand_total_paid || 0, body.due_installments || 0, body.owned_shares || 0, body.avatar_url || null, body.joined_date || new Date().toISOString()).run();
      return jsonResponse({ success: true });
    }

    // DIRECTORS
    if (path.startsWith('directors')) {
      if (method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM directors ORDER BY display_order').all();
        return jsonResponse({ success: true, directors: results, data: results });
      }
      if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        const body = method!== 'DELETE'? await request.json() : {};
        if (method === 'DELETE') {
           const did = path.split('/')[1];
           await env.DB.prepare('DELETE FROM directors WHERE id=?').bind(did).run();
           return jsonResponse({ success: true });
        }
        if (body.photo_url && body.photo_url.startsWith('data:')) {
          const fileId = 'file_' + Date.now();
          await env.DB.prepare('INSERT INTO file_store (id, name, mime, data_url, category, created_at) VALUES (?,?,?,?,?,?)')
           .bind(fileId, 'director', 'image/jpeg', body.photo_url, 'director', new Date().toISOString()).run();
          body.photo_url = `/api/files/${fileId}`;
        }
        await env.DB.prepare('INSERT INTO directors (id, name, designation, phone, email, photo_url, message, display_order) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, designation=excluded.designation, photo_url=excluded.photo_url, message=excluded.message')
         .bind(body.id || body.director_id || Date.now().toString(), body.name, body.designation, body.phone || '', body.email || '', body.photo_url || '', body.message || '', body.display_order || 1).run();
        return jsonResponse({ success: true });
      }
    }

    // LANDS, DEPOSITS, GALLERY - RETURN EMPTY OR REAL
    if (method === 'GET') {
      if (path.startsWith('lands')) {
        const { results } = await env.DB.prepare('SELECT * FROM land_investments').all();
        return jsonResponse({ success: true, lands: results });
      }
      if (path.startsWith('deposits/monthly')) {
        const { results } = await env.DB.prepare('SELECT * FROM monthly_deposits ORDER BY submitted_at DESC').all();
        return jsonResponse({ success: true, deposits: results });
      }
      if (path.startsWith('deposits/lumpsum')) {
        const { results } = await env.DB.prepare('SELECT * FROM lumpsum_deposits ORDER BY submitted_at DESC').all();
        return jsonResponse({ success: true, deposits: results });
      }
      if (path.startsWith('gallery')) {
        const { results } = await env.DB.prepare('SELECT * FROM gallery_items ORDER BY created_at DESC').all();
        return jsonResponse({ success: true, gallery: results });
      }
      return jsonResponse({ success: true, data: [], members: [], directors: [] });
    }

    return jsonResponse({ success: true });
  } catch (e: any) {
    return jsonResponse({ error: e.message, success: false }, 500);
  }
}

async function ensureD1Tables(db: any) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS members (member_id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT NOT NULL, password_hash TEXT, role TEXT DEFAULT 'Member', status TEXT DEFAULT 'Active', monthly_target REAL DEFAULT 5000, total_monthly_paid REAL DEFAULT 0, total_lumpsum_paid REAL DEFAULT 0, grand_total_paid REAL DEFAULT 0, due_installments INTEGER DEFAULT 0, owned_shares INTEGER DEFAULT 0, has_accepted_terms INTEGER DEFAULT 1, avatar_url TEXT, joined_date TEXT)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS directors (id TEXT PRIMARY KEY, name TEXT NOT NULL, designation TEXT NOT NULL, phone TEXT, email TEXT, photo_url TEXT, message TEXT, display_order INTEGER DEFAULT 1)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS file_store (id TEXT PRIMARY KEY, name TEXT, mime TEXT, data_url TEXT, category TEXT, created_at TEXT)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS monthly_deposits (deposit_id TEXT PRIMARY KEY, member_id TEXT NOT NULL, member_name TEXT, month_year TEXT NOT NULL, amount REAL NOT NULL, payment_method TEXT NOT NULL, trx_id TEXT NOT NULL, voucher_url TEXT, status TEXT DEFAULT 'Pending', submitted_at TEXT NOT NULL, approved_by TEXT, approved_at TEXT, admin_note TEXT)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS lumpsum_deposits (lumpsum_id TEXT PRIMARY KEY, member_id TEXT NOT NULL, member_name TEXT, purpose TEXT NOT NULL, amount REAL NOT NULL, target_land_id TEXT, target_land_name TEXT, payment_method TEXT NOT NULL, trx_id TEXT NOT NULL, voucher_url TEXT, status TEXT DEFAULT 'Pending', submitted_at TEXT NOT NULL, approved_by TEXT, approved_at TEXT, admin_note TEXT)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS land_investments (land_id TEXT PRIMARY KEY, land_name TEXT NOT NULL, location TEXT NOT NULL, area_size TEXT NOT NULL, purchase_price REAL NOT NULL, current_valuation REAL NOT NULL, total_shares INTEGER NOT NULL, sold_shares INTEGER DEFAULT 0, share_price REAL NOT NULL, monthly_installment REAL DEFAULT 5000, status TEXT DEFAULT 'Active', description TEXT, images_json TEXT)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS gallery_items (id TEXT PRIMARY KEY, title TEXT, category TEXT, image_url TEXT, date TEXT, location TEXT, created_at TEXT)`).run();
}

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
}
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json',...corsHeaders() } });
}
