export interface SystemSettings {
  id: string;
  project_title: string;
  slogan_bengali: string;
  logo_url: string;
  notice_bengali: string;
  // Special Ad / Offer
  banner_ad_active?: boolean;
  banner_ad_badge?: string;
  banner_ad_text?: string;
  banner_ad_image?: string;
  banner_ad_validity?: string;
  banner_ad_action_text?: string;
  // Hero & Vision
  hero_title?: string;
  hero_subtitle?: string;
  hero_image?: string;
  target_amount: number;
  project_vision: string;
  // Contacts & Direct Call CTA
  contact_phone_1: string;
  contact_phone_2: string;
  contact_whatsapp?: string;
  contact_email: string;
  contact_address?: string;
  call_cta_phone?: string;
  call_cta_text?: string;
  call_cta_timing?: string;
  // Management Lead
  management_lead: string;
  management_lead_designation?: string;
  management_lead_phone?: string;
  footer_text?: string;
  // Official Voucher Signature & Stamp
  voucher_signature_url?: string;
  voucher_signatory_name?: string;
  voucher_signatory_title?: string;
  voucher_seal_text?: string;
  // Official Payment Accounts
  payment_bank_name?: string;
  payment_bank_account_name?: string;
  payment_bank_account_no?: string;
  payment_bank_branch?: string;
  payment_bank_routing?: string;
  payment_bkash_no?: string;
  payment_nagad_no?: string;
  payment_rocket_no?: string;
  payment_instructions?: string;
}

export interface Member {
  member_id: string;
  full_name: string;
  email: string;
  phone: string;
  password_hash?: string;
  role: 'Member' | 'Admin';
  status: 'Active' | 'Pending' | 'Blocked';
  monthly_target: number;
  total_monthly_paid: number;
  total_lumpsum_paid: number;
  grand_total_paid: number;
  due_installments: number;
  owned_shares: number;
  has_accepted_terms: boolean;
  avatar_url?: string;
  live_photo_url?: string;
  joined_date: string;
}

export interface MonthlyDeposit {
  deposit_id: string;
  member_id: string;
  member_name?: string;
  month_year: string; // YYYY-MM
  amount: number;
  payment_method: 'bKash' | 'Nagad' | 'Rocket' | 'Bank' | 'Cash';
  trx_id: string;
  voucher_url?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submitted_at: string;
  approved_by?: string;
  approved_at?: string;
  admin_note?: string;
}

export interface LumpsumDeposit {
  lumpsum_id: string;
  member_id: string;
  member_name?: string;
  purpose: string;
  amount: number;
  target_land_id?: string;
  target_land_name?: string;
  payment_method: 'bKash' | 'Nagad' | 'Rocket' | 'Bank' | 'Cash';
  trx_id: string;
  voucher_url?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submitted_at: string;
  approved_by?: string;
  approved_at?: string;
  admin_note?: string;
}

export interface LandShare {
  share_id: string;
  land_id: string;
  member_id: string;
  member_name: string;
  share_count: number;
  certificate_no: string;
  assigned_date: string;
}

export interface LandInvestment {
  land_id: string;
  land_name: string;
  location: string;
  area_size: string;
  purchase_price: number;
  current_valuation: number;
  total_shares: number;
  share_price: number;
  sold_shares: number;
  monthly_installment?: number;
  status: 'Active' | 'Acquired' | 'In Discussion' | 'Sold Out';
  sale_status?: 'Available_For_Sale' | 'Not_For_Sale' | 'Under_Offer' | 'Sold';
  public_asking_price?: number;
  images: string[];
  description: string;
  features: string[];
  shares_detail?: LandShare[];
}

export interface LandSaleOffer {
  offer_id: string;
  land_id: string;
  land_name: string;
  buyer_name: string;
  address: string;
  mobile: string;
  email?: string;
  proposed_price: number;
  notes?: string;
  admin_notes?: string;
  status: 'Pending' | 'Contacted' | 'Closed' | 'Accepted' | 'Rejected';
  submitted_at: string;
}

export interface PublicLandSubmission {
  submission_id: string;
  seller_name: string;
  address: string;
  mobile: string;
  email?: string;
  land_size: string;
  location?: string;
  land_location?: string;
  expected_price: number;
  photos: string[];
  description?: string;
  status: 'Pending' | 'Under Review' | 'Accepted' | 'Declined' | 'Approved' | 'Rejected';
  submitted_at: string;
  admin_notes?: string;
}

export interface MemberLandProposal {
  proposal_id: string;
  member_id: string;
  member_name: string;
  location: string;
  land_size: string;
  estimated_price: number;
  description: string;
  photos?: string[];
  status: 'Pending' | 'Under Review' | 'Under_Review' | 'Approved' | 'Accepted' | 'Declined' | 'Rejected';
  submitted_at: string;
  admin_notes?: string;
  admin_feedback?: string;
}

export interface Director {
  director_id: string;
  name: string;
  designation: string;
  phone: string;
  email: string;
  photo_url: string;
  message: string;
  order: number;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  image_url: string;
  date: string;
  location: string;
}

export interface AppNotification {
  id: string;
  target_member_id?: string; // specific member id OR 'ALL' for all members
  target_role?: 'ALL' | 'Member' | 'Admin';
  type: 'due_installment' | 'land_offer' | 'land_submission' | 'member_proposal' | 'system';
  title: string;
  message: string;
  created_at: string;
  read_by?: string[];
  link_tab?: string;
  metadata?: Record<string, any>;
}

export interface DashboardStats {
  total_capital: number;
  total_monthly_capital: number;
  total_lumpsum_capital: number;
  target_amount: number;
  capital_percentage: number;
  total_members: number;
  active_members: number;
  pending_members: number;
  blocked_members: number;
  pending_monthly_deposits: number;
  pending_lumpsum_deposits: number;
  total_pending_deposits_count: number;
  total_pending_amount: number;
  active_lands_count: number;
  total_land_shares: number;
  sold_land_shares: number;
  total_sale_offers?: number;
  pending_sale_offers?: number;
  total_public_submissions?: number;
  pending_public_submissions?: number;
  total_member_proposals?: number;
  pending_member_proposals?: number;
}
