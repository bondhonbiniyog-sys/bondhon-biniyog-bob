import type {
  SystemSettings,
  Member,
  MonthlyDeposit,
  LumpsumDeposit,
  LandInvestment,
  LandShare,
  LandSaleOffer,
  PublicLandSubmission,
  MemberLandProposal,
  Director,
  GalleryItem,
  DashboardStats,
  AppNotification,
} from '../types';

import {
  initialSystemSettings,
  initialMembers,
  initialMonthlyDeposits,
  initialLumpsumDeposits,
  initialLandInvestments,
  initialLandSaleOffers,
  initialPublicLandSubmissions,
  initialMemberLandProposals,
  initialDirectors,
  initialGalleryItems,
  initialAppNotifications,
} from './initialData';

interface DatabaseSchema {
  settings: SystemSettings;
  members: Member[];
  monthlyDeposits: MonthlyDeposit[];
  lumpsumDeposits: LumpsumDeposit[];
  lands: LandInvestment[];
  saleOffers: LandSaleOffer[];
  submissions: PublicLandSubmission[];
  proposals: MemberLandProposal[];
  directors: Director[];
  gallery: GalleryItem[];
  notifications: AppNotification[];
}

// Cloudflare-Compatible In-Memory Database Singleton (Zero localStorage for database)
let memoryDb: DatabaseSchema = {
  settings: { ...initialSystemSettings },
  members: [...initialMembers],
  monthlyDeposits: [...initialMonthlyDeposits],
  lumpsumDeposits: [...initialLumpsumDeposits],
  lands: [...initialLandInvestments],
  saleOffers: [...initialLandSaleOffers],
  submissions: [...initialPublicLandSubmissions],
  proposals: [...initialMemberLandProposals],
  directors: [...initialDirectors],
  gallery: [...initialGalleryItems],
  notifications: [...initialAppNotifications],
};

function loadDatabase(): DatabaseSchema {
  return memoryDb;
}

function saveDatabase(db: DatabaseSchema) {
  memoryDb = db;
}

function calculateLocalStats(db: DatabaseSchema): DashboardStats {
  const approvedMonthly = db.monthlyDeposits
    .filter((d) => d.status === 'Approved')
    .reduce((sum, d) => sum + d.amount, 0);

  const approvedLumpsum = db.lumpsumDeposits
    .filter((d) => d.status === 'Approved')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalCapital = approvedMonthly + approvedLumpsum;

  const pendingMonthly = db.monthlyDeposits.filter((d) => d.status === 'Pending');
  const pendingLumpsum = db.lumpsumDeposits.filter((d) => d.status === 'Pending');

  const pendingMonthlyAmount = pendingMonthly.reduce((sum, d) => sum + d.amount, 0);
  const pendingLumpsumAmount = pendingLumpsum.reduce((sum, d) => sum + d.amount, 0);

  const totalLandShares = db.lands.reduce((sum, l) => sum + l.total_shares, 0);
  const soldLandShares = db.lands.reduce((sum, l) => sum + l.sold_shares, 0);

  return {
    total_capital: totalCapital,
    total_monthly_capital: approvedMonthly,
    total_lumpsum_capital: approvedLumpsum,
    target_amount: db.settings.target_amount,
    capital_percentage: Math.min(100, Math.round((totalCapital / db.settings.target_amount) * 100)),
    total_members: db.members.length,
    active_members: db.members.filter((m) => m.status === 'Active').length,
    pending_members: db.members.filter((m) => m.status === 'Pending').length,
    blocked_members: db.members.filter((m) => m.status === 'Blocked').length,
    pending_monthly_deposits: pendingMonthly.length,
    pending_lumpsum_deposits: pendingLumpsum.length,
    total_pending_deposits_count: pendingMonthly.length + pendingLumpsum.length,
    total_pending_amount: pendingMonthlyAmount + pendingLumpsumAmount,
    active_lands_count: db.lands.filter((l) => l.status === 'Active').length,
    total_land_shares: totalLandShares,
    sold_land_shares: soldLandShares,
    total_sale_offers: db.saleOffers.length,
    pending_sale_offers: db.saleOffers.filter((o) => o.status === 'Pending').length,
    total_public_submissions: db.submissions.length,
    pending_public_submissions: db.submissions.filter((s) => s.status === 'Pending').length,
    total_member_proposals: db.proposals.length,
    pending_member_proposals: db.proposals.filter((p) => p.status === 'Pending').length,
  };
}

export async function handleLocalApi(
  urlPath: string,
  method: string = 'GET',
  body?: any
): Promise<{ status: number; data: any }> {
  const url = new URL(urlPath, 'http://localhost');
  const pathname = url.pathname;
  const methodUpper = method.toUpperCase();
  const db = loadDatabase();

  // 1. Settings
  if (pathname === '/api/settings') {
    if (methodUpper === 'GET') {
      return { status: 200, data: { success: true, settings: db.settings } };
    }
    if (methodUpper === 'PUT' || methodUpper === 'POST') {
      db.settings = { ...db.settings, ...body };
      saveDatabase(db);
      return { status: 200, data: { success: true, message: 'Settings updated successfully', settings: db.settings } };
    }
  }

  // 2. Stats
  if (pathname === '/api/stats') {
    return { status: 200, data: { success: true, stats: calculateLocalStats(db) } };
  }

  // 3. Auth
  if (pathname === '/api/auth/login' && methodUpper === 'POST') {
    const { email, password, quickAuth, googleAuth, full_name, avatar_url, phone } = body || {};
    if (!email) {
      return { status: 400, data: { success: false, message: 'ইমেইল প্রয়োজন' } };
    }

    let member = db.members.find((m) => m.email.toLowerCase() === email.toLowerCase());

    if (quickAuth || googleAuth) {
      if (!member) {
        const isOwnerAdmin =
          email.toLowerCase() === 'bondhon.biniyog@gmail.com' ||
          email.toLowerCase() === 'admin@bob.com';
        const newMember: Member = {
          member_id: `BoB-${String(db.members.length + 1).padStart(3, '0')}`,
          full_name: full_name || (isOwnerAdmin ? 'বন্ধন ও বিনিয়োগ অ্যাডমিন' : 'সদস্য'),
          email: email.toLowerCase(),
          phone: phone || '+880 1712-345678',
          password_hash: 'cloudflare_oauth_session',
          role: isOwnerAdmin ? 'Admin' : 'Member',
          status: 'Active',
          monthly_target: 5000,
          total_monthly_paid: 0,
          total_lumpsum_paid: 0,
          grand_total_paid: 0,
          due_installments: 0,
          owned_shares: 0,
          has_accepted_terms: true,
          avatar_url:
            avatar_url ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          joined_date: new Date().toISOString().split('T')[0],
        };
        db.members.push(newMember);
        saveDatabase(db);
        member = newMember;
      }

      if (member.status === 'Blocked') {
        return {
          status: 403,
          data: {
            success: false,
            message: 'আপনার অ্যাকাউন্টটি স্থগিত রয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।',
          },
        };
      }

      const { password_hash, ...safeMember } = member;
      return { status: 200, data: { success: true, member: safeMember } };
    }

    if (!password) {
      return { status: 400, data: { success: false, message: 'ইমেইল ও পাসওয়ার্ড প্রয়োজন' } };
    }

    if (!member) {
      return { status: 401, data: { success: false, message: 'সদস্যের ইমেইল খুঁজে পাওয়া যায়নি' } };
    }

    if (member.password_hash !== password) {
      return { status: 401, data: { success: false, message: 'ভুল পাসওয়ার্ড প্রদান করা হয়েছে' } };
    }

    if (member.status === 'Blocked') {
      return { status: 403, data: { success: false, message: 'আপনার অ্যাকাউন্টটি স্থগিত রয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।' } };
    }

    const { password_hash, ...safeMember } = member;
    return { status: 200, data: { success: true, member: safeMember } };
  }

  if (pathname === '/api/auth/register' && methodUpper === 'POST') {
    const { full_name, email, phone, password, monthly_target, live_photo_url } = body || {};
    if (!full_name || !email || !phone || !password) {
      return { status: 400, data: { success: false, message: 'সকল প্রয়োজনীয় তথ্য পূরণ করুন' } };
    }

    const exists = db.members.find((m) => m.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return { status: 409, data: { success: false, message: 'এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট নিবন্ধিত আছে' } };
    }

    const nextId = `BoB-${String(db.members.length + 1).padStart(3, '0')}`;
    const newMember: Member = {
      member_id: nextId,
      full_name,
      email,
      phone,
      password_hash: password,
      live_photo_url: live_photo_url || undefined,
      role: 'Member',
      status: 'Pending',
      monthly_target: Math.max(1000, Number(monthly_target) || 1000),
      total_monthly_paid: 0,
      total_lumpsum_paid: 0,
      grand_total_paid: 0,
      due_installments: 0,
      owned_shares: 0,
      has_accepted_terms: false,
      avatar_url: live_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(full_name)}`,
      joined_date: new Date().toISOString().split('T')[0],
    };

    db.members.push(newMember);
    saveDatabase(db);
    const { password_hash: _, ...safeMember } = newMember;
    return {
      status: 201,
      data: {
        success: true,
        message: 'নিবন্ধন সম্পন্ন হয়েছে! অ্যাকাউন্টটি বর্তমানে অ্যাডমিন অনুমোদনের অপেক্ষায় রয়েছে।',
        member: safeMember,
      },
    };
  }

  if (pathname === '/api/auth/change-credentials' && methodUpper === 'POST') {
    const { current_member_id, new_member_id, email, password, full_name, phone } = body || {};
    const index = db.members.findIndex((m) => m.member_id === current_member_id);
    if (index === -1) {
      return { status: 404, data: { success: false, message: 'সদস্য খুঁজে পাওয়া যায়নি' } };
    }

    if (new_member_id && new_member_id !== current_member_id) {
      const exists = db.members.find((m) => m.member_id === new_member_id);
      if (exists) {
        return { status: 400, data: { success: false, message: 'এই সদস্য আইডি ইতিমধ্যে বিদ্যমান' } };
      }
      db.monthlyDeposits.forEach((d) => {
        if (d.member_id === current_member_id) d.member_id = new_member_id;
      });
      db.lumpsumDeposits.forEach((d) => {
        if (d.member_id === current_member_id) d.member_id = new_member_id;
      });
      db.lands.forEach((l) => {
        l.shares_detail?.forEach((s) => {
          if (s.member_id === current_member_id) s.member_id = new_member_id;
        });
      });
      db.notifications.forEach((n) => {
        if (n.target_member_id === current_member_id) n.target_member_id = new_member_id;
      });
      db.members[index].member_id = new_member_id;
    }

    if (email) {
      const emailConflict = db.members.find(
        (m) => m.email.toLowerCase() === email.toLowerCase() && m.member_id !== db.members[index].member_id
      );
      if (emailConflict) {
        return { status: 400, data: { success: false, message: 'এই ইমেইল ইতিমধ্যে অন্য অ্যাকাউন্টে ব্যবহৃত' } };
      }
      db.members[index].email = email;
    }

    if (password && password.trim()) {
      db.members[index].password_hash = password.trim();
    }
    if (full_name) db.members[index].full_name = full_name;
    if (phone) db.members[index].phone = phone;

    saveDatabase(db);
    const { password_hash: _, ...safeMember } = db.members[index];
    return { status: 200, data: { success: true, message: 'ইউজার আইডি ও পাসওয়ার্ড সফলভাবে আপডেট হয়েছে', member: safeMember } };
  }

  if (pathname === '/api/auth/accept-terms' && methodUpper === 'POST') {
    const { member_id } = body || {};
    const member = db.members.find((m) => m.member_id === member_id);
    if (!member) {
      return { status: 404, data: { success: false, message: 'Member not found' } };
    }
    member.has_accepted_terms = true;
    saveDatabase(db);
    return { status: 200, data: { success: true, message: 'Terms accepted', member } };
  }

  // 4. Members
  if (pathname === '/api/members') {
    if (methodUpper === 'GET') {
      const safeMembers = db.members.map(({ password_hash, ...m }) => m);
      return { status: 200, data: { success: true, members: safeMembers } };
    }
    if (methodUpper === 'POST') {
      const data = body || {};
      const nextId = `BoB-${String(db.members.length + 1).padStart(3, '0')}`;
      const newMember: Member = {
        member_id: nextId,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        password_hash: data.password || 'member123',
        role: data.role || 'Member',
        status: data.status || 'Active',
        monthly_target: Number(data.monthly_target) || 5000,
        total_monthly_paid: Number(data.total_monthly_paid) || 0,
        total_lumpsum_paid: Number(data.total_lumpsum_paid) || 0,
        grand_total_paid: (Number(data.total_monthly_paid) || 0) + (Number(data.total_lumpsum_paid) || 0),
        due_installments: Number(data.due_installments) || 0,
        owned_shares: Number(data.owned_shares) || 0,
        has_accepted_terms: true,
        avatar_url: data.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.full_name)}`,
        joined_date: new Date().toISOString().split('T')[0],
      };
      db.members.push(newMember);
      saveDatabase(db);
      const { password_hash: _, ...safeMember } = newMember;
      return { status: 201, data: { success: true, member: safeMember } };
    }
  }

  // Member by ID
  const memberMatch = pathname.match(/^\/api\/members\/([^/]+)$/);
  if (memberMatch) {
    const id = memberMatch[1];
    const index = db.members.findIndex((m) => m.member_id === id);
    if (index === -1) {
      return { status: 404, data: { success: false, message: 'Member not found' } };
    }

    if (methodUpper === 'PUT' || methodUpper === 'PATCH') {
      const updates = body || {};
      let newMemberId = db.members[index].member_id;
      if (updates.member_id && updates.member_id !== id) {
        const exists = db.members.find((m) => m.member_id === updates.member_id);
        if (exists) {
          return { status: 400, data: { success: false, message: 'এই সদস্য আইডি ইতিমধ্যে অন্য সদস্যের জন্য ব্যবহৃত' } };
        }
        newMemberId = updates.member_id;
        db.monthlyDeposits.forEach((d) => {
          if (d.member_id === id) d.member_id = newMemberId;
        });
        db.lumpsumDeposits.forEach((d) => {
          if (d.member_id === id) d.member_id = newMemberId;
        });
        db.lands.forEach((l) => {
          l.shares_detail?.forEach((s) => {
            if (s.member_id === id) s.member_id = newMemberId;
          });
        });
        db.notifications.forEach((n) => {
          if (n.target_member_id === id) n.target_member_id = newMemberId;
        });
      }

      const totalMonthly = updates.total_monthly_paid !== undefined ? Number(updates.total_monthly_paid) : db.members[index].total_monthly_paid;
      const totalLumpsum = updates.total_lumpsum_paid !== undefined ? Number(updates.total_lumpsum_paid) : db.members[index].total_lumpsum_paid;
      const dueInstallments = updates.due_installments !== undefined ? Number(updates.due_installments) : db.members[index].due_installments;
      const newPasswordHash = updates.password ? updates.password.trim() : (updates.password_hash || db.members[index].password_hash);

      db.members[index] = {
        ...db.members[index],
        ...updates,
        member_id: newMemberId,
        password_hash: newPasswordHash,
        due_installments: dueInstallments,
        total_monthly_paid: totalMonthly,
        total_lumpsum_paid: totalLumpsum,
        grand_total_paid: totalMonthly + totalLumpsum,
      };

      if (dueInstallments > 0) {
        const dueAmount = dueInstallments * (db.members[index].monthly_target || 5000);
        const notifMsg = `সম্মানিত ${db.members[index].full_name}, আপনার ${dueInstallments}টি মাসিক কিস্তি বকেয়া রয়েছে (মোট বকেয়া ৳${dueAmount.toLocaleString('en-US')})। অনুগ্রহ করে দ্রুত পরিশোধ নিশ্চিত করুন।`;
        const existing = db.notifications.find((n) => n.target_member_id === newMemberId && n.type === 'due_installment');
        if (!existing) {
          db.notifications.unshift({
            id: `NOTIF-DUE-${Date.now()}`,
            target_member_id: newMemberId,
            target_role: 'Member',
            type: 'due_installment',
            title: '⚠️ বকেয়া কিস্তি পরিশোধের জরুরি নোটিশ',
            message: notifMsg,
            created_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
            read_by: [],
            link_tab: 'dashboard',
          });
        } else {
          existing.message = notifMsg;
          existing.read_by = [];
        }
      }

      saveDatabase(db);
      const { password_hash: _, ...safeMember } = db.members[index];
      return { status: 200, data: { success: true, message: 'সদস্যের তথ্য সফলভাবে হালনাগাদ হয়েছে', member: safeMember } };
    }

    if (methodUpper === 'DELETE') {
      db.members.splice(index, 1);
      saveDatabase(db);
      return { status: 200, data: { success: true, message: 'সদস্য মুছে ফেলা হয়েছে' } };
    }
  }

  // Member Status
  const memberStatusMatch = pathname.match(/^\/api\/members\/([^/]+)\/status$/);
  if (memberStatusMatch && (methodUpper === 'PUT' || methodUpper === 'PATCH')) {
    const id = memberStatusMatch[1];
    const member = db.members.find((m) => m.member_id === id);
    if (!member) return { status: 404, data: { success: false, message: 'Member not found' } };
    member.status = body?.status || member.status;
    saveDatabase(db);
    return { status: 200, data: { success: true, message: 'Status updated', member } };
  }

  // 5. Monthly Deposits
  if (pathname === '/api/deposits/monthly') {
    if (methodUpper === 'GET') {
      const member_id = url.searchParams.get('member_id');
      const status = url.searchParams.get('status');
      let filtered = [...db.monthlyDeposits];
      if (member_id) filtered = filtered.filter((d) => d.member_id === member_id);
      if (status) filtered = filtered.filter((d) => d.status === status);
      filtered.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
      return { status: 200, data: { success: true, deposits: filtered } };
    }
    if (methodUpper === 'POST') {
      const { member_id, month_year, amount, payment_method, trx_id, voucher_url } = body || {};
      const member = db.members.find((m) => m.member_id === member_id);
      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').slice(0, 16);
      const newDeposit: MonthlyDeposit = {
        deposit_id: `MD-${month_year?.replace('-', '') || '2026'}-${String(db.monthlyDeposits.length + 1).padStart(3, '0')}`,
        member_id,
        member_name: member ? member.full_name : 'Unknown Member',
        month_year,
        amount: Number(amount),
        payment_method,
        trx_id,
        voucher_url: voucher_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        status: 'Pending',
        submitted_at: dateStr,
      };
      db.monthlyDeposits.unshift(newDeposit);
      saveDatabase(db);
      return { status: 201, data: { success: true, message: 'মাসিক কিস্তির ভাউচার সফলভাবে জমা হয়েছে।', deposit: newDeposit } };
    }
  }

  const monthlyStatusMatch = pathname.match(/^\/api\/deposits\/monthly\/([^/]+)\/status$/);
  if (monthlyStatusMatch && (methodUpper === 'PUT' || methodUpper === 'PATCH')) {
    const id = monthlyStatusMatch[1];
    const { status, admin_note, approved_by } = body || {};
    const deposit = db.monthlyDeposits.find((d) => d.deposit_id === id);
    if (!deposit) return { status: 404, data: { success: false, message: 'Deposit not found' } };

    const oldStatus = deposit.status;
    deposit.status = status;
    deposit.admin_note = admin_note || deposit.admin_note;
    deposit.approved_by = approved_by || 'Admin';
    deposit.approved_at = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const member = db.members.find((m) => m.member_id === deposit.member_id);
    if (member) {
      if (oldStatus !== 'Approved' && status === 'Approved') {
        member.total_monthly_paid += deposit.amount;
        member.grand_total_paid += deposit.amount;
        if (member.due_installments > 0) member.due_installments -= 1;
      } else if (oldStatus === 'Approved' && status !== 'Approved') {
        member.total_monthly_paid -= deposit.amount;
        member.grand_total_paid -= deposit.amount;
      }
    }
    saveDatabase(db);
    return { status: 200, data: { success: true, message: `Deposit marked as ${status}`, deposit } };
  }

  // 6. Lumpsum Deposits
  if (pathname === '/api/deposits/lumpsum') {
    if (methodUpper === 'GET') {
      const member_id = url.searchParams.get('member_id');
      const status = url.searchParams.get('status');
      let filtered = [...db.lumpsumDeposits];
      if (member_id) filtered = filtered.filter((d) => d.member_id === member_id);
      if (status) filtered = filtered.filter((d) => d.status === status);
      filtered.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
      return { status: 200, data: { success: true, deposits: filtered } };
    }
    if (methodUpper === 'POST') {
      const { member_id, purpose, amount, target_land_id, payment_method, trx_id, voucher_url } = body || {};
      const member = db.members.find((m) => m.member_id === member_id);
      const land = db.lands.find((l) => l.land_id === target_land_id);
      const now = new Date();
      const dateStr = now.toISOString().replace('T', ' ').slice(0, 16);
      const newDeposit: LumpsumDeposit = {
        lumpsum_id: `LS-2026-${String(db.lumpsumDeposits.length + 1).padStart(3, '0')}`,
        member_id,
        member_name: member ? member.full_name : 'Unknown Member',
        purpose,
        amount: Number(amount),
        target_land_id,
        target_land_name: land ? land.land_name : 'সাধারণ ল্যান্ড ফান্ড',
        payment_method,
        trx_id,
        voucher_url: voucher_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        status: 'Pending',
        submitted_at: dateStr,
      };
      db.lumpsumDeposits.unshift(newDeposit);
      saveDatabase(db);
      return { status: 201, data: { success: true, message: 'এককালীন জমা দাখিল হয়েছে।', deposit: newDeposit } };
    }
  }

  const lumpsumStatusMatch = pathname.match(/^\/api\/deposits\/lumpsum\/([^/]+)\/status$/);
  if (lumpsumStatusMatch && (methodUpper === 'PUT' || methodUpper === 'PATCH')) {
    const id = lumpsumStatusMatch[1];
    const { status, admin_note, approved_by } = body || {};
    const deposit = db.lumpsumDeposits.find((d) => d.lumpsum_id === id);
    if (!deposit) return { status: 404, data: { success: false, message: 'Deposit not found' } };

    const oldStatus = deposit.status;
    deposit.status = status;
    deposit.admin_note = admin_note || deposit.admin_note;
    deposit.approved_by = approved_by || 'Admin';
    deposit.approved_at = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const member = db.members.find((m) => m.member_id === deposit.member_id);
    if (member) {
      if (oldStatus !== 'Approved' && status === 'Approved') {
        member.total_lumpsum_paid += deposit.amount;
        member.grand_total_paid += deposit.amount;
      } else if (oldStatus === 'Approved' && status !== 'Approved') {
        member.total_lumpsum_paid -= deposit.amount;
        member.grand_total_paid -= deposit.amount;
      }
    }
    saveDatabase(db);
    return { status: 200, data: { success: true, message: `Lumpsum deposit marked as ${status}`, deposit } };
  }

  // 7. Lands
  if (pathname === '/api/lands') {
    if (methodUpper === 'GET') {
      return { status: 200, data: { success: true, lands: db.lands } };
    }
    if (methodUpper === 'POST') {
      const data = body || {};
      const nextId = `LAND-${String(db.lands.length + 1).padStart(2, '0')}`;
      const newLand: LandInvestment = {
        land_id: nextId,
        land_name: data.land_name,
        location: data.location,
        area_size: data.area_size,
        purchase_price: Number(data.purchase_price) || 0,
        current_valuation: Number(data.current_valuation) || Number(data.purchase_price) || 0,
        total_shares: Number(data.total_shares) || 50,
        share_price: Number(data.share_price) || 100000,
        sold_shares: Number(data.sold_shares) || 0,
        monthly_installment: Number(data.monthly_installment) || 5000,
        status: data.status || 'Active',
        images: data.images?.length > 0 ? data.images : ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800'],
        description: data.description || '',
        features: Array.isArray(data.features) ? data.features : ['১০০% নিষ্কণ্টক জমি'],
        shares_detail: [],
      };
      db.lands.push(newLand);
      saveDatabase(db);
      return { status: 201, data: { success: true, message: 'Land project created', land: newLand } };
    }
  }

  const landMatch = pathname.match(/^\/api\/lands\/([^/]+)$/);
  if (landMatch && (methodUpper === 'PUT' || methodUpper === 'PATCH')) {
    const id = landMatch[1];
    const index = db.lands.findIndex((l) => l.land_id === id);
    if (index === -1) return { status: 404, data: { success: false, message: 'Land not found' } };
    db.lands[index] = { ...db.lands[index], ...body };
    saveDatabase(db);
    return { status: 200, data: { success: true, message: 'Land updated', land: db.lands[index] } };
  }

  const assignMatch = pathname.match(/^\/api\/lands\/([^/]+)\/assign-shares$/);
  if (assignMatch && methodUpper === 'POST') {
    const id = assignMatch[1];
    const { member_id, share_count, certificate_no } = body || {};
    const land = db.lands.find((l) => l.land_id === id);
    if (!land) return { status: 404, data: { success: false, message: 'Land not found' } };
    const member = db.members.find((m) => m.member_id === member_id);
    if (!member) return { status: 404, data: { success: false, message: 'Member not found' } };

    const count = Number(share_count);
    const remaining = land.total_shares - land.sold_shares;
    if (count > remaining) {
      return { status: 400, data: { success: false, message: `অবশিষ্ট রয়েছে মাত্র ${remaining} টি শেয়ার!` } };
    }

    const shareRecord: LandShare = {
      share_id: `SH-${Date.now()}`,
      land_id: id,
      member_id,
      member_name: member.full_name,
      share_count: count,
      certificate_no: certificate_no || `CERT-${id}-${Date.now().toString().slice(-4)}`,
      assigned_date: new Date().toISOString().split('T')[0],
    };

    if (!land.shares_detail) land.shares_detail = [];
    land.shares_detail.push(shareRecord);
    land.sold_shares += count;
    member.owned_shares += count;
    saveDatabase(db);
    return { status: 200, data: { success: true, message: `${member.full_name}-কে সফলভাবে ${count} টি শেয়ার বরাদ্দ করা হয়েছে!`, land, member } };
  }

  // 8. Marketplace Offers
  if (pathname === '/api/marketplace/offers') {
    if (methodUpper === 'GET') {
      return { status: 200, data: { success: true, offers: db.saleOffers } };
    }
    if (methodUpper === 'POST') {
      const { land_id, buyer_name, address, mobile, email, proposed_price, notes } = body || {};
      const land = db.lands.find((l) => l.land_id === land_id);
      const land_name = land ? land.land_name : 'সাধারণ জমি অনুসন্ধান';
      const newOffer: LandSaleOffer = {
        offer_id: `OFFER-${Date.now()}`,
        land_id: land_id || 'GENERAL',
        land_name,
        buyer_name,
        address: address || '',
        mobile,
        email: email || '',
        proposed_price: Number(proposed_price),
        notes: notes || '',
        status: 'Pending',
        submitted_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
      db.saleOffers.unshift(newOffer);
      db.notifications.unshift({
        id: `NOTIF-OFFER-${Date.now()}`,
        target_member_id: 'ALL',
        target_role: 'ALL',
        type: 'land_offer',
        title: '🏡 নতুন জমি ক্রয়ের প্রস্তাব এসেছে!',
        message: `"${land_name}"-এ ৳${Number(proposed_price).toLocaleString('en-US')}-এর একটি জমি ক্রয়ের প্রস্তাব দাখিল হয়েছে।`,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
        read_by: [],
        link_tab: 'marketplace',
      });
      saveDatabase(db);
      return { status: 201, data: { success: true, message: 'প্রস্তাব সফলভাবে জমা হয়েছে', offer: newOffer } };
    }
  }

  const offerStatusMatch = pathname.match(/^\/api\/marketplace\/offers\/([^/]+)\/status$/);
  if (offerStatusMatch && (methodUpper === 'PUT' || methodUpper === 'PATCH')) {
    const id = offerStatusMatch[1];
    const offer = db.saleOffers.find((o) => o.offer_id === id);
    if (!offer) return { status: 404, data: { success: false, message: 'Offer not found' } };
    offer.status = body?.status || offer.status;
    if (body?.admin_notes) offer.admin_notes = body.admin_notes;
    saveDatabase(db);
    return { status: 200, data: { success: true, message: 'Offer status updated', offer } };
  }

  // 9. Marketplace Submissions
  if (pathname === '/api/marketplace/submissions') {
    if (methodUpper === 'GET') {
      return { status: 200, data: { success: true, submissions: db.submissions } };
    }
    if (methodUpper === 'POST') {
      const { seller_name, address, mobile, email, land_location, land_size, expected_price, description, photos } = body || {};
      const newSub: PublicLandSubmission = {
        submission_id: `SUB-${Date.now()}`,
        seller_name,
        address: address || '',
        mobile,
        email: email || '',
        land_location,
        location: land_location,
        land_size,
        expected_price: Number(expected_price),
        description: description || '',
        photos: Array.isArray(photos) && photos.length > 0 ? photos : ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800'],
        status: 'Pending',
        submitted_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
      db.submissions.unshift(newSub);
      db.notifications.unshift({
        id: `NOTIF-SUB-${Date.now()}`,
        target_member_id: 'ALL',
        target_role: 'ALL',
        type: 'land_submission',
        title: '🗺️ সমবায়ের জন্য নতুন জমি বিক্রির প্রস্তাব দাখিল!',
        message: `${land_location}-এ ${land_size} পরিমাণের জমি বিক্রির প্রস্তাব এসেছে।`,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
        read_by: [],
        link_tab: 'marketplace',
      });
      saveDatabase(db);
      return { status: 201, data: { success: true, message: 'আবেদনটি সফলভাবে জমা হয়েছে', submission: newSub } };
    }
  }

  const subStatusMatch = pathname.match(/^\/api\/marketplace\/submissions\/([^/]+)\/status$/);
  if (subStatusMatch && (methodUpper === 'PUT' || methodUpper === 'PATCH')) {
    const id = subStatusMatch[1];
    const sub = db.submissions.find((s) => s.submission_id === id);
    if (!sub) return { status: 404, data: { success: false, message: 'Submission not found' } };
    sub.status = body?.status || sub.status;
    if (body?.admin_notes) sub.admin_notes = body.admin_notes;
    saveDatabase(db);
    return { status: 200, data: { success: true, message: 'Submission status updated', submission: sub } };
  }

  // 10. Member Proposals
  if (pathname === '/api/member-proposals') {
    if (methodUpper === 'GET') {
      const member_id = url.searchParams.get('member_id');
      const list = member_id ? db.proposals.filter((p) => p.member_id === member_id) : db.proposals;
      return { status: 200, data: { success: true, proposals: list } };
    }
    if (methodUpper === 'POST') {
      const { member_id, member_name, location, land_size, estimated_price, description, photos } = body || {};
      const newProp: MemberLandProposal = {
        proposal_id: `PROP-${Date.now()}`,
        member_id,
        member_name: member_name || 'সদস্য',
        location,
        land_size: land_size || 'অনির্ধারিত',
        estimated_price: Number(estimated_price),
        description: description || '',
        photos: Array.isArray(photos) && photos.length > 0 ? photos : ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800'],
        status: 'Pending',
        submitted_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
      db.proposals.unshift(newProp);
      db.notifications.unshift({
        id: `NOTIF-PROP-${Date.now()}`,
        target_member_id: 'ALL',
        target_role: 'ALL',
        type: 'member_proposal',
        title: '🤝 নতুন প্রকল্প সমবায় প্রস্তাবনা!',
        message: `সদস্য ${newProp.member_name} "${location}"-এ জমি ক্রয়ের প্রস্তাব দাখিল করেছেন।`,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
        read_by: [],
        link_tab: 'marketplace',
      });
      saveDatabase(db);
      return { status: 201, data: { success: true, message: 'প্রস্তাব সফলভাবে দাখিল হয়েছে', proposal: newProp } };
    }
  }

  const propStatusMatch = pathname.match(/^\/api\/member-proposals\/([^/]+)\/status$/);
  if (propStatusMatch && (methodUpper === 'PUT' || methodUpper === 'PATCH')) {
    const id = propStatusMatch[1];
    const prop = db.proposals.find((p) => p.proposal_id === id);
    if (!prop) return { status: 404, data: { success: false, message: 'Proposal not found' } };
    prop.status = body?.status || prop.status;
    if (body?.admin_feedback) prop.admin_feedback = body.admin_feedback;
    saveDatabase(db);
    return { status: 200, data: { success: true, message: 'Proposal status updated', proposal: prop } };
  }

  // 11. Directors
  if (pathname === '/api/directors') {
    if (methodUpper === 'GET') {
      return { status: 200, data: { success: true, directors: db.directors } };
    }
    if (methodUpper === 'POST') {
      const data = body || {};
      const newDir: Director = {
        director_id: `DIR-${String(db.directors.length + 1).padStart(2, '0')}`,
        name: data.name,
        designation: data.designation,
        phone: data.phone || '',
        email: data.email || '',
        photo_url: data.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
        message: data.message || '',
        order: Number(data.order) || db.directors.length + 1,
      };
      db.directors.push(newDir);
      saveDatabase(db);
      return { status: 201, data: { success: true, message: 'পরিচালক যুক্ত হয়েছেন', director: newDir } };
    }
  }

  const dirMatch = pathname.match(/^\/api\/directors\/([^/]+)$/);
  if (dirMatch) {
    const id = dirMatch[1];
    const index = db.directors.findIndex((d) => d.director_id === id);
    if (index === -1) return { status: 404, data: { success: false, message: 'Director not found' } };
    if (methodUpper === 'PUT' || methodUpper === 'PATCH') {
      db.directors[index] = { ...db.directors[index], ...body };
      saveDatabase(db);
      return { status: 200, data: { success: true, message: 'Director updated', director: db.directors[index] } };
    }
    if (methodUpper === 'DELETE') {
      db.directors.splice(index, 1);
      saveDatabase(db);
      return { status: 200, data: { success: true, message: 'Director deleted' } };
    }
  }

  // 12. Gallery
  if (pathname === '/api/gallery') {
    if (methodUpper === 'GET') {
      return { status: 200, data: { success: true, gallery: db.gallery } };
    }
    if (methodUpper === 'POST') {
      const data = body || {};
      const newItem: GalleryItem = {
        id: `GAL-${String(db.gallery.length + 1).padStart(2, '0')}`,
        title: data.title,
        category: data.category || 'সাইট ভিজিট',
        image_url: data.image_url,
        date: data.date || '২০২৬',
        location: data.location || '',
      };
      db.gallery.unshift(newItem);
      saveDatabase(db);
      return { status: 201, data: { success: true, message: 'Gallery item added', item: newItem } };
    }
  }

  const galMatch = pathname.match(/^\/api\/gallery\/([^/]+)$/);
  if (galMatch && methodUpper === 'DELETE') {
    const id = galMatch[1];
    const index = db.gallery.findIndex((g) => g.id === id);
    if (index === -1) return { status: 404, data: { success: false, message: 'Gallery item not found' } };
    db.gallery.splice(index, 1);
    saveDatabase(db);
    return { status: 200, data: { success: true, message: 'Gallery item deleted' } };
  }

  // 13. Notifications
  if (pathname === '/api/notifications') {
    const member_id = url.searchParams.get('member_id');
    let list = [...db.notifications];
    if (member_id) {
      list = list.filter((n) => n.target_member_id === 'ALL' || n.target_member_id === member_id);
    }
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { status: 200, data: { success: true, notifications: list } };
  }

  if (pathname === '/api/notifications/mark-read' && methodUpper === 'POST') {
    const { notification_id, member_id } = body || {};
    const notif = db.notifications.find((n) => n.id === notification_id);
    if (notif) {
      if (!notif.read_by) notif.read_by = [];
      if (!notif.read_by.includes(member_id)) notif.read_by.push(member_id);
      saveDatabase(db);
    }
    return { status: 200, data: { success: true, message: 'Notification marked as read' } };
  }

  if (pathname === '/api/notifications/send-due-alerts' && methodUpper === 'POST') {
    const overdueMembers = db.members.filter((m) => m.due_installments > 0);
    overdueMembers.forEach((m) => {
      const dueAmount = m.due_installments * (m.monthly_target || 5000);
      const msg = `সম্মানিত ${m.full_name}, আপনার ${m.due_installments}টি মাসিক কিস্তি বকেয়া রয়েছে (মোট বকেয়া ৳${dueAmount.toLocaleString('en-US')})। অনুগ্রহ করে দ্রুত পরিশোধ নিশ্চিত করুন।`;
      const existing = db.notifications.find((n) => n.target_member_id === m.member_id && n.type === 'due_installment');
      if (!existing) {
        db.notifications.unshift({
          id: `NOTIF-DUE-${Date.now()}-${m.member_id}`,
          target_member_id: m.member_id,
          target_role: 'Member',
          type: 'due_installment',
          title: '⚠️ বকেয়া কিস্তি পরিশোধের জরুরি নোটিশ',
          message: msg,
          created_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
          read_by: [],
          link_tab: 'dashboard',
        });
      } else {
        existing.message = msg;
        existing.read_by = [];
      }
    });
    saveDatabase(db);
    return { status: 200, data: { success: true, message: `${overdueMembers.length} জন বকেয়া সদস্যের প্রোফাইলে সতর্কবার্তা ও নোটিফিকেশন পাঠানো হয়েছে।` } };
  }

  return { status: 404, data: { success: false, message: 'Route not found in local backend' } };
}
