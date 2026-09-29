import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
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
} from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Cloudflare R2 Cloud Object Storage Catalog
let r2Files: any[] = [
  {
    id: 'r2-doc-01',
    name: 'পূর্বাচল_সেক্টর_২১_জমির_নকশা_দলিল.pdf',
    size: 245000,
    mimeType: 'application/pdf',
    url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
    category: 'land',
    uploadedAt: '2026-01-10T12:00:00Z',
  },
  {
    id: 'r2-doc-02',
    name: 'অফিসিয়াল_বন্ধন_সমিতি_লোগো.png',
    size: 54000,
    mimeType: 'image/png',
    url: '/bob-logo.png',
    category: 'logo',
    uploadedAt: '2026-01-05T09:30:00Z',
  }
];

// Active WebSocket clients set for Realtime broadcast
let realtimeClients: Set<WebSocket> = new Set();

export function broadcastRealtime(type: string, payload?: any) {
  const msg = JSON.stringify({
    type,
    payload,
    timestamp: new Date().toISOString(),
  });
  realtimeClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(msg);
      } catch (e) {}
    }
  });
}

// Intercept all mutating requests to broadcast realtime updates across all devices
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.path.startsWith('/api/')) {
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Trigger broadcast on successful mutation
      if (res.statusCode >= 200 && res.statusCode < 300) {
        let eventType = 'DATABASE_MUTATION';
        if (req.path.includes('/members')) eventType = 'MEMBERS_CHANGED';
        else if (req.path.includes('/deposits')) eventType = 'DEPOSIT_APPROVED';
        else if (req.path.includes('/settings')) eventType = 'SETTINGS_UPDATED';
        else if (req.path.includes('/directors')) eventType = 'DIRECTORS_UPDATED';
        else if (req.path.includes('/lands')) eventType = 'LANDS_UPDATED';
        broadcastRealtime(eventType, { path: req.path, method: req.method });
      }
      return originalJson(body);
    };
  }
  next();
});

// ============================================================================
// IN-MEMORY DATABASE WITH REALISTIC DATA
// ============================================================================

let systemSettings: SystemSettings = {
  id: 'bob-settings-main',
  project_title: 'বন্ধন ও বিনিয়োগ (BONDHON O BINIYOG)',
  slogan_bengali: 'যৌথ স্বপ্ন • নিশ্চিত ভবিষ্যৎ',
  logo_url: '/bob-logo.png',
  notice_bengali: 'জরুরি নোটিশ: ২০২৬ অর্থ-বছরের জন্য পূর্বাচল সেক্টর ২১ সংলগ্ন ১০ কাঠা জমির অবশিষ্ট ১২টি শেয়ার বরাদ্দ কার্যক্রম চলছে। মাসিক কিস্তির অর্থ প্রতি মাসের ১০ তারিখের মধ্যে জমা দেওয়ার জন্য অনুরোধ করা যাচ্ছে।',
  banner_ad_active: true,
  banner_ad_badge: 'বিশেষ অফার ও বোনাস লট',
  banner_ad_text: 'ঈদ স্পেশাল অফার: পূর্বাচল প্রজেক্টে এই মাসে নতুন শেয়ার বুকিং করলেই পাচ্ছেন সাব-কবলা রেজিস্ট্রেশনে বিশেষ ছাড় ও অগ্রাধিকারমূলক লট বণ্টন!',
  banner_ad_image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80',
  banner_ad_validity: '৩০ অক্টোবর ২০২৬ পর্যন্ত প্রযোজ্য',
  banner_ad_action_text: 'এখনই অফারটি গ্রহণ করুন',
  hero_title: 'যৌথ বিনিয়োগে ভূমির মালিকানা, নিশ্চিত ভবিষ্যৎ ও সমৃদ্ধ আগামী',
  hero_subtitle: 'বন্ধন ও বিনিয়োগ (BoB) হলো একটি বিশ্বস্ত সমবায় ভূমি বিনিয়োগ উদ্যোগ। ক্ষুদ্র ক্ষুদ্র মাসিক সঞ্চয় ও সদস্যদের এককালীন যৌথ বিনিয়োগে আমরা লাভজনক ও ঝামেলামুক্ত ভূমি প্রকল্পের মালিকানা নিশ্চিত করি।',
  target_amount: 10000000, // ১ কোটি টাকা
  project_vision: 'বন্ধন ও বিনিয়োগ (BoB) হলো একটি বিশ্বস্ত সমবায় ভূমি বিনিয়োগ উদ্যোগ। ক্ষুদ্র ক্ষুদ্র মাসিক সঞ্চয় ও সদস্যদের এককালীন যৌথ বিনিয়োগে আমরা লাভজনক ও ঝামেলামুক্ত ভূমি প্রকল্পের মালিকানা নিশ্চিত করি। সম্পূর্ণ স্বচ্ছ হিসাবনিকাশ, সরকারি দলিল সম্পাদন এবং সমবন্টনই আমাদের মূল অঙ্গীকার।',
  contact_phone_1: '+880 1712-345678',
  contact_phone_2: '+880 1890-123456',
  contact_whatsapp: '+880 1712-345678',
  contact_email: 'bondhon.biniyog@gmail.com',
  contact_address: 'বাড়ি নং ১২, রোড নং ৫, ব্লক-ডি, বসুন্ধরা আ/এ, ঢাকা-১২২৯',
  call_cta_phone: '+880 1712-345678',
  call_cta_text: 'সরাসরি কল করুন (অফিস ও হটলাইন)',
  call_cta_timing: 'সকাল ৯:০০ টা থেকে রাত ১০:০০ টা (সপ্তাহের ৭ দিন)',
  management_lead: 'সজিব মোল্লা',
  management_lead_designation: 'ব্যবস্থাপনা পরিচালক ও প্রধান সমন্বয়ক',
  management_lead_phone: '+880 1712-345678',
  footer_text: '© 2026 বন্ধন ও বিনিয়োগ (BONDHON O BINIYOG)। সর্বস্বত্ব সংরক্ষিত। ব্যবস্থাপনায়— সজিব মোল্লা।',
  voucher_signature_url: 'https://api.dicebear.com/7.x/initials/svg?seed=Sajib+Molla&backgroundColor=transparent&textColor=1e3a8a',
  voucher_signatory_name: 'সজিব মোল্লা',
  voucher_signatory_title: 'ব্যবস্থাপনা পরিচালক ও প্রধান সমন্বয়ক',
  voucher_seal_text: 'বন্ধন ও বিনিয়োগ অনুমোদিত ডিজিটাল সিল',
  payment_bank_name: 'BRAC Bank PLC (ব্র্যাক ব্যাংক পিএলসি)',
  payment_bank_account_name: 'BONDHON O BINIYOG (বন্ধন ও বিনিয়োগ)',
  payment_bank_account_no: '1501-2049-88001',
  payment_bank_branch: 'বসুন্ধরা / গুলশান শাখা, ঢাকা',
  payment_bank_routing: '060261789',
  payment_bkash_no: '01712-345678 (মার্চেন্ট পেমেন্ট)',
  payment_nagad_no: '01890-123456 (ব্যক্তিগত / ক্যাশ-ইন)',
  payment_rocket_no: '01712-345678-0 (মার্চেন্ট)',
  payment_instructions: 'বিকাশ/নগদ/রকেটে Payment অথবা ব্যাংক অ্যাকাউন্টে জমা করার পর প্রাপ্ত Transaction ID (TrxID) এবং ডিপোজিট স্লিপের ছবি/স্ক্রিনশট আপলোড করে ভাউচার দাখিল করুন। অ্যাডমিন অনুমোদনের সাথে সাথে আপনার অ্যাকাউন্টে টাকা জমা হবে ও ডিজিটাল রসিদ ইস্যু হবে।',
};

let members: Member[] = [
  {
    member_id: 'BoB-001',
    full_name: 'সজিব মোল্লা (অ্যাডমিন)',
    email: 'admin@bob.com',
    phone: '+880 1712-345678',
    password_hash: 'admin123',
    role: 'Admin',
    status: 'Active',
    monthly_target: 10000,
    total_monthly_paid: 120000,
    total_lumpsum_paid: 300000,
    grand_total_paid: 420000,
    due_installments: 0,
    owned_shares: 5,
    has_accepted_terms: true,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    joined_date: '2025-01-01',
  },
  {
    member_id: 'BoB-002',
    full_name: 'মোহাম্মদ তানভীর আহমেদ',
    email: 'tanvir@bob.com',
    phone: '+880 1819-987654',
    password_hash: 'member123',
    role: 'Member',
    status: 'Active',
    monthly_target: 5000,
    total_monthly_paid: 60000,
    total_lumpsum_paid: 200000,
    grand_total_paid: 260000,
    due_installments: 0,
    owned_shares: 3,
    has_accepted_terms: true,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    joined_date: '2025-02-15',
  },
  {
    member_id: 'BoB-003',
    full_name: 'নুসরাত জাহান',
    email: 'nusrat@bob.com',
    phone: '+880 1911-223344',
    password_hash: 'member123',
    role: 'Member',
    status: 'Active',
    monthly_target: 5000,
    total_monthly_paid: 45000,
    total_lumpsum_paid: 100000,
    grand_total_paid: 145000,
    due_installments: 1,
    owned_shares: 2,
    has_accepted_terms: true,
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    joined_date: '2025-03-10',
  },
  {
    member_id: 'BoB-004',
    full_name: 'মোঃ কামরুল হাসান',
    email: 'kamrul@bob.com',
    phone: '+880 1622-556677',
    password_hash: 'member123',
    role: 'Member',
    status: 'Active',
    monthly_target: 5000,
    total_monthly_paid: 30000,
    total_lumpsum_paid: 100000,
    grand_total_paid: 130000,
    due_installments: 0,
    owned_shares: 1,
    has_accepted_terms: true,
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    joined_date: '2025-04-05',
  },
  {
    member_id: 'BoB-005',
    full_name: 'আব্দুর রহিম (নতুন আবেদন)',
    email: 'rahim@bob.com',
    phone: '+880 1533-889900',
    password_hash: 'member123',
    role: 'Member',
    status: 'Pending',
    monthly_target: 5000,
    total_monthly_paid: 0,
    total_lumpsum_paid: 0,
    grand_total_paid: 0,
    due_installments: 0,
    owned_shares: 0,
    has_accepted_terms: false,
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    joined_date: '2026-09-20',
  }
];

let monthlyDeposits: MonthlyDeposit[] = [
  {
    deposit_id: 'MD-202609-01',
    member_id: 'BoB-001',
    member_name: 'সজিব মোল্লা (অ্যাডমিন)',
    month_year: '2026-09',
    amount: 10000,
    payment_method: 'Bank',
    trx_id: 'EBL-TRX-9988221',
    voucher_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    status: 'Approved',
    submitted_at: '2026-09-02 11:30',
    approved_by: 'System Admin',
    approved_at: '2026-09-02 12:00',
    admin_note: 'Verified with Bank Statement',
  },
  {
    deposit_id: 'MD-202609-02',
    member_id: 'BoB-002',
    member_name: 'মোহাম্মদ তানভীর আহমেদ',
    month_year: '2026-09',
    amount: 5000,
    payment_method: 'bKash',
    trx_id: 'BK9A772X51',
    voucher_url: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600&auto=format&fit=crop&q=80',
    status: 'Approved',
    submitted_at: '2026-09-05 14:15',
    approved_by: 'System Admin',
    approved_at: '2026-09-05 15:00',
    admin_note: 'bKash Merchant Verified',
  },
  {
    deposit_id: 'MD-202609-03',
    member_id: 'BoB-003',
    member_name: 'নুসরাত জাহান',
    month_year: '2026-09',
    amount: 5000,
    payment_method: 'Nagad',
    trx_id: 'NGD8841029',
    voucher_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    status: 'Pending',
    submitted_at: '2026-09-24 16:45',
  },
  {
    deposit_id: 'MD-202609-04',
    member_id: 'BoB-004',
    member_name: 'মোঃ কামরুল হাসান',
    month_year: '2026-09',
    amount: 5000,
    payment_method: 'bKash',
    trx_id: 'BK3M991A80',
    voucher_url: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600&auto=format&fit=crop&q=80',
    status: 'Pending',
    submitted_at: '2026-09-24 18:20',
  }
];

let lumpsumDeposits: LumpsumDeposit[] = [
  {
    lumpsum_id: 'LS-2026-001',
    member_id: 'BoB-001',
    member_name: 'সজিব মোল্লা (অ্যাডমিন)',
    purpose: 'পূর্বাচল গ্রিন সিটি ভিউ প্রজেক্ট - ৩টি শেয়ার ক্রয় বাবদ',
    amount: 300000,
    target_land_id: 'LAND-01',
    target_land_name: 'পূর্বাচল গ্রিন সিটি ভিউ প্রজেক্ট',
    payment_method: 'Bank',
    trx_id: 'BRAC-TRX-443311',
    voucher_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    status: 'Approved',
    submitted_at: '2026-05-10 10:00',
    approved_by: 'System Admin',
    approved_at: '2026-05-10 11:30',
    admin_note: 'Approved. Shares certificate issued #CERT-01',
  },
  {
    lumpsum_id: 'LS-2026-002',
    member_id: 'BoB-002',
    member_name: 'মোহাম্মদ তানভীর আহমেদ',
    purpose: 'পদ্মা সেতু হাইওয়ে অ্যাগ্রো ল্যান্ড - ২টি শেয়ার বাবদ',
    amount: 200000,
    target_land_id: 'LAND-02',
    target_land_name: 'পদ্মা সেতু হাইওয়ে অ্যাগ্রো ও রিসোর্ট ল্যান্ড',
    payment_method: 'Bank',
    trx_id: 'CITY-TRX-776655',
    voucher_url: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600&auto=format&fit=crop&q=80',
    status: 'Approved',
    submitted_at: '2026-06-15 15:30',
    approved_by: 'System Admin',
    approved_at: '2026-06-15 16:00',
    admin_note: 'Approved. Shares certificate issued #CERT-02',
  },
  {
    lumpsum_id: 'LS-2026-003',
    member_id: 'BoB-003',
    member_name: 'নুসরাত জাহান',
    purpose: 'পূর্বাচল প্রজেক্ট - ১টি অতিরিক্ত শেয়ার বুকিং',
    amount: 100000,
    target_land_id: 'LAND-01',
    target_land_name: 'পূর্বাচল গ্রিন সিটি ভিউ প্রজেক্ট',
    payment_method: 'Bank',
    trx_id: 'DBBL-TRX-102938',
    voucher_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
    status: 'Pending',
    submitted_at: '2026-09-24 19:10',
  }
];

let landInvestments: LandInvestment[] = [
  {
    land_id: 'LAND-01',
    land_name: 'পূর্বাচল গ্রিন সিটি ভিউ প্রজেক্ট',
    location: 'পূর্বাচল সেক্টর ২১ সংলগ্ন, ৩০০ ফিট এক্সপ্রেসওয়ে, ঢাকা',
    area_size: '১০ কাঠা (প্রাইম কমার্শিয়াল ও রেসিডেন্সিয়াল প্লট)',
    purchase_price: 5000000, // ৫০ লাখ
    current_valuation: 6500000, // ৬৫ লাখ বর্তমান বাজারমূল্য
    total_shares: 50,
    share_price: 100000,
    sold_shares: 38,
    monthly_installment: 5000,
    status: 'Active',
    sale_status: 'Available_For_Sale',
    public_asking_price: 6800000,
    images: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&auto=format&fit=crop&q=80',
    ],
    description: 'রাজউকের পূর্বাচল নতুন শহরের প্রাণকেন্দ্রে অবস্থিত এই জমিটি দ্রুত বর্ধনশীল এবং শতভাগ নিষ্কণ্টক। ৩০০ ফিট এক্সপ্রেসওয়ে থেকে মাত্র ৫ মিনিটের দূরত্ব। ভবিষ্যতে বহুতল বাণিজ্যিক বা বিলাসবহুল আবাসন প্রকল্পের জন্য অত্যন্ত উপযোগী।',
    features: ['১০০% নিষ্কণ্টক সিএস/আরএস/সিটি জরিপ সম্পন্ন', '৪০ ফুট প্রশস্ত প্রধান পাকা রাস্তা সংলগ্ন', 'বিদ্যুৎ, গ্যাস ও সাব-স্টেশন সংযোগ জোন', 'উচ্চ ভবিষ্যৎ মূলধন বৃদ্ধি সম্ভাবনা (বার্ষিক ১৮-২২%)'],
    shares_detail: [
      { share_id: 'S-01', land_id: 'LAND-01', member_id: 'BoB-001', member_name: 'সজিব মোল্লা', share_count: 5, certificate_no: 'CERT-P01-001', assigned_date: '2025-05-12' },
      { share_id: 'S-02', land_id: 'LAND-01', member_id: 'BoB-002', member_name: 'মোহাম্মদ তানভীর আহমেদ', share_count: 3, certificate_no: 'CERT-P01-002', assigned_date: '2025-06-15' },
      { share_id: 'S-03', land_id: 'LAND-01', member_id: 'BoB-003', member_name: 'নুসরাত জাহান', share_count: 2, certificate_no: 'CERT-P01-003', assigned_date: '2025-07-20' },
      { share_id: 'S-04', land_id: 'LAND-01', member_id: 'BoB-004', member_name: 'মোঃ কামরুল হাসান', share_count: 1, certificate_no: 'CERT-P01-004', assigned_date: '2025-08-10' },
    ],
  },
  {
    land_id: 'LAND-02',
    land_name: 'পদ্মা সেতু হাইওয়ে অ্যাগ্রো ও রিসোর্ট ল্যান্ড',
    location: 'মাওয়া এক্সপ্রেসওয়ে টোলপ্লাজা সংলগ্ন, মুন্সীগঞ্জ',
    area_size: '৩ বিঘা (৬০ কাঠা উন্মুক্ত সমতল ভূমি)',
    purchase_price: 7500000,
    current_valuation: 9200000,
    total_shares: 75,
    share_price: 100000,
    sold_shares: 42,
    monthly_installment: 5000,
    status: 'Active',
    sale_status: 'Available_For_Sale',
    public_asking_price: 9500000,
    images: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80',
    ],
    description: 'ঢাকা-মাওয়া এক্সপ্রেসওয়ের অত্যন্ত কাছে অবস্থিত এই প্রাকৃতিক মনোরম জমিটি ইকো-রিসোর্ট, এগ্রো ট্যুরিজম ও দীর্ঘমেয়াদী ল্যান্ড ব্যাংকিং এর জন্য উপযুক্ত। পদ্মা সেতু চালুর পর এই অঞ্চলের ভূমির দাম দ্রুত গতিতে বৃদ্ধি পাচ্ছে।',
    features: ['পদ্মা এক্সপ্রেসওয়ে সংযোগ সড়ক', 'বন্যা ও জলাবদ্ধতা মুক্ত উঁচু উর্বর জমি', 'ইকো-রিসোর্ট বা এগ্রিকালচারাল ফার্মিং উপযোগী', 'বাৎসরিক প্রত্যাশিত মূলধনী মুনাফা ২০% পর্যন্ত'],
    shares_detail: [
      { share_id: 'S-05', land_id: 'LAND-02', member_id: 'BoB-001', member_name: 'সজিব মোল্লা', share_count: 4, certificate_no: 'CERT-M02-001', assigned_date: '2025-08-01' },
      { share_id: 'S-06', land_id: 'LAND-02', member_id: 'BoB-002', member_name: 'মোহাম্মদ তানভীর আহমেদ', share_count: 2, certificate_no: 'CERT-M02-002', assigned_date: '2025-09-01' },
    ],
  },
  {
    land_id: 'LAND-03',
    land_name: 'সাভার হেমায়েতপুর লজিস্টিক হাব প্লট',
    location: 'হেমায়েতপুর বাসস্ট্যান্ড সংলগ্ন, সাভার, ঢাকা',
    area_size: '১৫ কাঠা (বাণিজ্যিক ও ওয়্যারহাউজ স্পট)',
    purchase_price: 6000000,
    current_valuation: 7800000,
    total_shares: 60,
    share_price: 100000,
    sold_shares: 25,
    monthly_installment: 7500,
    status: 'In Discussion',
    sale_status: 'Under_Offer',
    public_asking_price: 8000000,
    images: [
      'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80',
    ],
    description: 'ঢাকার প্রবেশদ্বারে সাভারের ব্যস্ত বাণিজ্যিক এলাকায় গোডাউন ও ওয়্যারহাউজ তৈরির জন্য নির্ধারিত প্রকল্প। বায়না চুক্তি সম্পন্ন হয়েছে, রেজিস্ট্রি প্রক্রিয়াধীন।',
    features: ['ভারী যানবাহন ও ট্রেলার চলাচলের প্রশস্ত প্রবেশপথ', 'শিল্প ও বাণিজ্যিক বিদ্যুতের সরাসরি সুবিধা', 'মাসিক নিয়মিত ভাড়া আয়ের সর্বোচ্চ সম্ভাবনা'],
    shares_detail: [],
  }
];

let landSaleOffers: LandSaleOffer[] = [
  {
    offer_id: 'BUY-OFFER-101',
    land_id: 'LAND-01',
    land_name: 'পূর্বাচল গ্রিন সিটি ভিউ প্রজেক্ট',
    buyer_name: 'ইঞ্জিনিয়ার মোস্তাফিজুর রহমান',
    address: 'বাড়ি ১২, রোড ৫, ধানমন্ডি, ঢাকা',
    mobile: '+880 1711-223344',
    proposed_price: 6600000,
    notes: 'পুরো প্লট এককালীন বায়না দলিলের মাধ্যমে কিনতে আগ্রহী। সরেজমিন পরিদর্শনের সময় নির্ধারণ করতে অনুরোধ করছি।',
    status: 'Pending',
    submitted_at: '2026-09-24 15:20',
  },
  {
    offer_id: 'BUY-OFFER-102',
    land_id: 'LAND-02',
    land_name: 'পদ্মা সেতু হাইওয়ে অ্যাগ্রো ও রিসোর্ট ল্যান্ড',
    buyer_name: 'হাসান চৌধুরী (গ্রিন রিসোর্টস লিমিটেড)',
    address: 'গুলশান ২, ঢাকা',
    mobile: '+880 1819-556677',
    proposed_price: 9300000,
    notes: 'রিসোর্ট প্রকল্পের জন্য জমিটি খুবই উপযোগী মনে হয়েছে। মালিকানা সংক্রান্ত কাগজপত্রের কপি দরকার।',
    status: 'Contacted',
    submitted_at: '2026-09-22 18:40',
  }
];

let publicLandSubmissions: PublicLandSubmission[] = [
  {
    submission_id: 'SELL-SUB-201',
    seller_name: 'হাজী রফিকুল ইসলাম',
    address: 'কেরানীগঞ্জ, ঢাকা',
    mobile: '+880 1912-334455',
    land_size: '৭ কাঠা উঁচু ভিটামাটি',
    location: 'কেরানীগঞ্জ রোহিতপুর বাজার সংলগ্ন পাকা রাস্তা',
    expected_price: 4500000,
    photos: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'Pending',
    submitted_at: '2026-09-24 12:15',
    admin_notes: 'দলিলপত্র সিএস/আরএস খতিয়ান যাচাই করা প্রয়োজন।',
  },
  {
    submission_id: 'SELL-SUB-202',
    seller_name: 'আনিসুর রহমান',
    address: 'গাজীপুর সদর, গাজীপুর',
    mobile: '+880 1611-889900',
    land_size: '১.৫ বিঘা সমতল কৃষি ও বাণিজ্যিক উপযোগী জমি',
    location: 'ঢাকা-ময়মনসিংহ মহাসড়কের ১ কিমি ভেতরে',
    expected_price: 6000000,
    photos: [
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'Under Review',
    submitted_at: '2026-09-20 10:30',
    admin_notes: 'সাইট ভিজিট সম্পন্ন হয়েছে। জমির অবস্থান ভালো।',
  }
];

let memberLandProposals: MemberLandProposal[] = [
  {
    proposal_id: 'MEM-PROP-301',
    member_id: 'BoB-002',
    member_name: 'মোহাম্মদ তানভীর আহমেদ',
    location: 'মুন্সীগঞ্জ সিরাজদিখান হাইওয়ে সংলগ্ন',
    land_size: '২ বিঘা',
    estimated_price: 4000000,
    description: 'আমার এলাকার সংলগ্ন এই জমিটি সমবায় উদ্যোগে ক্রয় করে প্লটিং বা ইকোফার্মিং করলে সদস্যরা অত্যন্ত লাভবান হবেন। বিক্রেতা অবিলম্বে বায়না করতে প্রস্তুত।',
    photos: [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'Pending',
    submitted_at: '2026-09-23 14:00',
  }
];

let directors: Director[] = [
  {
    director_id: 'DIR-01',
    name: 'সজিব মোল্লা',
    designation: 'ব্যবস্থাপনা পরিচালক ও প্রধান সমন্বয়ক',
    phone: '+880 1712-345678',
    email: 'sajib.molla@bob.com',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    message: 'আমাদের লক্ষ্য প্রতিটি মধ্যবিত্ত ও পেশাজীবীর জন্য নির্ভেজাল ভূমিতে যৌথ মালিকানার একটি নিরাপদ, স্বচ্ছ ও লাভজনক প্ল্যাটফর্ম তৈরি করা। সততা ও অঙ্গীকারই বন্ধন ও বিনিয়োগের ভিত্তি।',
    order: 1,
  },
  {
    director_id: 'DIR-02',
    name: 'মোহাম্মদ ইকবাল হোসেন',
    designation: 'পরিচালক (প্রকল্প ও ভূমি ব্যবস্থাপনা)',
    phone: '+880 1819-123456',
    email: 'iqbal.hossain@bob.com',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    message: 'জমি নির্বাচন থেকে শুরু করে কাগজপত্র যাচাই, নামজারি ও সীমানা নির্ধারণ— প্রতিটি ধাপে আমরা শতভাগ সতর্কতা ও আইনগত সঠিকতা নিশ্চিত করি।',
    order: 2,
  },
  {
    director_id: 'DIR-03',
    name: 'অ্যাডভোকেট তানভীর আহমেদ',
    designation: 'পরিচালক (আইন ও নিবন্ধন বিষয়ক)',
    phone: '+880 1911-987654',
    email: 'adv.tanvir@bob.com',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    message: 'প্রতিটি সদস্যের বিনিয়োগের নিরাপত্তা বিধানে সুনির্দিষ্ট স্ট্যাম্প চুক্তি, সাব-কবলা দলিল ও শেয়ার সনদের মাধ্যমে বৈধ আইনি কাঠামো প্রয়োগ করা হয়।',
    order: 3,
  },
  {
    director_id: 'DIR-04',
    name: 'ফারহানা আকতার',
    designation: 'পরিচালক (অর্থ ও অডিট কমিটি)',
    phone: '+880 1622-334455',
    email: 'farhana.audit@bob.com',
    photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    message: 'প্রতিটি টাকা ব্যাংকিং চ্যানেলে জমা হয়। মাসিক আর্থিক বিবরণী সদস্যদের ড্যাশবোর্ডে উন্মুক্ত রাখা আমাদের জিরো-টরারেন্স স্বচ্ছতার প্রমাণ।',
    order: 4,
  }
];

let galleryItems: GalleryItem[] = [
  {
    id: 'GAL-01',
    title: 'পূর্বাচল প্রজেক্টের সাইট পরিদর্শন ও সীমানা পিলার স্থাপন',
    category: 'ভূমি জরিপ ও সাইট ভিজিট',
    image_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
    date: '২০২৬ সালের জানুয়ারি',
    location: 'পূর্বাচল সেক্টর ২১, ঢাকা',
  },
  {
    id: 'GAL-02',
    title: 'মৌজা ম্যাপ ও দলিলপত্র যৌথ যাচাইকরণ সভা',
    category: 'আইনি নিরীক্ষা',
    image_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80',
    date: '২০২৬ সালের ফেব্রুয়ারি',
    location: 'BoB প্রধান কার্যালয়, ঢাকা',
  },
  {
    id: 'GAL-03',
    title: 'পদ্মা হাইওয়ে এগ্রো ল্যান্ডের বার্ষিক সদস্য মিলনমেলা',
    category: 'সদস্য সম্মেলন',
    image_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=80',
    date: '২০২৬ সালের মে',
    location: 'মাওয়া হাইওয়ে রিসোর্ট প্রাঙ্গণ',
  },
  {
    id: 'GAL-04',
    title: 'সাব-রেজিস্ট্রি অফিসে যৌথ বায়না দলিল সম্পাদন',
    category: 'দলিল সম্পাদন',
    image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80',
    date: '২০২৬ সালের জুলাই',
    location: 'রূপগঞ্জ সাব-রেজিস্ট্রি অফিস',
  },
  {
    id: 'GAL-05',
    title: 'ডিজিটাল নকশা প্রণয়ন ও আধুনিক প্ল্যানিং পর্যালোচনা',
    category: 'প্রকৌশল ও নকশা',
    image_url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80',
    date: '২০২৬ সালের আগস্ট',
    location: 'BoB কনফারেন্স রুম',
  },
  {
    id: 'GAL-06',
    title: 'নতুন ভূমি প্রকল্পের মাটি পরীক্ষা ও ড্রেজিং সার্ভে',
    category: 'ভূমি জরিপ',
    image_url: 'https://images.unsplash.com/photo-1498084393753-b411b2d26b34?w=800&auto=format&fit=crop&q=80',
    date: '২০২৬ সালের সেপ্টেম্বর',
    location: 'হেমায়েতপুর, সাভার',
  }
];

let appNotifications: AppNotification[] = [
  {
    id: 'NOTIF-01',
    target_member_id: 'BoB-003',
    target_role: 'Member',
    type: 'due_installment',
    title: '⚠️ বকেয়া কিস্তি পরিশোধ নোটিশ',
    message: 'সম্মানিত নুসরাত জাহান, আপনার ১টি মাসিক কিস্তি বকেয়া রয়েছে (মোট বকেয়া ৳৫,০০০)। অনুগ্রহ করে প্রতি মাসের ১০ তারিখের মধ্যে বকেয়া পরিশোধ নিশ্চিত করুন।',
    created_at: '2026-09-24 10:00',
    read_by: [],
    link_tab: 'dashboard',
  },
  {
    id: 'NOTIF-02',
    target_member_id: 'ALL',
    target_role: 'ALL',
    type: 'land_offer',
    title: '🏡 নতুন জমি ক্রয়ের প্রস্তাব এসেছে!',
    message: 'পূর্বাচল গ্রিন সিটি ভিউ প্রজেক্ট-এ ইঞ্জিনিয়ার মোস্তাফিজুর রহমান ৳৬৬,০০,০০০-এর ক্রয়ের প্রস্তাব দাখিল করেছেন। বিস্তারিত বিবেচনাধীন।',
    created_at: '2026-09-24 15:20',
    read_by: [],
    link_tab: 'marketplace',
  },
  {
    id: 'NOTIF-03',
    target_member_id: 'ALL',
    target_role: 'ALL',
    type: 'land_submission',
    title: '🗺️ সমবায়ের জন্য নতুন জমি বিক্রির প্রস্তাব দাখিল!',
    message: 'কেরানীগঞ্জ রোহিতপুর বাজার সংলগ্ন পাকা রাস্তা সংলগ্ন ৭ কাঠা উঁচু জমি বিক্রির প্রস্তাব জমা হয়েছে (প্রত্যাশিত মূল্য: ৳৪৫ লাখ)।',
    created_at: '2026-09-24 12:15',
    read_by: [],
    link_tab: 'marketplace',
  },
  {
    id: 'NOTIF-04',
    target_member_id: 'ALL',
    target_role: 'ALL',
    type: 'member_proposal',
    title: '🤝 নতুন প্রকল্প সমবায় প্রস্তাবনা!',
    message: 'সদস্য মোহাম্মদ তানভীর আহমেদ "মুন্সীগঞ্জ সিরাজদিখান হাইওয়ে সংলগ্ন" ২ বিঘা নতুন সমবায় জমি ক্রয়ের প্রস্তাব দাখিল করেছেন।',
    created_at: '2026-09-23 14:00',
    read_by: [],
    link_tab: 'marketplace',
  }
];

// Helper: Calculate statistics
function calculateStats(): DashboardStats {
  const approvedMonthly = monthlyDeposits
    .filter((d) => d.status === 'Approved')
    .reduce((sum, d) => sum + d.amount, 0);

  const approvedLumpsum = lumpsumDeposits
    .filter((d) => d.status === 'Approved')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalCapital = approvedMonthly + approvedLumpsum;

  const pendingMonthly = monthlyDeposits.filter((d) => d.status === 'Pending');
  const pendingLumpsum = lumpsumDeposits.filter((d) => d.status === 'Pending');

  const pendingMonthlyAmount = pendingMonthly.reduce((sum, d) => sum + d.amount, 0);
  const pendingLumpsumAmount = pendingLumpsum.reduce((sum, d) => sum + d.amount, 0);

  const totalLandShares = landInvestments.reduce((sum, l) => sum + l.total_shares, 0);
  const soldLandShares = landInvestments.reduce((sum, l) => sum + l.sold_shares, 0);

  return {
    total_capital: totalCapital,
    total_monthly_capital: approvedMonthly,
    total_lumpsum_capital: approvedLumpsum,
    target_amount: systemSettings.target_amount,
    capital_percentage: Math.min(100, Math.round((totalCapital / systemSettings.target_amount) * 100)),
    total_members: members.length,
    active_members: members.filter((m) => m.status === 'Active').length,
    pending_members: members.filter((m) => m.status === 'Pending').length,
    blocked_members: members.filter((m) => m.status === 'Blocked').length,
    pending_monthly_deposits: pendingMonthly.length,
    pending_lumpsum_deposits: pendingLumpsum.length,
    total_pending_deposits_count: pendingMonthly.length + pendingLumpsum.length,
    total_pending_amount: pendingMonthlyAmount + pendingLumpsumAmount,
    active_lands_count: landInvestments.filter((l) => l.status === 'Active').length,
    total_land_shares: totalLandShares,
    sold_land_shares: soldLandShares,
    total_sale_offers: landSaleOffers.length,
    pending_sale_offers: landSaleOffers.filter((o) => o.status === 'Pending').length,
    total_public_submissions: publicLandSubmissions.length,
    pending_public_submissions: publicLandSubmissions.filter((s) => s.status === 'Pending').length,
    total_member_proposals: memberLandProposals.length,
    pending_member_proposals: memberLandProposals.filter((p) => p.status === 'Pending').length,
  };
}

// ============================================================================
// REST API ROUTES
// ============================================================================

// 1. System Settings
app.get('/api/settings', (req, res) => {
  res.json({ success: true, settings: systemSettings });
});

app.put('/api/settings', (req, res) => {
  const updates = req.body;
  systemSettings = { ...systemSettings, ...updates };
  res.json({ success: true, message: 'Settings updated successfully', settings: systemSettings });
});

// 2. Authentication
app.post('/api/auth/login', (req, res) => {
  const { email, password, quickAuth, googleAuth, full_name, avatar_url, phone } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  let member = members.find((m) => m.email.toLowerCase() === email.toLowerCase());

  // Direct One-Click Auth login support
  if (quickAuth || googleAuth) {
    if (!member) {
      const isOwnerAdmin =
        email.toLowerCase() === 'bondhon.biniyog@gmail.com' ||
        email.toLowerCase() === 'admin@bob.com';
      const newMember: Member = {
        member_id: `BoB-${String(members.length + 1).padStart(3, '0')}`,
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
      members.push(newMember);
      member = newMember;
    }

    if (member.status === 'Blocked') {
      return res.status(403).json({
        success: false,
        message: 'আপনার অ্যাকাউন্টটি সাময়িকভাবে স্থগিত রয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।',
      });
    }

    const { password_hash, ...safeMember } = member;
    return res.json({ success: true, member: safeMember });
  }

  if (!password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  if (!member) {
    return res.status(401).json({ success: false, message: 'সদস্যের ইমেইল খুঁজে পাওয়া যায়নি' });
  }

  if (member.password_hash !== password) {
    return res.status(401).json({ success: false, message: 'ভুল পাসওয়ার্ড প্রদান করা হয়েছে' });
  }

  if (member.status === 'Blocked') {
    return res.status(403).json({ success: false, message: 'আপনার অ্যাকাউন্টটি সাময়িকভাবে স্থগিত রয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।' });
  }

  const { password_hash, ...safeMember } = member;
  res.json({ success: true, member: safeMember });
});

app.post('/api/auth/register', (req, res) => {
  const { full_name, email, phone, password, monthly_target, live_photo_url } = req.body;

  if (!full_name || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: 'সকল প্রয়োজনীয় তথ্য পূরণ করুন' });
  }

  const existing = members.find((m) => m.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ success: false, message: 'এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট নিবন্ধিত আছে' });
  }

  const nextIndex = members.length + 1;
  const newMemberId = `BoB-${String(nextIndex).padStart(3, '0')}`;

  const newMember: Member = {
    member_id: newMemberId,
    full_name,
    email,
    phone,
    password_hash: password,
    live_photo_url: live_photo_url || undefined,
    role: 'Member',
    status: 'Pending', // pending admin approval
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

  members.push(newMember);

  const { password_hash: _, ...safeMember } = newMember;
  res.status(201).json({
    success: true,
    message: 'নিবন্ধন সম্পন্ন হয়েছে! অ্যাকাউন্টটি বর্তমানে অ্যাডমিন অনুমোদনের অপেক্ষায় রয়েছে।',
    member: safeMember,
  });
});

app.post('/api/auth/change-credentials', (req, res) => {
  const { current_member_id, new_member_id, email, password, full_name, phone } = req.body;
  const index = members.findIndex((m) => m.member_id === current_member_id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'সদস্য খুঁজে পাওয়া যায়নি' });
  }

  // If new_member_id provided and different, check uniqueness
  if (new_member_id && new_member_id !== current_member_id) {
    const exists = members.find((m) => m.member_id === new_member_id);
    if (exists) {
      return res.status(400).json({ success: false, message: 'এই সদস্য আইডি ইতিমধ্যে বিদ্যমান' });
    }
    // Update deposits
    monthlyDeposits.forEach((d) => {
      if (d.member_id === current_member_id) d.member_id = new_member_id;
    });
    lumpsumDeposits.forEach((d) => {
      if (d.member_id === current_member_id) d.member_id = new_member_id;
    });
    landInvestments.forEach((l) => {
      l.shares_detail?.forEach((s) => {
        if (s.member_id === current_member_id) s.member_id = new_member_id;
      });
    });
    appNotifications.forEach((n) => {
      if (n.target_member_id === current_member_id) n.target_member_id = new_member_id;
    });
    members[index].member_id = new_member_id;
  }

  if (email) {
    const emailConflict = members.find((m) => m.email.toLowerCase() === email.toLowerCase() && m.member_id !== members[index].member_id);
    if (emailConflict) {
      return res.status(400).json({ success: false, message: 'এই ইমেইল ইতিমধ্যে অন্য অ্যাকাউন্টে ব্যবহৃত' });
    }
    members[index].email = email;
  }

  if (password && password.trim()) {
    members[index].password_hash = password.trim();
  }

  if (full_name) members[index].full_name = full_name;
  if (phone) members[index].phone = phone;

  const { password_hash: _, ...safeMember } = members[index];
  res.json({ success: true, message: 'ইউজার আইডি ও পাসওয়ার্ড সফলভাবে আপডেট হয়েছে', member: safeMember });
});

app.post('/api/auth/accept-terms', (req, res) => {
  const { member_id } = req.body;
  const member = members.find((m) => m.member_id === member_id);
  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found' });
  }
  member.has_accepted_terms = true;
  res.json({ success: true, message: 'Terms accepted', member });
});

// 3. Members Management
app.get('/api/members', (req, res) => {
  const safeMembers = members.map(({ password_hash, ...m }) => m);
  res.json({ success: true, members: safeMembers });
});

app.post('/api/members', (req, res) => {
  const data = req.body;
  const nextIndex = members.length + 1;
  const newMemberId = `BoB-${String(nextIndex).padStart(3, '0')}`;

  const newMember: Member = {
    member_id: newMemberId,
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

  members.push(newMember);
  const { password_hash: _, ...safeMember } = newMember;
  res.status(201).json({ success: true, member: safeMember });
});

app.put('/api/members/:id', (req, res) => {
  const { id } = req.params;
  const index = members.findIndex((m) => m.member_id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Member not found' });
  }

  const current = members[index];
  const updates = req.body;

  let newMemberId = current.member_id;
  if (updates.member_id && updates.member_id !== id) {
    const exists = members.find((m) => m.member_id === updates.member_id);
    if (exists) {
      return res.status(400).json({ success: false, message: 'এই সদস্য আইডি ইতিমধ্যে অন্য সদস্যের জন্য ব্যবহৃত' });
    }
    newMemberId = updates.member_id;
    // update references
    monthlyDeposits.forEach((d) => {
      if (d.member_id === id) d.member_id = newMemberId;
    });
    lumpsumDeposits.forEach((d) => {
      if (d.member_id === id) d.member_id = newMemberId;
    });
    landInvestments.forEach((l) => {
      l.shares_detail?.forEach((s) => {
        if (s.member_id === id) s.member_id = newMemberId;
      });
    });
    appNotifications.forEach((n) => {
      if (n.target_member_id === id) n.target_member_id = newMemberId;
    });
  }

  const totalMonthly = updates.total_monthly_paid !== undefined ? Number(updates.total_monthly_paid) : current.total_monthly_paid;
  const totalLumpsum = updates.total_lumpsum_paid !== undefined ? Number(updates.total_lumpsum_paid) : current.total_lumpsum_paid;
  const dueInstallments = updates.due_installments !== undefined ? Number(updates.due_installments) : current.due_installments;

  const newPasswordHash = updates.password ? updates.password.trim() : (updates.password_hash || current.password_hash);

  members[index] = {
    ...current,
    ...updates,
    member_id: newMemberId,
    password_hash: newPasswordHash,
    due_installments: dueInstallments,
    total_monthly_paid: totalMonthly,
    total_lumpsum_paid: totalLumpsum,
    grand_total_paid: totalMonthly + totalLumpsum,
  };

  // If due installments > 0, generate or refresh notification for this member
  if (dueInstallments > 0) {
    const existingDueNotif = appNotifications.find(
      (n) => n.target_member_id === newMemberId && n.type === 'due_installment'
    );
    const dueAmount = dueInstallments * (members[index].monthly_target || 5000);
    const notifMsg = `সম্মানিত ${members[index].full_name}, আপনার ${dueInstallments}টি মাসিক কিস্তি বকেয়া রয়েছে (মোট বকেয়া ৳${dueAmount.toLocaleString('en-US')})। অনুগ্রহ করে দ্রুত পরিশোধ নিশ্চিত করুন।`;
    if (!existingDueNotif) {
      appNotifications.unshift({
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
      existingDueNotif.message = notifMsg;
      existingDueNotif.read_by = [];
    }
  }

  const { password_hash: _, ...safeMember } = members[index];
  res.json({ success: true, message: 'সদস্যের তথ্য সফলভাবে হালনাগাদ হয়েছে', member: safeMember });
});

app.put('/api/members/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const member = members.find((m) => m.member_id === id);
  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found' });
  }
  member.status = status;
  res.json({ success: true, message: `Member status updated to ${status}`, member });
});

app.delete('/api/members/:id', (req, res) => {
  const { id } = req.params;
  const index = members.findIndex((m) => m.member_id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Member not found' });
  }
  members.splice(index, 1);
  res.json({ success: true, message: 'সদস্য সফলভাবে মুছে ফেলা হয়েছে' });
});

// 4. Monthly Deposits
app.get('/api/deposits/monthly', (req, res) => {
  const { member_id, status } = req.query;
  let filtered = [...monthlyDeposits];

  if (member_id) {
    filtered = filtered.filter((d) => d.member_id === member_id);
  }
  if (status) {
    filtered = filtered.filter((d) => d.status === status);
  }

  // Sort newest first
  filtered.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  res.json({ success: true, deposits: filtered });
});

app.post('/api/deposits/monthly', (req, res) => {
  const { member_id, month_year, amount, payment_method, trx_id, voucher_url } = req.body;

  if (!member_id || !month_year || !amount || !payment_method || !trx_id) {
    return res.status(400).json({ success: false, message: 'সকল প্রয়োজনীয় তথ্য প্রদান করুন' });
  }

  const member = members.find((m) => m.member_id === member_id);
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').slice(0, 16);

  const newDeposit: MonthlyDeposit = {
    deposit_id: `MD-${month_year.replace('-', '')}-${String(monthlyDeposits.length + 1).padStart(3, '0')}`,
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

  monthlyDeposits.unshift(newDeposit);
  res.status(201).json({ success: true, message: 'মাসিক কিস্তির ভাউচার সফলভাবে জমা হয়েছে। অ্যাডমিন যাচাইয়ের পর অনুমোদিত হবে।', deposit: newDeposit });
});

app.put('/api/deposits/monthly/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, admin_note, approved_by } = req.body;

  const deposit = monthlyDeposits.find((d) => d.deposit_id === id);
  if (!deposit) {
    return res.status(404).json({ success: false, message: 'Deposit not found' });
  }

  const oldStatus = deposit.status;
  deposit.status = status;
  deposit.admin_note = admin_note || deposit.admin_note;
  deposit.approved_by = approved_by || 'Admin';
  deposit.approved_at = new Date().toISOString().replace('T', ' ').slice(0, 16);

  // If approved for first time, update member's paid total
  const member = members.find((m) => m.member_id === deposit.member_id);
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

  res.json({ success: true, message: `Deposit has been marked as ${status}`, deposit });
});

// 5. Lumpsum Deposits
app.get('/api/deposits/lumpsum', (req, res) => {
  const { member_id, status } = req.query;
  let filtered = [...lumpsumDeposits];

  if (member_id) {
    filtered = filtered.filter((d) => d.member_id === member_id);
  }
  if (status) {
    filtered = filtered.filter((d) => d.status === status);
  }

  // Sort newest first
  filtered.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
  res.json({ success: true, deposits: filtered });
});

app.post('/api/deposits/lumpsum', (req, res) => {
  const { member_id, purpose, amount, target_land_id, payment_method, trx_id, voucher_url } = req.body;

  if (!member_id || !purpose || !amount || !payment_method || !trx_id) {
    return res.status(400).json({ success: false, message: 'সকল প্রয়োজনীয় তথ্য প্রদান করুন' });
  }

  const member = members.find((m) => m.member_id === member_id);
  const land = landInvestments.find((l) => l.land_id === target_land_id);
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').slice(0, 16);

  const newDeposit: LumpsumDeposit = {
    lumpsum_id: `LS-2026-${String(lumpsumDeposits.length + 1).padStart(3, '0')}`,
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

  lumpsumDeposits.unshift(newDeposit);
  res.status(201).json({ success: true, message: 'এককালীন জমা সফলভাবে দাখিল হয়েছে। অ্যাডমিন যাচাই শেষে অনুমোদন করবেন।', deposit: newDeposit });
});

app.put('/api/deposits/lumpsum/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, admin_note, approved_by } = req.body;

  const deposit = lumpsumDeposits.find((d) => d.lumpsum_id === id);
  if (!deposit) {
    return res.status(404).json({ success: false, message: 'Deposit not found' });
  }

  const oldStatus = deposit.status;
  deposit.status = status;
  deposit.admin_note = admin_note || deposit.admin_note;
  deposit.approved_by = approved_by || 'Admin';
  deposit.approved_at = new Date().toISOString().replace('T', ' ').slice(0, 16);

  const member = members.find((m) => m.member_id === deposit.member_id);
  if (member) {
    if (oldStatus !== 'Approved' && status === 'Approved') {
      member.total_lumpsum_paid += deposit.amount;
      member.grand_total_paid += deposit.amount;
    } else if (oldStatus === 'Approved' && status !== 'Approved') {
      member.total_lumpsum_paid -= deposit.amount;
      member.grand_total_paid -= deposit.amount;
    }
  }

  res.json({ success: true, message: `Lumpsum deposit marked as ${status}`, deposit });
});

// 6. Land Investments & Shares
app.get('/api/lands', (req, res) => {
  res.json({ success: true, lands: landInvestments });
});

app.post('/api/lands', (req, res) => {
  const data = req.body;
  const nextId = `LAND-${String(landInvestments.length + 1).padStart(2, '0')}`;

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
    images: data.images && data.images.length > 0 ? data.images : [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
    ],
    description: data.description || '',
    features: Array.isArray(data.features) ? data.features : ['১০০% নিষ্কণ্টক জমি', 'সুবিধাজনক যাতায়াত', 'উচ্চ বিনিয়োগ সম্ভাবনা'],
    shares_detail: [],
  };

  landInvestments.push(newLand);
  res.status(201).json({ success: true, message: 'Land project created successfully', land: newLand });
});

app.put('/api/lands/:id', (req, res) => {
  const { id } = req.params;
  const index = landInvestments.findIndex((l) => l.land_id === id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Land not found' });
  }

  landInvestments[index] = {
    ...landInvestments[index],
    ...req.body,
  };

  res.json({ success: true, message: 'Land project updated', land: landInvestments[index] });
});

// Distribute / Assign Land Shares
app.post('/api/lands/:id/assign-shares', (req, res) => {
  const { id } = req.params;
  const { member_id, share_count, certificate_no } = req.body;

  const land = landInvestments.find((l) => l.land_id === id);
  if (!land) {
    return res.status(404).json({ success: false, message: 'Land not found' });
  }

  const member = members.find((m) => m.member_id === member_id);
  if (!member) {
    return res.status(404).json({ success: false, message: 'Member not found' });
  }

  const count = Number(share_count);
  if (!count || count <= 0) {
    return res.status(400).json({ success: false, message: 'সঠিক শেয়ার সংখ্যা প্রদান করুন' });
  }

  const remaining = land.total_shares - land.sold_shares;
  if (count > remaining) {
    return res.status(400).json({ success: false, message: `এই প্রকল্পে অবশিষ্ট রয়েছে মাত্র ${remaining} টি শেয়ার!` });
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

  res.json({
    success: true,
    message: `${member.full_name}-কে সফলভাবে ${count} টি শেয়ার বরাদ্দ করা হয়েছে!`,
    land,
    member,
  });
});

// 7. Directors & Gallery
app.get('/api/directors', (req, res) => {
  res.json({ success: true, directors });
});

app.post('/api/directors', (req, res) => {
  const data = req.body;
  const newDirector: Director = {
    director_id: `DIR-${String(directors.length + 1).padStart(2, '0')}`,
    name: data.name,
    designation: data.designation,
    phone: data.phone || '',
    email: data.email || '',
    photo_url: data.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
    message: data.message || '',
    order: Number(data.order) || directors.length + 1,
  };
  directors.push(newDirector);
  res.status(201).json({ success: true, message: 'পরিচালক সফলভাবে যুক্ত হয়েছেন', director: newDirector });
});

app.put('/api/directors/:id', (req, res) => {
  const { id } = req.params;
  const index = directors.findIndex((d) => d.director_id === id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Director not found' });
  directors[index] = { ...directors[index], ...req.body };
  res.json({ success: true, message: 'পরিচালক তথ্য আপডেট হয়েছে', director: directors[index] });
});

app.delete('/api/directors/:id', (req, res) => {
  const { id } = req.params;
  const index = directors.findIndex((d) => d.director_id === id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Director not found' });
  directors.splice(index, 1);
  res.json({ success: true, message: 'পরিচালক মুছে ফেলা হয়েছে' });
});

app.get('/api/gallery', (req, res) => {
  res.json({ success: true, gallery: galleryItems });
});

app.post('/api/gallery', (req, res) => {
  const data = req.body;
  const newItem: GalleryItem = {
    id: `GAL-${String(galleryItems.length + 1).padStart(2, '0')}`,
    title: data.title,
    category: data.category || 'সাইট ভিজিট',
    image_url: data.image_url,
    date: data.date || '২০২৬',
    location: data.location || '',
  };
  galleryItems.unshift(newItem);
  res.status(201).json({ success: true, message: 'গ্যালারিতে নতুন ছবি যুক্ত হয়েছে', item: newItem });
});

app.delete('/api/gallery/:id', (req, res) => {
  const { id } = req.params;
  const index = galleryItems.findIndex((g) => g.id === id);
  if (index === -1) return res.status(404).json({ success: false, message: 'Gallery item not found' });
  galleryItems.splice(index, 1);
  res.json({ success: true, message: 'গ্যালারি ছবি মুছে ফেলা হয়েছে' });
});

// 8. Overall Dashboard Statistics
app.get('/api/stats', (req, res) => {
  const stats = calculateStats();
  res.json({ success: true, stats });
});

// 9. Public Land Marketplace - "I Want to Buy" Offers
app.get('/api/marketplace/offers', (req, res) => {
  res.json({ success: true, offers: landSaleOffers });
});

app.post('/api/marketplace/offers', (req, res) => {
  const { land_id, buyer_name, address, mobile, email, proposed_price, notes } = req.body;

  if (!buyer_name || !mobile || !proposed_price) {
    return res.status(400).json({ success: false, message: 'নাম, মোবাইল নম্বর এবং প্রস্তাবিত মূল্য আবশ্যক' });
  }

  const land = landInvestments.find((l) => l.land_id === land_id);
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

  landSaleOffers.unshift(newOffer);

  // Broadcast notification to ALL members
  appNotifications.unshift({
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

  res.status(201).json({
    success: true,
    message: 'আপনার ক্রয়ের প্রস্তাবটি সফলভাবে জমা হয়েছে! BoB কর্তৃপক্ষ শীঘ্রই আপনার সাথে যোগাযোগ করবে।',
    offer: newOffer,
  });
});

app.put('/api/marketplace/offers/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;

  const offer = landSaleOffers.find((o) => o.offer_id === id);
  if (!offer) {
    return res.status(404).json({ success: false, message: 'প্রস্তাবটি পাওয়া যায়নি' });
  }

  offer.status = status;
  if (admin_notes) offer.admin_notes = admin_notes;

  res.json({ success: true, message: 'প্রস্তাবের স্ট্যাটাস সফলভাবে আপডেট হয়েছে', offer });
});

// 10. Public Land Submissions - "Want to Sell Your Land?"
app.get('/api/marketplace/submissions', (req, res) => {
  res.json({ success: true, submissions: publicLandSubmissions });
});

app.post('/api/marketplace/submissions', (req, res) => {
  const { seller_name, address, mobile, email, land_location, land_size, expected_price, description, photos } = req.body;

  if (!seller_name || !mobile || !land_location || !land_size || !expected_price) {
    return res.status(400).json({ success: false, message: 'সকল প্রয়োজনীয় তথ্য (নাম, মোবাইল, জমির অবস্থান, জমির পরিমাণ, প্রত্যাশিত মূল্য) পূরণ করুন' });
  }

  const newSubmission: PublicLandSubmission = {
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
    photos: Array.isArray(photos) && photos.length > 0 ? photos : [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'Pending',
    submitted_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
  };

  publicLandSubmissions.unshift(newSubmission);

  // Broadcast notification to ALL members
  appNotifications.unshift({
    id: `NOTIF-SUB-${Date.now()}`,
    target_member_id: 'ALL',
    target_role: 'ALL',
    type: 'land_submission',
    title: '🗺️ সমবায়ের জন্য নতুন জমি বিক্রির প্রস্তাব দাখিল!',
    message: `${land_location}-এ ${land_size} পরিমাণের জমি বিক্রির প্রস্তাব এসেছে (প্রত্যাশিত মূল্য: ৳${Number(expected_price).toLocaleString('en-US')})।`,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
    read_by: [],
    link_tab: 'marketplace',
  });

  res.status(201).json({
    success: true,
    message: 'আপনার জমি বিক্রির আবেদনটি সফলভাবে জমা হয়েছে! BoB টিম জমি পরিদর্শন ও কাগজ যাচাই শেষে যোগাযোগ করবে।',
    submission: newSubmission,
  });
});

app.put('/api/marketplace/submissions/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;

  const submission = publicLandSubmissions.find((s) => s.submission_id === id);
  if (!submission) {
    return res.status(404).json({ success: false, message: 'আবেদনটি পাওয়া যায়নি' });
  }

  submission.status = status;
  if (admin_notes) submission.admin_notes = admin_notes;

  res.json({ success: true, message: 'জমি বিক্রির আবেদনের স্ট্যাটাস আপডেট হয়েছে', submission });
});

// 11. Member Land Proposals - "Propose New Land Purchase"
app.get('/api/member-proposals', (req, res) => {
  const member_id = req.query.member_id as string;
  if (member_id) {
    return res.json({
      success: true,
      proposals: memberLandProposals.filter((p) => p.member_id === member_id),
    });
  }
  res.json({ success: true, proposals: memberLandProposals });
});

app.post('/api/member-proposals', (req, res) => {
  const { member_id, member_name, location, land_size, estimated_price, description, photos } = req.body;

  if (!member_id || !location || !estimated_price) {
    return res.status(400).json({ success: false, message: 'প্রয়োজনীয় তথ্য পূরণ করুন' });
  }

  const member = members.find((m) => m.member_id === member_id);

  const newProposal: MemberLandProposal = {
    proposal_id: `PROP-${Date.now()}`,
    member_id,
    member_name: member_name || (member ? member.full_name : 'সম্মানিত সদস্য'),
    location,
    land_size: land_size || 'অনির্ধারিত',
    estimated_price: Number(estimated_price),
    description: description || '',
    photos: Array.isArray(photos) && photos.length > 0 ? photos : [
      'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80'
    ],
    status: 'Pending',
    submitted_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
  };

  memberLandProposals.unshift(newProposal);

  // Broadcast notification to ALL members
  appNotifications.unshift({
    id: `NOTIF-PROP-${Date.now()}`,
    target_member_id: 'ALL',
    target_role: 'ALL',
    type: 'member_proposal',
    title: '🤝 নতুন প্রকল্প সমবায় প্রস্তাবনা!',
    message: `সদস্য ${newProposal.member_name} "${location}"-এ ${land_size} জমি ক্রয়ের প্রস্তাব দাখিল করেছেন।`,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 16),
    read_by: [],
    link_tab: 'marketplace',
  });

  res.status(201).json({
    success: true,
    message: 'নতুন জমি ক্রয়ের প্রস্তাব সফলভাবে অ্যাডমিন প্যানেলে প্রেরণ করা হয়েছে!',
    proposal: newProposal,
  });
});

app.put('/api/member-proposals/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, admin_feedback } = req.body;

  const proposal = memberLandProposals.find((p) => p.proposal_id === id);
  if (!proposal) {
    return res.status(404).json({ success: false, message: 'প্রস্তাবটি পাওয়া যায়নি' });
  }

  proposal.status = status;
  if (admin_feedback) proposal.admin_feedback = admin_feedback;

  res.json({ success: true, message: 'সদস্যের জমি প্রস্তাব স্ট্যাটাস আপডেট হয়েছে', proposal });
});

// 12. App Notifications Center
app.get('/api/notifications', (req, res) => {
  const member_id = req.query.member_id as string;
  let list = [...appNotifications];
  if (member_id) {
    list = list.filter((n) => n.target_member_id === 'ALL' || n.target_member_id === member_id);
  }
  // Sort newest first
  list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ success: true, notifications: list });
});

app.post('/api/notifications/mark-read', (req, res) => {
  const { notification_id, member_id } = req.body;
  const notif = appNotifications.find((n) => n.id === notification_id);
  if (notif) {
    if (!notif.read_by) notif.read_by = [];
    if (!notif.read_by.includes(member_id)) {
      notif.read_by.push(member_id);
    }
  }
  res.json({ success: true, message: 'Notification marked as read' });
});

app.post('/api/notifications/send-due-alerts', (req, res) => {
  const overdueMembers = members.filter((m) => m.due_installments > 0);
  let count = 0;
  overdueMembers.forEach((m) => {
    const existing = appNotifications.find(
      (n) => n.target_member_id === m.member_id && n.type === 'due_installment'
    );
    const dueAmount = m.due_installments * (m.monthly_target || 5000);
    const msg = `সম্মানিত ${m.full_name}, আপনার ${m.due_installments}টি মাসিক কিস্তি বকেয়া রয়েছে (মোট বকেয়া ৳${dueAmount.toLocaleString('en-US')})। অনুগ্রহ করে দ্রুত পরিশোধ নিশ্চিত করুন।`;
    if (!existing) {
      appNotifications.unshift({
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
      count++;
    } else {
      existing.message = msg;
      existing.read_by = [];
    }
  });
  res.json({ success: true, message: `${overdueMembers.length} জন বকেয়া সদস্যের প্রোফাইলে সতর্কবার্তা ও নোটিফিকেশন পাঠানো হয়েছে।` });
});


// ============================================================================
// CLOUDFLARE R2 OBJECT STORAGE & REALTIME BROADCAST ENDPOINTS
// ============================================================================

// List R2 Files
app.get('/api/r2/files', (req, res) => {
  const category = req.query.category as string | undefined;
  let result = r2Files;
  if (category && category !== 'all') {
    result = r2Files.filter((f) => f.category === category);
  }
  res.json({ success: true, files: result });
});

// Upload DataURL directly to R2
app.post('/api/r2/upload-dataurl', (req, res) => {
  const { dataUrl, filename, category = 'general' } = req.body;
  if (!dataUrl) {
    return res.status(400).json({ success: false, message: 'Missing dataUrl' });
  }

  const fileId = `r2-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const newFile = {
    id: fileId,
    name: filename || `file-${Date.now()}.jpg`,
    size: Math.round((dataUrl.length * 3) / 4),
    mimeType: dataUrl.split(';')[0]?.split(':')[1] || 'image/jpeg',
    url: dataUrl, // In local dev, serve dataUrl directly or proxy
    category,
    uploadedAt: new Date().toISOString(),
  };

  r2Files.unshift(newFile);
  broadcastRealtime('DATABASE_MUTATION', { type: 'R2_FILE_UPLOADED', file: newFile });
  res.json({ success: true, url: newFile.url, file: newFile });
});

// Upload Form File to R2
app.post('/api/r2/upload', (req, res) => {
  // Simple payload handler or data URL
  const fileId = `r2-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const category = (req.body?.category as string) || 'general';
  const name = req.body?.name || `file-${Date.now()}.png`;

  const newFile = {
    id: fileId,
    name,
    size: 102400,
    mimeType: 'image/png',
    url: '/bob-logo.png',
    category,
    uploadedAt: new Date().toISOString(),
  };

  r2Files.unshift(newFile);
  broadcastRealtime('DATABASE_MUTATION', { type: 'R2_FILE_UPLOADED', file: newFile });
  res.json({ success: true, url: newFile.url, file: newFile });
});

// Delete R2 File
app.delete('/api/r2/files/:fileId', (req, res) => {
  const { fileId } = req.params;
  r2Files = r2Files.filter((f) => f.id !== fileId);
  broadcastRealtime('DATABASE_MUTATION', { type: 'R2_FILE_DELETED', fileId });
  res.json({ success: true, message: 'File deleted from Cloudflare R2' });
});

// Trigger Realtime Broadcast via POST
app.post('/api/realtime/broadcast', (req, res) => {
  const { type = 'DATABASE_MUTATION', payload } = req.body;
  broadcastRealtime(type, payload);
  res.json({ success: true, recipients: realtimeClients.size });
});

// Full Database Export endpoint (A to Z)
app.get('/api/database/export', (req, res) => {
  res.json({
    success: true,
    data: {
      settings: systemSettings,
      members,
      monthlyDeposits,
      lumpsumDeposits,
      lands: landInvestments,
      directors,
      gallery: galleryItems,
      notifications: appNotifications,
      r2Files,
    },
    exported_at: new Date().toISOString(),
  });
});

// ============================================================================
// VITE INTEGRATION / STATIC SERVING & WEBSOCKET SERVER
// ============================================================================

async function startServer() {
  const server = http.createServer(app);

  // Setup WebSocket Server for Cloudflare Durable Objects Realtime simulation
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname.includes('/realtime/ws') || url.pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    realtimeClients.add(ws);
    // Send initial handshake
    ws.send(
      JSON.stringify({
        type: 'SYNC_PING',
        payload: { message: '⚡ Connected to Cloudflare Durable Objects Realtime Gateway' },
        timestamp: new Date().toISOString(),
      })
    );

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          return;
        }
        // Broadcast to all other clients
        realtimeClients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message.toString());
          }
        });
      } catch (e) {}
    });

    const cleanup = () => {
      realtimeClients.delete(ws);
    };
    ws.on('close', cleanup);
    ws.on('error', cleanup);
  });

  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Bondhon O Biniyog server listening on port ${PORT} (WebSocket Realtime active)`);
  });
}

startServer();
