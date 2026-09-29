-- ============================================================================
-- CLOUDFLARE D1 SQL DATABASE SCHEMA FOR BONDHON SOMITI (BONDHON O BINIYOG)
-- Permanent Cloudflare SQL Storage: Data will NEVER be deleted.
-- Run: npx wrangler d1 execute bondhon_db --file=schema.sql
-- ============================================================================

-- 1. System Settings & CMS Configuration
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'bob-settings-main',
  project_title TEXT NOT NULL,
  slogan_bengali TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  notice_bengali TEXT NOT NULL,
  banner_ad_active INTEGER DEFAULT 1,
  banner_ad_badge TEXT,
  banner_ad_text TEXT,
  banner_ad_image TEXT,
  banner_ad_validity TEXT,
  banner_ad_action_text TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  target_amount REAL DEFAULT 10000000,
  project_vision TEXT,
  contact_phone_1 TEXT,
  contact_phone_2 TEXT,
  contact_whatsapp TEXT,
  contact_email TEXT,
  contact_address TEXT,
  call_cta_phone TEXT,
  call_cta_text TEXT,
  call_cta_timing TEXT,
  management_lead TEXT,
  management_lead_designation TEXT,
  management_lead_phone TEXT,
  footer_text TEXT,
  voucher_signature_url TEXT,
  voucher_signatory_name TEXT,
  voucher_signatory_title TEXT,
  voucher_seal_text TEXT,
  payment_bank_name TEXT,
  payment_bank_account_name TEXT,
  payment_bank_account_no TEXT,
  payment_bank_branch TEXT,
  payment_bank_routing TEXT,
  payment_bkash_no TEXT,
  payment_nagad_no TEXT,
  payment_rocket_no TEXT,
  payment_instructions TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Members & Admins
CREATE TABLE IF NOT EXISTS members (
  member_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Member', -- 'Member' or 'Admin'
  status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Pending', 'Suspended'
  monthly_target REAL DEFAULT 5000,
  total_monthly_paid REAL DEFAULT 0,
  total_lumpsum_paid REAL DEFAULT 0,
  grand_total_paid REAL DEFAULT 0,
  due_installments INTEGER DEFAULT 0,
  owned_shares INTEGER DEFAULT 0,
  has_accepted_terms INTEGER DEFAULT 1,
  avatar_url TEXT,
  nid_front_url TEXT,
  nid_back_url TEXT,
  joined_date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Monthly Installments (মাসিক কিস্তি)
CREATE TABLE IF NOT EXISTS monthly_deposits (
  deposit_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  month_year TEXT NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  trx_id TEXT NOT NULL,
  voucher_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
  submitted_at TEXT NOT NULL,
  approved_at TEXT,
  approved_by TEXT,
  notes TEXT,
  FOREIGN KEY (member_id) REFERENCES members(member_id)
);

-- 4. Lumpsum Deposits (এককালীন বিনিয়োগ)
CREATE TABLE IF NOT EXISTS lumpsum_deposits (
  deposit_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  amount REAL NOT NULL,
  purpose TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  trx_id TEXT NOT NULL,
  voucher_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
  submitted_at TEXT NOT NULL,
  approved_at TEXT,
  approved_by TEXT,
  notes TEXT,
  FOREIGN KEY (member_id) REFERENCES members(member_id)
);

-- 5. Land Projects (ভূমি প্রকল্পসমূহ)
CREATE TABLE IF NOT EXISTS lands (
  land_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  area_kathas REAL NOT NULL,
  total_price REAL NOT NULL,
  total_shares INTEGER NOT NULL,
  share_price REAL NOT NULL,
  monthly_installment REAL DEFAULT 5000,
  available_shares INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'Ongoing',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Directors & Management Board (পরিচালনা পর্ষদ)
CREATE TABLE IF NOT EXISTS directors (
  director_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  message TEXT,
  display_order INTEGER DEFAULT 1
);

-- 7. Gallery Photos
CREATE TABLE IF NOT EXISTS gallery (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  location TEXT NOT NULL,
  date TEXT NOT NULL
);

-- 8. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  created_at TEXT NOT NULL,
  read_by TEXT DEFAULT '[]' -- JSON array of member_ids
);

-- 9. Loans (ঋণ ও দেনা)
CREATE TABLE IF NOT EXISTS loans (
  loan_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  amount REAL NOT NULL,
  interest_rate REAL DEFAULT 0,
  duration_months INTEGER NOT NULL,
  repaid_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'Active',
  applied_at TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(member_id)
);

-- 10. Expenses (সমিতির দাপ্তরিক ও উন্নয়ন ব্যয়)
CREATE TABLE IF NOT EXISTS expenses (
  expense_id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  receipt_url TEXT,
  recorded_by TEXT NOT NULL,
  expense_date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Cloudflare R2 Uploaded Files Catalog
CREATE TABLE IF NOT EXISTS r2_files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  uploaded_at TEXT NOT NULL
);

-- ============================================================================
-- INITIAL SEED DATA
-- ============================================================================

INSERT OR REPLACE INTO settings (
  id, project_title, slogan_bengali, logo_url, notice_bengali,
  banner_ad_active, banner_ad_badge, banner_ad_text, banner_ad_image, banner_ad_validity, banner_ad_action_text,
  hero_title, hero_subtitle, target_amount, project_vision,
  contact_phone_1, contact_phone_2, contact_whatsapp, contact_email, contact_address,
  call_cta_phone, call_cta_text, call_cta_timing,
  management_lead, management_lead_designation, management_lead_phone, footer_text,
  voucher_signature_url, voucher_signatory_name, voucher_signatory_title, voucher_seal_text,
  payment_bank_name, payment_bank_account_name, payment_bank_account_no, payment_bank_branch, payment_bank_routing,
  payment_bkash_no, payment_nagad_no, payment_rocket_no, payment_instructions
) VALUES (
  'bob-settings-main',
  'বন্ধন ও বিনিয়োগ (BONDHON O BINIYOG)',
  'যৌথ স্বপ্ন • নিশ্চিত ভবিষ্যৎ',
  '/bob-logo.png',
  'জরুরি নোটিশ: ২০২৬ অর্থ-বছরের জন্য পূর্বাচল সেক্টর ২১ সংলগ্ন ১০ কাঠা জমির অবশিষ্ট ১২টি শেয়ার বরাদ্দ কার্যক্রম চলছে। মাসিক কিস্তির অর্থ প্রতি মাসের ১০ তারিখের মধ্যে জমা দেওয়ার জন্য অনুরোধ করা যাচ্ছে।',
  1,
  'বিশেষ অফার ও বোনাস লট',
  'ঈদ স্পেশাল অফার: পূর্বাচল প্রজেক্টে এই মাসে নতুন শেয়ার বুকিং করলেই পাচ্ছেন সাব-কবলা রেজিস্ট্রেশনে বিশেষ ছাড়!',
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&auto=format&fit=crop&q=80',
  '৩০ অক্টোবর ২০২৬ পর্যন্ত প্রযোজ্য',
  'এখনই অফারটি গ্রহণ করুন',
  'যৌথ বিনিয়োগে ভূমির মালিকানা, নিশ্চিত ভবিষ্যৎ ও সমৃদ্ধ আগামী',
  'বন্ধন ও বিনিয়োগ (BoB) হলো একটি বিশ্বস্ত সমবায় ভূমি বিনিয়োগ উদ্যোগ। ক্ষুদ্র ক্ষুদ্র মাসিক সঞ্চয় ও সদস্যদের এককালীন যৌথ বিনিয়োগে আমরা লাভজনক ও ঝামেলামুক্ত ভূমি প্রকল্পের মালিকানা নিশ্চিত করি।',
  10000000,
  'সম্পূর্ণ স্বচ্ছ হিসাবনিকাশ, সরকারি দলিল সম্পাদন এবং সমবন্টনই আমাদের মূল অঙ্গীকার।',
  '+880 1712-345678',
  '+880 1890-123456',
  '+880 1712-345678',
  'bondhon.biniyog@gmail.com',
  'বাড়ি নং ১২, রোড নং ৫, ব্লক-ডি, বসুন্ধরা আ/এ, ঢাকা-১২২৯',
  '+880 1712-345678',
  'সরাসরি কল করুন (অফিস ও হটলাইন)',
  'সকাল ৯:০০ টা থেকে রাত ১০:০০ টা (সপ্তাহের ৭ দিন)',
  'সজিব মোল্লা',
  'ব্যবস্থাপনা পরিচালক ও প্রধান সমন্বয়ক',
  '+880 1712-345678',
  '© 2026 বন্ধন ও বিনিয়োগ (BONDHON O BINIYOG)। সর্বস্বত্ব সংরক্ষিত। ব্যবস্থাপনায়— সজিব মোল্লা।',
  'https://api.dicebear.com/7.x/initials/svg?seed=Sajib+Molla&backgroundColor=transparent&textColor=1e3a8a',
  'সজিব মোল্লা',
  'ব্যবস্থাপনা পরিচালক ও প্রধান সমন্বয়ক',
  'বন্ধন ও বিনিয়োগ অনুমোদিত ডিজিটাল সিল',
  'BRAC Bank PLC (ব্র্যাক ব্যাংক পিএলসি)',
  'BONDHON O BINIYOG (বন্ধন ও বিনিয়োগ)',
  '1501-2049-88001',
  'বসুন্ধরা / গুলশান শাখা, ঢাকা',
  '060261789',
  '01712-345678 (মার্চেন্ট পেমেন্ট)',
  '01890-123456 (ব্যক্তিগত / ক্যাশ-ইন)',
  '01712-345678-0 (মার্চেন্ট)',
  'বিকাশ/নগদ/রকেটে Payment অথবা ব্যাংক অ্যাকাউন্টে জমা করার পর প্রাপ্ত Transaction ID (TrxID) এবং ডিপোজিট স্লিপের ছবি/স্ক্রিনশট আপলোড করে ভাউচার দাখিল করুন।'
);

-- Admin & Primary Members
INSERT OR REPLACE INTO members (
  member_id, full_name, email, phone, password_hash, role, status,
  monthly_target, total_monthly_paid, total_lumpsum_paid, grand_total_paid,
  due_installments, owned_shares, has_accepted_terms, avatar_url, joined_date
) VALUES
(
  'BoB-001', 'সজিব মোল্লা (অ্যাডমিন)', 'admin@bob.com', '+880 1712-345678',
  'admin123', 'Admin', 'Active',
  10000, 120000, 300000, 420000, 0, 5, 1,
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  '2025-01-01'
),
(
  'BoB-002', 'মোঃ আব্দুর রহমান', 'rahman@bob.com', '+880 1812-987654',
  'user123', 'Member', 'Active',
  5000, 60000, 150000, 210000, 1, 2, 1,
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  '2025-01-15'
),
(
  'BoB-003', 'তানিয়া আহমেদ', 'tania@bob.com', '+880 1912-334455',
  'user123', 'Member', 'Active',
  5000, 55000, 100000, 155000, 0, 2, 1,
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  '2025-02-01'
);

-- Land Projects
INSERT OR REPLACE INTO lands (
  land_id, title, location, area_kathas, total_price, total_shares,
  share_price, monthly_installment, available_shares, image_url, description
) VALUES
(
  'land-001', 'পূর্বাচল সেক্টর ২১ সংলগ্ন প্রিমিয়াম প্লট',
  'সেক্টর ২১, পূর্বাচল নতুন শহর, ঢাকা',
  10.0, 7500000, 50, 150000, 5000, 12,
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
  'পূর্বাচল ৩০০ ফুট মহাসড়ক সংলগ্ন অত্যন্ত আকর্ষণীয় ও সম্ভাবনাময় আবাসিক জমি। ১০০% নির্ভেজাল ও সরকারি খাজনা পরিশোধিত।'
),
(
  'land-002', 'কেরানীগঞ্জ হাইওয়ে সংলগ্ন কমার্শিয়াল ব্লক',
  'ঢাকা-মাওয়া এক্সপ্রেসওয়ে সংলগ্ন, কেরানীগঞ্জ',
  15.0, 12000000, 60, 200000, 6000, 25,
  'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=800&auto=format&fit=crop&q=80',
  'পদ্মা সেতু সংযোগকারী এক্সপ্রেসওয়ের সন্নিকটে ভবিষ্যৎ বাণিজ্যিক জোন। দ্রুত রিটার্ন পাওয়ার সুযোগ।'
);

-- Directors
INSERT OR REPLACE INTO directors (
  director_id, name, designation, phone, email, photo_url, message, display_order
) VALUES
(
  'dir-01', 'সজিব মোল্লা', 'ব্যবস্থাপনা পরিচালক ও প্রধান সমন্বয়ক',
  '+880 1712-345678', 'sajib@bob.com',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'আমাদের লক্ষ্য যৌথ মূলধনে প্রতিটি সাধারণ নাগরিককে জমির গর্বিত মালিক করা।', 1
),
(
  'dir-02', 'প্রকৌশলী মাহমুদুল হাসান', 'পরিচালক (কারিগরি ও প্রকল্প মূল্যায়ন)',
  '+880 1812-345678', 'mahmud@bob.com',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'জমির সয়েল টেস্ট ও প্রকৌশলগত সম্ভাব্যতা যাচাইয়ে আমরা আপসহীন।', 2
),
(
  'dir-03', 'এডভোকেট নাসরিন জাহান', 'আইনি উপদেষ্টা ও পরিচালক',
  '+880 1912-345678', 'nasrin@bob.com',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
  'প্রতিটি প্রকল্পের জমি ক্রয়ের পূর্বে শত বছরের সিএস, এসএ, আরএস ও বিএস রেকর্ড শতভাগ যাচাই করা হয়।', 3
);
