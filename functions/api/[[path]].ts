export interface Env { BOB_DB: D1Database; }

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}

async function handleRequest(request: Request, env: Env) {
  const url = new URL(request.url);
  let path = url.pathname.replace('/api/', '').replace(/^\/+/, '');
  const method = request.method;

  if (method === 'OPTIONS') return json({}, 200);

  try {
    // SETTINGS
    if (path.startsWith('settings')) {
      if (method === 'GET') {
        try { const row = await env.BOB_DB.prepare('SELECT * FROM settings LIMIT 1').first(); return json({ success: true, settings: row || {} }); }
        catch { return json({ success: true, settings: {} }); }
      }
      if (method === 'PUT' || method === 'POST') {
        const body: any = await request.json().catch(()=>({}));
        try {
          const existing = await env.BOB_DB.prepare('SELECT id FROM settings LIMIT 1').first() as any;
          if (!existing) await env.BOB_DB.prepare("INSERT INTO settings (id) VALUES ('1')").run().catch(()=>{});
          for (const k of Object.keys(body)) {
            try { await env.BOB_DB.prepare(`UPDATE settings SET ${k}=? WHERE id='1'`).bind(String(body[k]?? '')).run(); }
            catch { try { await env.BOB_DB.prepare(`ALTER TABLE settings ADD COLUMN ${k} TEXT`).run(); } catch {} try { await env.BOB_DB.prepare(`UPDATE settings SET ${k}=? WHERE id='1'`).bind(String(body[k]?? '')).run(); } catch {} }
          }
        } catch {}
        return json({ success: true });
      }
    }

    // MEMBERS - REGISTER / LOGIN - MAIN FIX FOR YOUR SCREENSHOT
    if (path.startsWith('members') || path.startsWith('auth') || path.startsWith('register')) {
      if (method === 'GET') {
        try { const { results } = await env.BOB_DB.prepare('SELECT * FROM members ORDER BY created_at DESC LIMIT 100').all(); return json({ success: true, members: results || [] }); }
        catch { return json({ success: true, members: [] }); }
      }
      if (method === 'POST') {
        const body: any = await request.json().catch(()=>({}));
        const member_id = 'BOB-' + Date.now();
        const full_name = body.full_name || body.fullName || body.name || '';
        const phone = body.phone || body.mobile || '';
        const email = body.email || '';
        const password = body.password || '';
        const monthly_amount = body.monthly_amount || body.monthlyAmount || 1000;

        try {
          await env.BOB_DB.prepare('CREATE TABLE IF NOT EXISTS members (member_id TEXT PRIMARY KEY, full_name TEXT, phone TEXT, email TEXT, password TEXT, monthly_amount INTEGER, status TEXT DEFAULT "Pending", created_at DATETIME DEFAULT CURRENT_TIMESTAMP)').run();

          // Check if already exists
          const exists = await env.BOB_DB.prepare('SELECT member_id FROM members WHERE phone=? OR email=?').bind(phone, email).first().catch(()=>null) as any;
          if (exists) return json({ success: false, message: 'এই ফোন/ইমেইল দিয়ে ইতিমধ্যে রেজিস্ট্রেশন আছে!' }, 400);

          await env.BOB_DB.prepare('INSERT INTO members (member_id, full_name, phone, email, password, monthly_amount, status) VALUES (?,?,?,?,?,?,?)')
           .bind(member_id, full_name, phone, email, password, Number(monthly_amount), 'Pending').run();

          return json({ success: true, member_id, message: 'সদস্য আবেদন সফল!' });
        } catch (e: any) {
          return json({ success: false, message: 'DB Error: ' + e.message }, 500);
        }
      }
      if (method === 'DELETE') {
        const id = path.split('/')[1] || path.split('/')[2];
        try { await env.BOB_DB.prepare('DELETE FROM members WHERE member_id=?').bind(id).run(); } catch {}
        return json({ success: true });
      }
    }

    // STATS
    if (path.startsWith('stats')) {
      try {
        const m = await env.BOB_DB.prepare('SELECT COUNT(*) as c FROM members').first() as any;
        const pm = await env.BOB_DB.prepare('SELECT COUNT(*) as c FROM monthly_deposits WHERE status="Pending"').first().catch(()=>({c:0})) as any;
        return json({ success: true, stats: { total_members: m?.c || 0, pending_monthly_deposits: pm?.c || 0 } });
      } catch { return json({ success: true, stats: {} }); }
    }

    // DIRECTORS
    if (path.startsWith('directors')) {
      if (method === 'GET') {
        try { const { results } = await env.BOB_DB.prepare('SELECT * FROM directors ORDER BY "order" ASC').all(); return json({ success: true, directors: results || [] }); }
        catch { await env.BOB_DB.prepare('CREATE TABLE IF NOT EXISTS directors (director_id TEXT PRIMARY KEY, name TEXT, designation TEXT, phone TEXT, email TEXT, photo_url TEXT, message TEXT, "order" INTEGER)').run().catch(()=>{}); return json({ success: true, directors: [] }); }
      }
      if (method === 'POST') {
        const body: any = await request.json().catch(()=>({}));
        const id = 'DIR-' + Date.now();
        try {
          await env.BOB_DB.prepare('CREATE TABLE IF NOT EXISTS directors (director_id TEXT PRIMARY KEY, name TEXT, designation TEXT, phone TEXT, email TEXT, photo_url TEXT, message TEXT, "order" INTEGER)').run();
          await env.BOB_DB.prepare('INSERT INTO directors (director_id, name, designation, phone, email, photo_url, message, "order") VALUES (?,?,?,?,?,?,?,?)').bind(id, body.name, body.designation||'', body.phone||'', body.email||'', body.photo_url||'', body.message||'', Number(body.order)||1).run();
        } catch (e: any) { return json({ success: false, message: e.message }, 500); }
        return json({ success: true });
      }
      if (method === 'PUT' || method === 'DELETE') {
        const dirId = path.split('/')[1];
        if (method === 'DELETE') { try { await env.BOB_DB.prepare('DELETE FROM directors WHERE director_id=?').bind(dirId).run(); } catch {} }
        else { const b: any = await request.json().catch(()=>({})); try { await env.BOB_DB.prepare('UPDATE directors SET name=?, designation=?, phone=?, email=?, photo_url=?, message=?, "order"=? WHERE director_id=?').bind(b.name, b.designation, b.phone, b.email, b.photo_url, b.message, Number(b.order)||1, dirId).run(); } catch {} }
        return json({ success: true });
      }
    }

    // MARKETPLACE / JOMI BIKRI
    if (path.startsWith('marketplace')) {
      if (method === 'GET') {
        try {
          const { results } = await env.BOB_DB.prepare('SELECT * FROM marketplace_submissions ORDER BY created_at DESC LIMIT 100').all().catch(async () => {
            return await env.BOB_DB.prepare('SELECT * FROM member_proposals ORDER BY created_at DESC LIMIT 100').all().catch(()=>({results:[]})) as any;
          }) as any;
          return json({ success: true, submissions: results || [], offers: results || [] });
        } catch { return json({ success: true, offers: [], submissions: [] }); }
      }
      if (method === 'POST') {
        const body: any = await request.json().catch(()=>({}));
        const id = 'MP-' + Date.now();
        try {
          await env.BOB_DB.prepare('CREATE TABLE IF NOT EXISTS marketplace_submissions (id TEXT PRIMARY KEY, data TEXT, status TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)').run();
          await env.BOB_DB.prepare('INSERT INTO marketplace_submissions (id, data, status) VALUES (?,?,?)').bind(id, JSON.stringify(body), 'Pending').run();
        } catch {
          try { await env.BOB_DB.prepare('CREATE TABLE IF NOT EXISTS member_proposals (id TEXT PRIMARY KEY, data TEXT, status TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)').run(); await env.BOB_DB.prepare('INSERT INTO member_proposals (id, data, status) VALUES (?,?,?)').bind(id, JSON.stringify(body), 'Pending').run(); } catch {}
        }
        return json({ success: true, id, message: 'আবেদন সফল!' });
      }
    }

    // LANDS / DEPOSITS / OTHERS
    if (path.startsWith('lands')) {
      if (method === 'GET') { try { const { results } = await env.BOB_DB.prepare('SELECT * FROM lands ORDER BY created_at DESC').all(); return json({ success: true, lands: results || [] }); } catch { return json({ success: true, lands: [] }); } }
      return json({ success: true });
    }
    if (path.includes('deposits')) {
      if (method === 'GET') {
        try {
          if (path.includes('monthly')) { const { results } = await env.BOB_DB.prepare('SELECT * FROM monthly_deposits ORDER BY created_at DESC LIMIT 100').all(); return json({ success: true, deposits: results || [] }); }
          else { const { results } = await env.BOB_DB.prepare('SELECT * FROM lumpsum_deposits ORDER BY created_at DESC LIMIT 100').all(); return json({ success: true, deposits: results || [] }); }
        } catch { return json({ success: true, deposits: [] }); }
      }
      if (method === 'PUT' || method === 'POST') { return json({ success: true }); }
    }

    if (path.startsWith('gallery') || path.startsWith('notifications') || path.startsWith('member-proposals')) {
      return json({ success: true, gallery: [], notifications: [], proposals: [] });
    }

    return json({ success: false, message: 'Route not found: ' + path }, 404);
  } catch (e: any) {
    return json({ success: false, message: e.message }, 500);
  }
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  if (ctx.request.method === 'OPTIONS') return json({}, 200);
  return handleRequest(ctx.request, ctx.env);
};
export const onRequestGet: PagesFunction<Env> = async (ctx) => handleRequest(ctx.request, ctx.env);
export const onRequestPost: PagesFunction<Env> = async (ctx) => handleRequest(ctx.request, ctx.env);
export const onRequestPut: PagesFunction<Env> = async (ctx) => handleRequest(ctx.request, ctx.env);
export const onRequestDelete: PagesFunction<Env> = async (ctx) => handleRequest(ctx.request, ctx.env);
export const onRequestOptions: PagesFunction<Env> = async () => json({}, 200);
