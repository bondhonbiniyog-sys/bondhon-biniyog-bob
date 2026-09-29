export interface Env {
  BOB_DB: D1Database;
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');
  const method = request.method;

  if (method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }

  try {
    // SETTINGS
    if (path.startsWith('settings')) {
      if (method === 'GET') {
        const { results } = await env.BOB_DB.prepare('SELECT * FROM settings LIMIT 1').all();
        return json({ success: true, settings: results?.[0] || {} });
      }
      if (method === 'PUT' || method === 'POST') {
        const body: any = await request.json();
        const keys = Object.keys(body);
        if (keys.length === 0) return json({ success: true });
        // Build dynamic update
        const existing = await env.BOB_DB.prepare('SELECT * FROM settings LIMIT 1').first();
        if (!existing) {
          await env.BOB_DB.prepare(`INSERT INTO settings (id) VALUES ('1')`).run();
        }
        for (const k of keys) {
          await env.BOB_DB.prepare(`UPDATE settings SET ${k} =? WHERE id = '1'`).bind(String(body[k])).run().catch(async () => {
            await env.BOB_DB.prepare(`ALTER TABLE settings ADD COLUMN ${k} TEXT`).run().catch(()=>{});
            await env.BOB_DB.prepare(`UPDATE settings SET ${k} =? WHERE id = '1'`).bind(String(body[k])).run().catch(()=>{});
          });
        }
        return json({ success: true });
      }
    }

    // STATS
    if (path === 'stats') {
      const m = await env.BOB_DB.prepare("SELECT COUNT(*) as c FROM members").first() as any;
      const pm = await env.BOB_DB.prepare("SELECT COUNT(*) as c FROM monthly_deposits WHERE status='Pending'").first() as any;
      const pl = await env.BOB_DB.prepare("SELECT COUNT(*) as c FROM lumpsum_deposits WHERE status='Pending'").first() as any;
      return json({ success: true, stats: { total_members: m?.c || 0, pending_monthly_deposits: pm?.c || 0, pending_lumpsum_deposits: pl?.c || 0 } });
    }

    // MEMBERS
    if (path.startsWith('members')) {
      if (method === 'GET') {
        const { results } = await env.BOB_DB.prepare('SELECT * FROM members ORDER BY created_at DESC').all();
        return json({ success: true, members: results || [] });
      }
      if (path.includes('/') && method === 'DELETE') {
        const id = path.split('/')[1];
        await env.BOB_DB.prepare('DELETE FROM members WHERE member_id=?').bind(id).run();
        return json({ success: true });
      }
    }

    // DEPOSITS
    if (path.startsWith('deposits/monthly')) {
      if (method === 'GET') {
        const { results } = await env.BOB_DB.prepare('SELECT * FROM monthly_deposits ORDER BY created_at DESC').all();
        return json({ success: true, deposits: results || [] });
      }
    }
    if (path.startsWith('deposits/lumpsum')) {
      if (method === 'GET') {
        const { results } = await env.BOB_DB.prepare('SELECT * FROM lumpsum_deposits ORDER BY created_at DESC').all();
        return json({ success: true, deposits: results || [] });
      }
    }
    if (path.includes('/status') && method === 'PUT') {
      const body: any = await request.json();
      const id = path.split('/')[2] || path.split('/')[1];
      if (path.includes('monthly')) {
        await env.BOB_DB.prepare('UPDATE monthly_deposits SET status=?, admin_note=? WHERE id=?').bind(body.status, body.admin_note || '', id).run();
      } else {
        await env.BOB_DB.prepare('UPDATE lumpsum_deposits SET status=?, admin_note=? WHERE id=?').bind(body.status, body.admin_note || '', id).run();
      }
      return json({ success: true });
    }

    // LANDS
    if (path.startsWith('lands')) {
      if (method === 'GET') {
        const { results } = await env.BOB_DB.prepare('SELECT * FROM lands ORDER BY created_at DESC').all();
        return json({ success: true, lands: results || [] });
      }
      if (path.includes('/') && method === 'PUT') {
        const id = path.split('/')[1];
        const body: any = await request.json();
        await env.BOB_DB.prepare('UPDATE lands SET share_price=?, monthly_installment=?, total_shares=?, status=? WHERE land_id=?').bind(body.share_price, body.monthly_installment, body.total_shares, body.status || 'Available', id).run().catch(async () => {
          // Fallback update all fields
          for (const k of Object.keys(body)) {
            await env.BOB_DB.prepare(`UPDATE lands SET ${k}=? WHERE land_id=?`).bind(String(body[k]), id).run().catch(()=>{});
          }
        });
        return json({ success: true });
      }
    }

    // DIRECTORS - MAIN FIX
    if (path.startsWith('directors')) {
      if (method === 'GET') {
        const { results } = await env.BOB_DB.prepare('SELECT * FROM directors ORDER BY "order" ASC').all();
        return json({ success: true, directors: results || [] });
      }
      if (method === 'POST') {
        const body: any = await request.json().catch(()=>({}));
        console.log('Director POST body', body);
        if (!body.name) return json({ success: false, message: 'name required' }, 400);
        const id = 'DIR-' + Date.now();
        try {
          await env.BOB_DB.prepare(
            'INSERT INTO directors (director_id, name, designation, phone, email, photo_url, message, "order") VALUES (?,?,?,?,?,?,?,?)'
          ).bind(id, body.name || '', body.designation || '', body.phone || '', body.email || '', body.photo_url || '', body.message || '', Number(body.order) || 1).run();
        } catch (e: any) {
          // Try creating table if not exists
          await env.BOB_DB.prepare(`CREATE TABLE IF NOT EXISTS directors (director_id TEXT PRIMARY KEY, name TEXT, designation TEXT, phone TEXT, email TEXT, photo_url TEXT, message TEXT, "order" INTEGER)`).run();
          await env.BOB_DB.prepare(
            'INSERT INTO directors (director_id, name, designation, phone, email, photo_url, message, "order") VALUES (?,?,?,?,?,?,?,?)'
          ).bind(id, body.name || '', body.designation || '', body.phone || '', body.email || '', body.photo_url || '', body.message || '', Number(body.order) || 1).run();
        }
        return json({ success: true, director_id: id });
      }
      if (method === 'PUT') {
        const dirId = path.split('/')[1];
        const body: any = await request.json();
        await env.BOB_DB.prepare(
          'UPDATE directors SET name=?, designation=?, phone=?, email=?, photo_url=?, message=?, "order"=? WHERE director_id=?'
        ).bind(body.name, body.designation, body.phone, body.email, body.photo_url, body.message, Number(body.order)||1, dirId).run();
        return json({ success: true });
      }
      if (method === 'DELETE') {
        const dirId = path.split('/')[1];
        await env.BOB_DB.prepare('DELETE FROM directors WHERE director_id=?').bind(dirId).run();
        return json({ success: true });
      }
    }

    // GALLERY
    if (path.startsWith('gallery')) {
      const { results } = await env.BOB_DB.prepare('SELECT * FROM gallery ORDER BY date DESC').all().catch(()=>({results:[]})) as any;
      return json({ success: true, gallery: results || [] });
    }

    // NOTIFICATIONS
    if (path.startsWith('notifications')) {
      const { results } = await env.BOB_DB.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all().catch(()=>({results:[]})) as any;
      return json({ success: true, notifications: results || [] });
    }

    // MARKETPLACE
    if (path.startsWith('marketplace') || path.startsWith('member-proposals')) {
      return json({ success: true, offers: [], submissions: [], proposals: [] });
    }

    return json({ success: false, message: 'Route not found: ' + path }, 404);

  } catch (e: any) {
    console.error('API Error', e);
    return json({ success: false, message: e.message, stack: e.stack }, 500);
  }
};
