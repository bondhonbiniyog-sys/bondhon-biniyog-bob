import React, { useState, useEffect } from 'react';
import type {
  Member,
  MonthlyDeposit,
  LumpsumDeposit,
  LandInvestment,
  SystemSettings,
  DashboardStats,
  LandSaleOffer,
  PublicLandSubmission,
  MemberLandProposal,
  Director,
} from '../types';
import { formatTaka, toBengaliDigits } from '../utils/bengaliUtils';
import { CloudflareR2ExplorerModal } from './CloudflareR2ExplorerModal';
import { useCloudflareRealtime } from '../services/realtimeClient';
import {
  exportDatabaseToExcel,
  exportTableToExcel,
  downloadElementAsJpg,
  downloadElementAsPdf,
} from '../utils/exportUtils';

interface AdminPanelProps {
  currentUser: Member | null;
  stats: DashboardStats | null;
  settings: SystemSettings | null;
  members: Member[];
  monthlyDeposits: MonthlyDeposit[];
  lumpsumDeposits: LumpsumDeposit[];
  lands: LandInvestment[];
  directors?: Director[];
  onRefreshData: () => void;
  onOpenAuth: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  stats,
  settings,
  members,
  monthlyDeposits,
  lumpsumDeposits,
  lands,
  directors = [],
  onRefreshData,
  onOpenAuth,
}) => {
  // Active Admin Sub-tab: A to Z Admin control
  const [adminTab, setAdminTab] = useState<
    'pending' | 'members' | 'lands' | 'directors' | 'payments' | 'ads_ticker' | 'branding_contact' | 'voucher_signature' | 'marketplace' | 'admin_security'
  >('pending');

  // Preview voucher modal
  const [previewVoucherUrl, setPreviewVoucherUrl] = useState<string | null>(null);

  // Marketplace Offers, Public Submissions, Member Proposals state
  const [offers, setOffers] = useState<LandSaleOffer[]>([]);
  const [submissions, setSubmissions] = useState<PublicLandSubmission[]>([]);
  const [proposals, setProposals] = useState<MemberLandProposal[]>([]);
  const [marketSection, setMarketSection] = useState<'offers' | 'submissions' | 'proposals'>('offers');
  const [isLoadingExtra, setIsLoadingExtra] = useState(false);

  // Fetch extra marketplace data
  const fetchMarketplaceData = async () => {
    try {
      setIsLoadingExtra(true);
      const [resOffers, resSubs, resProps] = await Promise.all([
        fetch('/api/marketplace/offers').then((r) => r.json()),
        fetch('/api/marketplace/submissions').then((r) => r.json()),
        fetch('/api/member-proposals').then((r) => r.json()),
      ]);
      if (resOffers.success) setOffers(resOffers.offers || []);
      if (resSubs.success) setSubmissions(resSubs.submissions || []);
      if (resProps.success) setProposals(resProps.proposals || []);
    } catch (err) {
      console.error('Failed to load marketplace data in admin:', err);
    } finally {
      setIsLoadingExtra(false);
    }
  };

  useEffect(() => {
    fetchMarketplaceData();
  }, []);

  // Member search & filter
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<'All' | 'Active' | 'Pending' | 'Blocked'>('All');

  // Add Member Modal State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('member123');
  const [newMemberRole, setNewMemberRole] = useState<'Member' | 'Admin'>('Member');
  const [newMemberStatus, setNewMemberStatus] = useState<'Active' | 'Pending' | 'Blocked'>('Active');
  const [newMemberTarget, setNewMemberTarget] = useState(5000);
  const [newMemberShares, setNewMemberShares] = useState(0);
  const [newMemberAvatar, setNewMemberAvatar] = useState('');

  // Edit Member Modal
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [originalMemberId, setOriginalMemberId] = useState<string>('');
  const [editingMemberPassword, setEditingMemberPassword] = useState<string>('');

  // Quick reset password modal for any member or admin
  const [memberToChangePassword, setMemberToChangePassword] = useState<Member | null>(null);
  const [newPasswordForMember, setNewPasswordForMember] = useState<string>('');
  const [confirmPasswordForMember, setConfirmPasswordForMember] = useState<string>('');
  const [memberPasswordLoading, setMemberPasswordLoading] = useState<boolean>(false);

  // Cloudflare R2 Explorer Modal in Admin
  const [showAdminR2Modal, setShowAdminR2Modal] = useState<boolean>(false);

  // Single Member Ledger Export Modal (PDF / JPG / Excel)
  const [selectedMemberForLedger, setSelectedMemberForLedger] = useState<Member | null>(null);
  const [isExportingLedgerJpg, setIsExportingLedgerJpg] = useState(false);
  const [isExportingLedgerPdf, setIsExportingLedgerPdf] = useState(false);

  // Admin credentials state (Tab 10: admin_security)
  const [adminEmail, setAdminEmail] = useState(currentUser?.email || 'admin@bob.com');
  const [adminMemberId, setAdminMemberId] = useState(currentUser?.member_id || 'BoB-001');
  const [adminFullName, setAdminFullName] = useState(currentUser?.full_name || 'সজিব মোল্লা (অ্যাডমিন)');
  const [adminPhone, setAdminPhone] = useState(currentUser?.phone || '+880 1712-345678');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminCredLoading, setAdminCredLoading] = useState(false);
  const [adminCredMsg, setAdminCredMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Land Form State
  const [showAddLandModal, setShowAddLandModal] = useState(false);
  const [editingLand, setEditingLand] = useState<LandInvestment | null>(null);
  const [newLandName, setNewLandName] = useState('');
  const [newLandLocation, setNewLandLocation] = useState('');
  const [newLandArea, setNewLandArea] = useState('');
  const [newLandPrice, setNewLandPrice] = useState(5000000);
  const [newLandShares, setNewLandShares] = useState(50);
  const [newLandSharePrice, setNewLandSharePrice] = useState(100000);
  const [newLandMonthlyInstallment, setNewLandMonthlyInstallment] = useState(5000);
  const [newLandImage, setNewLandImage] = useState('');
  const [newLandDescription, setNewLandDescription] = useState('');

  // Share Distributor Form State
  const [showAssignShareModal, setShowAssignShareModal] = useState(false);
  const [assignLandId, setAssignLandId] = useState(lands[0]?.land_id || '');
  const [assignMemberId, setAssignMemberId] = useState(members[0]?.member_id || '');
  const [assignShareCount, setAssignShareCount] = useState(1);
  const [assignCertNo, setAssignCertNo] = useState('');

  // Directors Management State
  const [directorsList, setDirectorsList] = useState<Director[]>(directors || []);
  const [showAddDirectorModal, setShowAddDirectorModal] = useState(false);
  const [editingDirector, setEditingDirector] = useState<Director | null>(null);
  const [dirName, setDirName] = useState('');
  const [dirDesignation, setDirDesignation] = useState('');
  const [dirPhone, setDirPhone] = useState('');
  const [dirEmail, setDirEmail] = useState('');
  const [dirPhoto, setDirPhoto] = useState('');
  const [dirMessage, setDirMessage] = useState('');
  const [dirOrder, setDirOrder] = useState(1);

  // Sync directors prop
  useEffect(() => {
    if (directors && directors.length > 0) {
      setDirectorsList(directors);
    }
  }, [directors]);

  // Official Payment Accounts State
  const [payBankName, setPayBankName] = useState(settings?.payment_bank_name || 'BRAC Bank PLC (ব্র্যাক ব্যাংক পিএলসি)');
  const [payBankAccountName, setPayBankAccountName] = useState(settings?.payment_bank_account_name || 'BONDHON O BINIYOG (বন্ধন ও বিনিয়োগ)');
  const [payBankAccountNo, setPayBankAccountNo] = useState(settings?.payment_bank_account_no || '1501-2049-88001');
  const [payBankBranch, setPayBankBranch] = useState(settings?.payment_bank_branch || 'বসুন্ধরা / গুলশান শাখা, ঢাকা');
  const [payBankRouting, setPayBankRouting] = useState(settings?.payment_bank_routing || '060261789');
  const [payBkashNo, setPayBkashNo] = useState(settings?.payment_bkash_no || '01712-345678 (মার্চেন্ট)');
  const [payNagadNo, setPayNagadNo] = useState(settings?.payment_nagad_no || '01890-123456 (ব্যক্তিগত)');
  const [payRocketNo, setPayRocketNo] = useState(settings?.payment_rocket_no || '01712-345678-0');
  const [payInstructions, setPayInstructions] = useState(settings?.payment_instructions || 'বিকাশ, নগদ বা ব্যাংক অ্যাকাউন্টে অর্থ প্রেরণের পর TrxID ও জমার স্লিপ আপলোড করুন।');

  // Special Offer / Ads Banner State
  const [adActive, setAdActive] = useState<boolean>(settings?.banner_ad_active ?? true);
  const [adBadge, setAdBadge] = useState(settings?.banner_ad_badge || 'বিশেষ বিজ্ঞাপন / অফার');
  const [adText, setAdText] = useState(settings?.banner_ad_text || '');
  const [adImage, setAdImage] = useState(settings?.banner_ad_image || '');
  const [adValidity, setAdValidity] = useState(settings?.banner_ad_validity || '৩০ অক্টোবর ২০২৬ পর্যন্ত');
  const [adActionText, setAdActionText] = useState(settings?.banner_ad_action_text || 'এখনই অফারটি গ্রহণ করুন');

  // Contact & Direct Call CTA State
  const [callCtaPhone, setCallCtaPhone] = useState(settings?.call_cta_phone || settings?.contact_phone_1 || '+880 1712-345678');
  const [callCtaText, setCallCtaText] = useState(settings?.call_cta_text || 'সরাসরি কল করুন (অফিস ও হটলাইন)');
  const [callCtaTiming, setCallCtaTiming] = useState(settings?.call_cta_timing || 'সকাল ৯:০০ টা থেকে রাত ১০:০০ টা');
  const [contactWhatsapp, setContactWhatsapp] = useState(settings?.contact_whatsapp || '+880 1712-345678');
  const [contactAddress, setContactAddress] = useState(settings?.contact_address || 'বাড়ি নং ১২, রোড নং ৫, ব্লক-ডি, বসুন্ধরা আ/এ, ঢাকা-১২২৯');

  // Official Voucher Signature State
  const [voucherSignatureUrl, setVoucherSignatureUrl] = useState(settings?.voucher_signature_url || '');
  const [voucherSignatoryName, setVoucherSignatoryName] = useState(settings?.voucher_signatory_name || 'সজিব মোল্লা');
  const [voucherSignatoryTitle, setVoucherSignatoryTitle] = useState(settings?.voucher_signatory_title || 'ব্যবস্থাপনা পরিচালক ও প্রধান সমন্বয়ক');
  const [voucherSealText, setVoucherSealText] = useState(settings?.voucher_seal_text || 'বন্ধন ও বিনিয়োগ অনুমোদিত ডিজিটাল সিল');

  // Branding & General CMS State
  const [cmsLogoUrl, setCmsLogoUrl] = useState(settings?.logo_url || '/bob-logo.png');
  const [cmsProjectTitle, setCmsProjectTitle] = useState(settings?.project_title || 'বন্ধন ও বিনিয়োগ (BONDHON O BINIYOG)');
  const [cmsSlogan, setCmsSlogan] = useState(settings?.slogan_bengali || 'যৌথ স্বপ্ন • নিশ্চিত ভবিষ্যৎ');
  const [cmsHeroTitle, setCmsHeroTitle] = useState(settings?.hero_title || 'যৌথ বিনিয়োগে ভূমির মালিকানা, নিশ্চিত ভবিষ্যৎ ও সমৃদ্ধ আগামী');
  const [cmsHeroSubtitle, setCmsHeroSubtitle] = useState(settings?.hero_subtitle || '');
  const [cmsNotice, setCmsNotice] = useState(settings?.notice_bengali || '');
  const [cmsTarget, setCmsTarget] = useState(settings?.target_amount || 10000000);
  const [cmsVision, setCmsVision] = useState(settings?.project_vision || '');
  const [cmsPhone1, setCmsPhone1] = useState(settings?.contact_phone_1 || '');
  const [cmsPhone2, setCmsPhone2] = useState(settings?.contact_phone_2 || '');
  const [cmsEmail, setCmsEmail] = useState(settings?.contact_email || '');
  const [cmsLead, setCmsLead] = useState(settings?.management_lead || 'সজিব মোল্লা');
  const [cmsLeadDesignation, setCmsLeadDesignation] = useState(settings?.management_lead_designation || 'ব্যবস্থাপনা পরিচালক ও প্রধান সমন্বয়ক');

  // Helper for Base64 image file upload
  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('ফাইলের সাইজ সর্বোচ্চ ৫ মেগাবাইট হতে পারবে');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Check if current user is admin
  if (!currentUser || currentUser.role !== 'Admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center font-bengali">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-4 text-2xl">
          <i className="fa-solid fa-lock"></i>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">অ্যাডমিন প্রবেশাধিকার সংরক্ষিত</h2>
        <p className="text-slate-400 text-sm mb-6">
          এই কন্ট্রোল প্যানেলটি শুধুমাত্র বন্ধন ও বিনিয়োগের অনুমোদিত অ্যাডমিনের জন্য নির্ধারিত। অনুগ্রহ করে অ্যাডমিন অ্যাকাউন্ট দিয়ে লগইন করুন।
        </p>
        <button
          onClick={onOpenAuth}
          className="cursor-pointer px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition inline-flex items-center gap-2"
        >
          <i className="fa-solid fa-right-to-bracket"></i>
          <span>অ্যাডমিন লগইন করুন (admin@bob.com)</span>
        </button>
      </div>
    );
  }

  // Real-time onSnapshot Live Sync states for Admin Panel
  const [liveMembers, setLiveMembers] = useState<Member[]>(members);
  const [liveMonthly, setLiveMonthly] = useState<MonthlyDeposit[]>(monthlyDeposits);
  const [liveLumpsum, setLiveLumpsum] = useState<LumpsumDeposit[]>(lumpsumDeposits);
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<string>('সক্রিয় (Realtime)');
  const [isManualBackingUp, setIsManualBackingUp] = useState<boolean>(false);

  useEffect(() => {
    if (members && members.length > 0) setLiveMembers(members);
  }, [members]);

  useEffect(() => {
    if (monthlyDeposits && monthlyDeposits.length > 0) setLiveMonthly(monthlyDeposits);
  }, [monthlyDeposits]);

  useEffect(() => {
    if (lumpsumDeposits && lumpsumDeposits.length > 0) setLiveLumpsum(lumpsumDeposits);
  }, [lumpsumDeposits]);

  // Cloudflare Realtime WebSocket listener for Admin Panel:
  // When any mutation occurs in Cloudflare D1 across any device, it instantly broadcasts here!
  useEffect(() => {
    const unsub = useCloudflareRealtime((event) => {
      setLastAutoSyncTime(new Date().toLocaleTimeString('bn-BD'));
      onRefreshData();
    });
    return () => unsub();
  }, [onRefreshData]);

  const currentMemberList = liveMembers && liveMembers.length > 0 ? liveMembers : members;
  const currentMonthlyList = liveMonthly && liveMonthly.length > 0 ? liveMonthly : monthlyDeposits;
  const currentLumpsumList = liveLumpsum && liveLumpsum.length > 0 ? liveLumpsum : lumpsumDeposits;

  // Pending deposits list
  const pendingMonthly = currentMonthlyList.filter((d) => d.status === 'Pending');
  const pendingLumpsum = currentLumpsumList.filter((d) => d.status === 'Pending');
  const totalPendingCount = pendingMonthly.length + pendingLumpsum.length;

  // Download Full Database as Excel (A to Z) using SheetJS
  const handleExportFullDatabaseToExcel = () => {
    setIsManualBackingUp(true);
    try {
      const success = exportDatabaseToExcel(
        {
          members: currentMemberList,
          monthlyDeposits: currentMonthlyList,
          lumpsumDeposits: currentLumpsumList,
          lands,
          directors: directorsList,
          settings,
        },
        `Bondhon-D1-Full-Database-${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      if (success) {
        showNotification('সম্পূর্ণ ডাটাবেজ (A to Z) সফলভাবে Excel (.xlsx) ফাইলে ডাউনলোড হয়েছে!');
      } else {
        showNotification('ডাটাবেজ এক্সপোর্ট ব্যর্থ হয়েছে', 'error');
      }
    } catch (e) {
      showNotification('এক্সেল এক্সপোর্ট ব্যর্থ হয়েছে', 'error');
    } finally {
      setIsManualBackingUp(false);
    }
  };

  // Approve / Reject Monthly Deposit
  const handleUpdateMonthlyStatus = async (
    depositId: string,
    status: 'Approved' | 'Rejected',
    note?: string
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/deposits/monthly/${depositId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          admin_note: note || `Admin ${status} on ${new Date().toLocaleDateString()}`,
          approved_by: currentUser.full_name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`মাসিক কিস্তি সফলভাবে ${status === 'Approved' ? 'অনুমোদিত' : 'বাতিল'} হয়েছে!`);
        onRefreshData();
      }
    } catch (err) {
      showNotification('স্ট্যাটাস আপডেট ব্যর্থ হয়েছে', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Approve / Reject Lumpsum Deposit
  const handleUpdateLumpsumStatus = async (
    lumpsumId: string,
    status: 'Approved' | 'Rejected',
    note?: string
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/deposits/lumpsum/${lumpsumId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          admin_note: note || `Admin ${status} on ${new Date().toLocaleDateString()}`,
          approved_by: currentUser.full_name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`এককালীন বিনিয়োগ সফলভাবে ${status === 'Approved' ? 'অনুমোদিত' : 'বাতিল'} হয়েছে!`);
        onRefreshData();
      }
    } catch (err) {
      showNotification('স্ট্যাটাস আপডেট ব্যর্থ হয়েছে', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Member Status (Active, Blocked, Pending)
  const handleUpdateMemberStatus = async (memberId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/members/${memberId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`সদস্য স্ট্যাটাস ${newStatus} করা হয়েছে!`);
        onRefreshData();
      }
    } catch (err) {
      showNotification('সদস্য স্ট্যাটাস আপডেট ব্যর্থ হয়েছে', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Save Member Edits (Name, Phone, Email, Target, Role, Status, Member ID, and Password)
  const handleSaveMemberEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    setActionLoading(true);
    try {
      const targetId = originalMemberId || editingMember.member_id;
      const res = await fetch(`/api/members/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingMember,
          password: editingMemberPassword ? editingMemberPassword.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'সদস্যের তথ্য, আইডি ও পাসওয়ার্ড সফলভাবে সংরক্ষিত হয়েছে!');
        setEditingMember(null);
        setOriginalMemberId('');
        setEditingMemberPassword('');
        onRefreshData();
      } else {
        showNotification(data.message || 'আপডেট ব্যর্থ হয়েছে', 'error');
      }
    } catch (err) {
      showNotification('আপডেট ব্যর্থ হয়েছে', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Password Reset for any member or admin
  const handleQuickPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToChangePassword) return;
    if (!newPasswordForMember.trim()) {
      showNotification('অনুগ্রহ করে নতুন পাসওয়ার্ড লিখুন', 'error');
      return;
    }
    if (newPasswordForMember !== confirmPasswordForMember) {
      showNotification('দুই পাসওয়ার্ড মেলেনি', 'error');
      return;
    }
    setMemberPasswordLoading(true);
    try {
      const res = await fetch(`/api/members/${memberToChangePassword.member_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: newPasswordForMember.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`সদস্য "${memberToChangePassword.full_name}"-এর নতুন পাসওয়ার্ড সফলভাবে সংরক্ষিত হয়েছে!`);
        setMemberToChangePassword(null);
        setNewPasswordForMember('');
        setConfirmPasswordForMember('');
        onRefreshData();
      } else {
        showNotification(data.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে', 'error');
      }
    } catch (err) {
      showNotification('সার্ভার যোগাযোগে ত্রুটি', 'error');
    } finally {
      setMemberPasswordLoading(false);
    }
  };

  // Admin Credentials Update (Admin Email/ID and Password)
  const handleAdminCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminNewPassword && adminNewPassword !== adminConfirmPassword) {
      setAdminCredMsg({ type: 'error', text: 'দুই পাসওয়ার্ড মেলেনি' });
      return;
    }
    setAdminCredLoading(true);
    setAdminCredMsg(null);
    try {
      const res = await fetch('/api/auth/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_member_id: currentUser?.member_id || adminMemberId,
          new_member_id: adminMemberId.trim(),
          email: adminEmail.trim(),
          password: adminNewPassword.trim() || undefined,
          full_name: adminFullName.trim(),
          phone: adminPhone.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminCredMsg({ type: 'success', text: 'অ্যাডমিন ইউজার আইডি ও পাসওয়ার্ড সফলভাবে সংরক্ষিত হয়েছে!' });
        if (data.member) {
          localStorage.setItem('bob_logged_user', JSON.stringify(data.member));
        }
        setAdminNewPassword('');
        setAdminConfirmPassword('');
        onRefreshData();
      } else {
        setAdminCredMsg({ type: 'error', text: data.message || 'আপডেট ব্যর্থ হয়েছে' });
      }
    } catch (err) {
      setAdminCredMsg({ type: 'error', text: 'সার্ভার যোগাযোগে ত্রুটি' });
    } finally {
      setAdminCredLoading(false);
    }
  };

  // Create New Land Project
  const handleCreateLand = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/lands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          land_name: newLandName,
          location: newLandLocation,
          area_size: newLandArea,
          purchase_price: Number(newLandPrice),
          current_valuation: Number(newLandPrice),
          total_shares: Number(newLandShares),
          share_price: Number(newLandSharePrice),
          monthly_installment: Number(newLandMonthlyInstallment) || 5000,
          description: newLandDescription,
          images: newLandImage
            ? [newLandImage]
            : ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800'],
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('নতুন ভূমি প্রকল্প সফলভাবে যুক্ত হয়েছে!');
        setShowAddLandModal(false);
        setNewLandName('');
        setNewLandLocation('');
        setNewLandArea('');
        onRefreshData();
      }
    } catch (err) {
      showNotification('প্রকল্প সংরক্ষণ ব্যর্থ হয়েছে', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Assign Land Share to Member
  const handleAssignShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/lands/${assignLandId}/assign-shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: assignMemberId,
          share_count: Number(assignShareCount),
          certificate_no: assignCertNo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'শেয়ার সফলভাবে বরাদ্দ করা হয়েছে!');
        setShowAssignShareModal(false);
        setAssignCertNo('');
        onRefreshData();
      } else {
        showNotification(data.message || 'শেয়ার বরাদ্দে ত্রুটি', 'error');
      }
    } catch (err) {
      showNotification('সার্ভার যোগাযোগ ত্রুটি', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Create New Member (Add Member from Admin Panel)
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim() || !newMemberPhone.trim()) {
      showNotification('নাম, ইমেইল ও মোবাইল নম্বর আবশ্যক', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newMemberName,
          email: newMemberEmail,
          phone: newMemberPhone,
          password: newMemberPassword || 'member123',
          role: newMemberRole,
          status: newMemberStatus,
          monthly_target: Number(newMemberTarget) || 5000,
          owned_shares: Number(newMemberShares) || 0,
          avatar_url: newMemberAvatar || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('নতুন সদস্য সফলভাবে অন্তর্ভুক্ত হয়েছে!');
        setShowAddMemberModal(false);
        setNewMemberName('');
        setNewMemberEmail('');
        setNewMemberPhone('');
        setNewMemberAvatar('');
        onRefreshData();
      } else {
        showNotification(data.message || 'সদস্য যোগ করতে ব্যর্থ হয়েছে', 'error');
      }
    } catch (err) {
      showNotification('সার্ভার যোগাযোগে ত্রুটি', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Member (Cancel Member)
  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিতভাবে সদস্য "${memberName}"-কে সিস্টেম থেকে স্থায়ীভাবে বাতিল/মুছে ফেলতে চান?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`সদস্য "${memberName}" বাতিল/মুছে ফেলা হয়েছে!`);
        onRefreshData();
      } else {
        showNotification(data.message || 'সদস্য মুছে ফেলা যায়নি', 'error');
      }
    } catch (err) {
      showNotification('সার্ভার যোগাযোগে ত্রুটি', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Land Project Details (share price, installment, total shares, remaining shares, status)
  const handleUpdateLand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLand) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/lands/${editingLand.land_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLand),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('ভূমি প্রকল্পের শেয়ার মূল্য ও তথ্য সফলভাবে আপডেট হয়েছে!');
        setEditingLand(null);
        onRefreshData();
      } else {
        showNotification('আপডেট ব্যর্থ হয়েছে', 'error');
      }
    } catch (err) {
      showNotification('সার্ভার যোগাযোগ ত্রুটি', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Director Management Handlers
  const handleCreateDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirName.trim() || !dirDesignation.trim()) {
      showNotification('পরিচালকের নাম ও পদবী আবশ্যক', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch('/api/directors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dirName,
          designation: dirDesignation,
          phone: dirPhone,
          email: dirEmail,
          photo_url: dirPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
          message: dirMessage,
          order: Number(dirOrder) || 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('পরিচালক সফলভাবে পরিচালনা পর্ষদে যুক্ত হয়েছেন!');
        setShowAddDirectorModal(false);
        setDirName('');
        setDirDesignation('');
        setDirPhone('');
        setDirEmail('');
        setDirPhoto('');
        setDirMessage('');
        onRefreshData();
      }
    } catch (err) {
      showNotification('পরিচালক সংরক্ষণ ব্যর্থ হয়েছে', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDirector) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/directors/${editingDirector.director_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDirector),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('পরিচালকের তথ্য ও বাণী সফলভাবে হালনাগাদ হয়েছে!');
        setEditingDirector(null);
        onRefreshData();
      }
    } catch (err) {
      showNotification('আপডেট ব্যর্থ হয়েছে', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDirector = async (directorId: string, name: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিতভাবে "${name}"-কে পরিচালনা পর্ষদ থেকে মুছে ফেলতে চান?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/directors/${directorId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`পরিচালক "${name}" সফলভাবে মুছে ফেলা হয়েছে!`);
        onRefreshData();
      }
    } catch (err) {
      showNotification('মুছে ফেলতে ত্রুটি হয়েছে', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Comprehensive Settings Saver (Payment, Branding, Logo, Call CTA, Ads, Signature)
  const handleSaveSettingsSection = async (customPayload?: Record<string, any>, successText?: string) => {
    setActionLoading(true);
    try {
      const payload = customPayload || {
        logo_url: cmsLogoUrl,
        project_title: cmsProjectTitle,
        slogan_bengali: cmsSlogan,
        hero_title: cmsHeroTitle,
        hero_subtitle: cmsHeroSubtitle,
        notice_bengali: cmsNotice,
        target_amount: Number(cmsTarget),
        project_vision: cmsVision,
        contact_phone_1: cmsPhone1,
        contact_phone_2: cmsPhone2,
        contact_whatsapp: contactWhatsapp,
        contact_email: cmsEmail,
        contact_address: contactAddress,
        call_cta_phone: callCtaPhone,
        call_cta_text: callCtaText,
        call_cta_timing: callCtaTiming,
        management_lead: cmsLead,
        management_lead_designation: cmsLeadDesignation,
        banner_ad_active: adActive,
        banner_ad_badge: adBadge,
        banner_ad_text: adText,
        banner_ad_image: adImage,
        banner_ad_validity: adValidity,
        banner_ad_action_text: adActionText,
        voucher_signature_url: voucherSignatureUrl,
        voucher_signatory_name: voucherSignatoryName,
        voucher_signatory_title: voucherSignatoryTitle,
        voucher_seal_text: voucherSealText,
        payment_bank_name: payBankName,
        payment_bank_account_name: payBankAccountName,
        payment_bank_account_no: payBankAccountNo,
        payment_bank_branch: payBankBranch,
        payment_bank_routing: payBankRouting,
        payment_bkash_no: payBkashNo,
        payment_nagad_no: payNagadNo,
        payment_rocket_no: payRocketNo,
        payment_instructions: payInstructions,
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(successText || 'সকল তথ্য সফলভাবে অ্যাডমিন প্যানেল থেকে সংরক্ষিত হয়েছে!');
        onRefreshData();
      } else {
        showNotification('সংরক্ষণে ত্রুটি হয়েছে', 'error');
      }
    } catch (err) {
      showNotification('সার্ভার যোগাযোগে ত্রুটি', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered members
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.member_id.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.phone.includes(memberSearch);

    const matchesStatus =
      memberStatusFilter === 'All' ? true : m.status === memberStatusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn font-bengali">
      {/* Admin Top Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-2 border text-sm ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
              : 'bg-red-950/80 border-red-500/60 text-red-200'
          }`}
        >
          <i
            className={`fa-solid ${
              notification.type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-red-400'
            }`}
          ></i>
          <span>{notification.text}</span>
        </div>
      )}

      {/* Admin Header & Stats Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/50 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 text-2xl shadow-lg">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  অ্যাডমিন সেন্ট্রাল কন্ট্রোল প্যানেল
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-bold font-english">
                  ADMIN VIEW
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                বন্ধন ও বিনিয়োগের সদস্য অনুমোদন, আর্থিক ভাউচার যাচাই, ভূমি বরাদ্দ ও কন্টেন্ট ম্যানেজমেন্ট
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Cloudflare Realtime DO Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-emerald-500/40 text-emerald-300 text-xs shadow-inner">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold">Cloudflare Realtime (DO)</span>
              <span className="text-[10px] text-slate-400 font-num">({lastAutoSyncTime})</span>
            </div>

            {/* Cloudflare R2 Object Storage Explorer Button */}
            <button
              onClick={() => setShowAdminR2Modal(true)}
              className="cursor-pointer px-3.5 py-2 rounded-xl bg-orange-600/20 hover:bg-orange-600 text-orange-300 hover:text-white border border-orange-500/40 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              title="Cloudflare R2 ক্লাউড স্টোরেজ"
            >
              <i className="fa-solid fa-cloud text-sm"></i>
              <span>Cloudflare R2</span>
            </button>

            {/* Download Full Database as Excel (A to Z) Button */}
            <button
              onClick={handleExportFullDatabaseToExcel}
              disabled={isManualBackingUp}
              className="cursor-pointer px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition"
              title="D1 ডাটাবেজের সম্পূর্ণ তথ্য (সকল টেবিল A to Z) Excel ফাইলে ডাউনলোড করুন"
            >
              <i className="fa-solid fa-file-excel text-sm"></i>
              <span>{isManualBackingUp ? 'এক্সপোর্ট হচ্ছে...' : 'ডাটাবেজ এক্সপোর্ট (Excel)'}</span>
            </button>

            <button
              onClick={onRefreshData}
              className="cursor-pointer px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <i className="fa-solid fa-arrows-rotate"></i>
              <span>রিফ্রেশ</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">মোট অনুমোদিত মূলধন</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-num">
              {formatTaka(stats?.total_capital || 0)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">
              লক্ষ্যমাত্রার {toBengaliDigits(stats?.capital_percentage || 0)}%
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 relative">
            <span className="text-xs text-slate-400 block mb-1">পেন্ডিং ভাউচার যাচাই</span>
            <span className="text-xl sm:text-2xl font-black text-amber-400 font-num">
              {toBengaliDigits(totalPendingCount)} টি
            </span>
            {totalPendingCount > 0 && (
              <span className="absolute top-4 right-4 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
            <span className="text-[10px] text-amber-500/80 block mt-1">
              মোট পরিমাণ: {formatTaka(stats?.total_pending_amount || 0)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">মোট নিবন্ধিত সদস্য</span>
            <span className="text-xl sm:text-2xl font-black text-blue-400 font-num">
              {toBengaliDigits(stats?.total_members || 0)} জন
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">
              সক্রিয় {toBengaliDigits(stats?.active_members || 0)} • পেন্ডিং {toBengaliDigits(stats?.pending_members || 0)}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">ভূমি শেয়ার বিক্রয়</span>
            <span className="text-xl sm:text-2xl font-black text-purple-400 font-num">
              {toBengaliDigits(stats?.sold_land_shares || 0)} / {toBengaliDigits(stats?.total_land_shares || 0)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-1">
              সক্রিয় প্রকল্প: {toBengaliDigits(stats?.active_lands_count || 0)} টি
            </span>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {/* Tab 1: Pending Deposits */}
        <button
          onClick={() => setAdminTab('pending')}
          className={`cursor-pointer px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            adminTab === 'pending'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <i className="fa-solid fa-clock-rotate-left"></i>
          <span>ভাউচার যাচাই</span>
          {totalPendingCount > 0 && (
            <span className="px-2 py-0.2 rounded-full bg-red-600 text-white text-[11px] font-bold">
              {toBengaliDigits(totalPendingCount)}
            </span>
          )}
        </button>

        {/* Tab 2: Members */}
        <button
          onClick={() => setAdminTab('members')}
          className={`cursor-pointer px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            adminTab === 'members'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <i className="fa-solid fa-users-gear"></i>
          <span>সদস্য ব্যবস্থাপনা ({toBengaliDigits(members.length)})</span>
        </button>

        {/* Tab 3: Lands & Shares */}
        <button
          onClick={() => setAdminTab('lands')}
          className={`cursor-pointer px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            adminTab === 'lands'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <i className="fa-solid fa-map-location-dot"></i>
          <span>ভূমি ও শেয়ার ({toBengaliDigits(lands.length)})</span>
        </button>

        {/* Tab 4: Directors & Leadership */}
        <button
          onClick={() => setAdminTab('directors')}
          className={`cursor-pointer px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            adminTab === 'directors'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <i className="fa-solid fa-user-tie"></i>
          <span>পরিচালনা পর্ষদ ({toBengaliDigits(directorsList.length)})</span>
        </button>

        {/* Tab 5: Official Payment Accounts */}
        <button
          onClick={() => setAdminTab('payments')}
          className={`cursor-pointer px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            adminTab === 'payments'
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <i className="fa-solid fa-building-columns"></i>
          <span>অফিশিয়াল পেমেন্ট তথ্য</span>
        </button>

        {/* Tab 6: Ads & Ticker */}
        <button
          onClick={() => setAdminTab('ads_ticker')}
          className={`cursor-pointer px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            adminTab === 'ads_ticker'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 font-extrabold'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <i className="fa-solid fa-bullhorn"></i>
          <span>বিজ্ঞাপন ও স্ক্রল নোটিশ</span>
        </button>

        {/* Tab 7: Logo & Call CTA */}
        <button
          onClick={() => setAdminTab('branding_contact')}
          className={`cursor-pointer px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            adminTab === 'branding_contact'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <i className="fa-solid fa-phone-volume"></i>
          <span>লগো, যোগাযোগ ও কল CTA</span>
        </button>

        {/* Tab 8: Voucher Signature Upload */}
        <button
          onClick={() => setAdminTab('voucher_signature')}
          className={`cursor-pointer px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            adminTab === 'voucher_signature'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <i className="fa-solid fa-signature"></i>
          <span>ভাউচার স্বাক্ষর আপলোড</span>
        </button>

        {/* Tab 9: Marketplace & Member Proposals */}
        <button
          onClick={() => setAdminTab('marketplace')}
          className={`cursor-pointer px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            adminTab === 'marketplace'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <i className="fa-solid fa-cart-flatbed"></i>
          <span>মার্কেটপ্লেস ও জমি প্রস্তাবনা</span>
        </button>

        {/* Tab 10: Admin ID & Password Security */}
        <button
          onClick={() => setAdminTab('admin_security')}
          className={`cursor-pointer px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
            adminTab === 'admin_security'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <i className="fa-solid fa-key text-amber-300"></i>
          <span>এ্যাডমিন আইডি ও পাসওয়ার্ড</span>
        </button>

        {/* Cloudflare R2 Cloud Storage button */}
        <button
          onClick={() => setShowAdminR2Modal(true)}
          className="cursor-pointer px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 bg-slate-900 text-orange-300 hover:text-white hover:bg-slate-800 border border-orange-500/40 ml-auto"
        >
          <i className="fa-solid fa-cloud text-orange-400"></i>
          <span>Cloudflare R2 ক্লাউড স্টোরেজ</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PENDING DEPOSITS VERIFICATION SUITE */}
      {/* ========================================================================= */}
      {adminTab === 'pending' && (
        <div className="space-y-6">
          {/* Monthly Pending Deposits */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-calendar-days text-blue-400"></i>
                <span>পেন্ডিং মাসিক কিস্তির ভাউচার ({toBengaliDigits(pendingMonthly.length)} টি)</span>
              </h3>
            </div>

            {pendingMonthly.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-950 rounded-2xl border border-slate-800 text-sm">
                <i className="fa-solid fa-circle-check text-emerald-400 text-2xl mb-2 block"></i>
                কোনো পেন্ডিং মাসিক কিস্তির ভাউচার নেই।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-xs">
                      <th className="pb-3">ভাউচার নং</th>
                      <th className="pb-3">সদস্যের নাম ও আইডি</th>
                      <th className="pb-3">কিস্তির মাস</th>
                      <th className="pb-3">পরিমাণ</th>
                      <th className="pb-3">পেমেন্ট মাধ্যম ও TrxID</th>
                      <th className="pb-3 text-center">ভাউচার স্লিপ</th>
                      <th className="pb-3 text-right">কার্যক্রম (Action)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {pendingMonthly.map((m) => (
                      <tr key={m.deposit_id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 text-blue-400 font-mono text-xs">{m.deposit_id}</td>
                        <td className="py-3">
                          <div className="font-semibold text-white">{m.member_name}</div>
                          <div className="text-xs text-slate-400 font-num">{m.member_id}</div>
                        </td>
                        <td className="py-3 font-num font-semibold text-amber-300">{m.month_year}</td>
                        <td className="py-3 font-bold text-emerald-400 font-num">{formatTaka(m.amount)}</td>
                        <td className="py-3 text-slate-300 font-english">
                          <div>{m.payment_method}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{m.trx_id}</div>
                        </td>
                        <td className="py-3 text-center">
                          {m.voucher_url && (
                            <button
                              onClick={() => setPreviewVoucherUrl(m.voucher_url!)}
                              className="cursor-pointer px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs border border-slate-700 inline-flex items-center gap-1"
                            >
                              <i className="fa-regular fa-image"></i>
                              <span>স্লিপ দেখুন</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdateMonthlyStatus(m.deposit_id, 'Approved')}
                              className="cursor-pointer px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition flex items-center gap-1"
                            >
                              <i className="fa-solid fa-check"></i>
                              <span>অনুমোদন</span>
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdateMonthlyStatus(m.deposit_id, 'Rejected')}
                              className="cursor-pointer px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs transition"
                            >
                              <i className="fa-solid fa-xmark"></i>
                              <span>বাতিল</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Lumpsum Pending Deposits */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-layer-group text-amber-400"></i>
                <span>পেন্ডিং এককালীন বিনিয়োগ ভাউচার ({toBengaliDigits(pendingLumpsum.length)} টি)</span>
              </h3>
            </div>

            {pendingLumpsum.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-950 rounded-2xl border border-slate-800 text-sm">
                <i className="fa-solid fa-circle-check text-emerald-400 text-2xl mb-2 block"></i>
                কোনো পেন্ডিং এককালীন বিনিয়োগের ভাউচার নেই।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-xs">
                      <th className="pb-3">ভাউচার নং</th>
                      <th className="pb-3">সদস্যের নাম ও আইডি</th>
                      <th className="pb-3">বিবরণ / প্রকল্প</th>
                      <th className="pb-3">পরিমাণ</th>
                      <th className="pb-3">মাধ্যম ও TrxID</th>
                      <th className="pb-3 text-center">ভাউচার স্লিপ</th>
                      <th className="pb-3 text-right">কার্যক্রম (Action)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {pendingLumpsum.map((l) => (
                      <tr key={l.lumpsum_id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 text-amber-400 font-mono text-xs">{l.lumpsum_id}</td>
                        <td className="py-3">
                          <div className="font-semibold text-white">{l.member_name}</div>
                          <div className="text-xs text-slate-400 font-num">{l.member_id}</div>
                        </td>
                        <td className="py-3">
                          <div className="font-semibold text-slate-200">{l.purpose}</div>
                          <div className="text-xs text-amber-400/80">{l.target_land_name}</div>
                        </td>
                        <td className="py-3 font-bold text-amber-400 font-num">{formatTaka(l.amount)}</td>
                        <td className="py-3 text-slate-300 font-english">
                          <div>{l.payment_method}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{l.trx_id}</div>
                        </td>
                        <td className="py-3 text-center">
                          {l.voucher_url && (
                            <button
                              onClick={() => setPreviewVoucherUrl(l.voucher_url!)}
                              className="cursor-pointer px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs border border-slate-700 inline-flex items-center gap-1"
                            >
                              <i className="fa-regular fa-image"></i>
                              <span>স্লিপ দেখুন</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdateLumpsumStatus(l.lumpsum_id, 'Approved')}
                              className="cursor-pointer px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition flex items-center gap-1"
                            >
                              <i className="fa-solid fa-check"></i>
                              <span>অনুমোদন</span>
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleUpdateLumpsumStatus(l.lumpsum_id, 'Rejected')}
                              className="cursor-pointer px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs transition"
                            >
                              <i className="fa-solid fa-xmark"></i>
                              <span>বাতিল</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MEMBER MANAGER */}
      {/* ========================================================================= */}
      {adminTab === 'members' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-users text-blue-400"></i>
                <span>সদস্য তালিকা ও নিয়ন্ত্রণ খতিয়ান</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                সদস্যদের অনুমোদন, স্থগিতকরণ, কিস্তি টার্গেট ও শেয়ার সংখ্যা পরিবর্তন করুন
              </p>
            </div>

            {/* Filter, Search, and Add Member Button */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="নাম, আইডি বা ফোন দিয়ে খুঁজুন..."
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500 w-52"
              />

              <select
                value={memberStatusFilter}
                onChange={(e: any) => setMemberStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
              >
                <option value="All">সকল স্ট্যাটাস</option>
                <option value="Active">সক্রিয় (Active)</option>
                <option value="Pending">পেন্ডিং (Pending)</option>
                <option value="Blocked">স্থগিত (Blocked)</option>
              </select>

              {/* Add New Member Button */}
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="cursor-pointer px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
              >
                <i className="fa-solid fa-user-plus"></i>
                <span>নতুন সদস্য যোগ করুন</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-xs">
                  <th className="pb-3">আইডি ও নাম</th>
                  <th className="pb-3">যোগাযোগ</th>
                  <th className="pb-3">রোল ও স্ট্যাটাস</th>
                  <th className="pb-3 text-right">মাসিক টার্গেট</th>
                  <th className="pb-3 text-right">মোট জমা (Grand Total)</th>
                  <th className="pb-3 text-center">শেয়ার</th>
                  <th className="pb-3 text-right">নিয়ন্ত্রণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMembers.map((m) => (
                  <tr key={m.member_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={m.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                          alt="avatar"
                          className="w-8 h-8 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <div className="font-bold text-white">{m.full_name}</div>
                          <div className="text-[11px] text-blue-400 font-num">{m.member_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-400 font-english text-xs">
                      <div>{m.phone}</div>
                      <div className="text-slate-500">{m.email}</div>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                          m.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : m.status === 'Pending'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                          {m.status}
                        </span>
                        {m.role === 'Admin' && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 text-[10px] font-bold">
                            ADMIN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 text-right font-num font-semibold text-slate-300">
                      {formatTaka(m.monthly_target)}
                    </td>
                    <td className="py-3.5 text-right font-num font-bold text-emerald-400">
                      {formatTaka(m.grand_total_paid)}
                    </td>
                    <td className="py-3.5 text-center font-num font-bold text-purple-300">
                      {toBengaliDigits(m.owned_shares)} টি
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {m.status === 'Pending' && (
                          <button
                            onClick={() => handleUpdateMemberStatus(m.member_id, 'Active')}
                            title="সদস্য অনুমোদন করুন"
                            className="cursor-pointer px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1"
                          >
                            <i className="fa-solid fa-user-check"></i>
                            <span>অনুমোদন</span>
                          </button>
                        )}

                        {m.status === 'Active' && m.role !== 'Admin' && (
                          <button
                            onClick={() => handleUpdateMemberStatus(m.member_id, 'Blocked')}
                            title="সদস্যপদ সাময়িক স্থগিত করুন"
                            className="cursor-pointer p-1.5 rounded bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                          >
                            <i className="fa-solid fa-ban"></i>
                          </button>
                        )}

                        {m.status === 'Blocked' && (
                          <button
                            onClick={() => handleUpdateMemberStatus(m.member_id, 'Active')}
                            title="সদস্যপদ সক্রিয় করুন"
                            className="cursor-pointer px-2 py-1 rounded bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white text-xs transition"
                          >
                            পুনরায় সক্রিয়
                          </button>
                        )}

                        {/* Member Ledger Download Button */}
                        <button
                          onClick={() => {
                            const memberMonthly = currentMonthlyList.filter((d) => d.member_id === m.member_id);
                            const memberLumpsum = currentLumpsumList.filter((d) => d.member_id === m.member_id);
                            const rows = [
                              ...memberMonthly.map((d) => ({
                                'প্রকার': 'মাসিক কিস্তি',
                                'মাস / তারিখ': d.month_year,
                                'পরিমাণ (টাকা)': d.amount,
                                'পেমেন্ট মাধ্যম': d.payment_method,
                                'Trx ID': d.trx_id,
                                'স্ট্যাটাস': d.status,
                              })),
                              ...memberLumpsum.map((d) => ({
                                'প্রকার': `এককালীন (${d.purpose})`,
                                'মাস / তারিখ': d.submitted_at.slice(0, 10),
                                'পরিমাণ (টাকা)': d.amount,
                                'পেমেন্ট মাধ্যম': d.payment_method,
                                'Trx ID': d.trx_id,
                                'স্ট্যাটাস': d.status,
                              })),
                            ];
                            exportTableToExcel(
                              rows,
                              'Ledger',
                              `Ledger-${m.member_id}-${m.full_name.replace(/\s+/g, '_')}.xlsx`
                            );
                            showNotification(`${m.full_name}-এর সম্পূর্ণ লেজার স্টেটমেন্ট ডাউনলোড হয়েছে!`);
                          }}
                          title="সদস্যের সম্পূর্ণ লেজার স্টেটমেন্ট ডাউনলোড (Excel / Report)"
                          className="cursor-pointer p-1.5 rounded bg-slate-800 hover:bg-emerald-600/30 text-slate-400 hover:text-emerald-300 transition"
                        >
                          <i className="fa-solid fa-file-excel text-emerald-400"></i>
                        </button>

                        {/* Member Ledger Modal (PDF / JPG Download) */}
                        <button
                          onClick={() => setSelectedMemberForLedger(m)}
                          title="সদস্যের লেজার ভিউ এবং JPG / PDF ডাউনলোড"
                          className="cursor-pointer p-1.5 rounded bg-slate-800 hover:bg-blue-600/30 text-slate-400 hover:text-blue-300 transition"
                        >
                          <i className="fa-solid fa-file-invoice text-blue-400"></i>
                        </button>

                        {/* Quick Password Reset Button */}
                        <button
                          onClick={() => {
                            setMemberToChangePassword(m);
                            setNewPasswordForMember('');
                            setConfirmPasswordForMember('');
                          }}
                          title="পাসওয়ার্ড পরিবর্তন / রিসেট করুন"
                          className="cursor-pointer p-1.5 rounded bg-slate-800 hover:bg-amber-600/30 text-slate-400 hover:text-amber-300 transition"
                        >
                          <i className="fa-solid fa-key"></i>
                        </button>

                        <button
                          onClick={() => {
                            setOriginalMemberId(m.member_id);
                            setEditingMember(m);
                            setEditingMemberPassword('');
                          }}
                          title="সদস্য তথ্য, ইউজার আইডি ও পাসওয়ার্ড সম্পাদনা করুন"
                          className="cursor-pointer p-1.5 rounded bg-slate-800 hover:bg-blue-600/30 text-slate-400 hover:text-blue-300 transition"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>

                        {m.role !== 'Admin' && (
                          <button
                            onClick={() => handleDeleteMember(m.member_id, m.full_name)}
                            title="সদস্য বাতিল / মুছে ফেলুন (Cancel Member)"
                            className="cursor-pointer p-1.5 rounded bg-slate-800 hover:bg-red-600/30 text-slate-400 hover:text-red-400 transition"
                          >
                            <i className="fa-solid fa-user-xmark"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LAND PROJECTS & SHARE DISTRIBUTOR */}
      {/* ========================================================================= */}
      {adminTab === 'lands' && (
        <div className="space-y-6">
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-map-location-dot text-emerald-400"></i>
                <span>ভূমি প্রকল্প ও শেয়ার ডিস্ট্রিবিউটর</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                নতুন প্রকল্প যোগ করুন অথবা সদস্যদের অনুকূলে শেয়ার বরাদ্দ ও সনদ ইস্যু করুন
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAssignShareModal(true)}
                className="cursor-pointer px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-purple-600/30 transition"
              >
                <i className="fa-solid fa-stamp"></i>
                <span>শেয়ার বরাদ্দ করুন</span>
              </button>

              <button
                onClick={() => setShowAddLandModal(true)}
                className="cursor-pointer px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition"
              >
                <i className="fa-solid fa-plus"></i>
                <span>নতুন ভূমি প্রকল্প যুক্ত করুন</span>
              </button>
            </div>
          </div>

          {/* Land Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lands.map((land) => {
              const availableShares = land.total_shares - land.sold_shares;
              const remainingPrice = availableShares * land.share_price;
              const totalProjectCapital = land.total_shares * land.share_price;

              return (
                <div
                  key={land.land_id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between"
                >
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={land.images[0] || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800'}
                      alt={land.land_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[11px] font-bold text-amber-300 border border-amber-400/30">
                      {land.land_id}
                    </div>
                    <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                      {land.status}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="text-base font-bold text-white mb-1">{land.land_name}</h4>
                      <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                        <i className="fa-solid fa-location-dot text-red-400"></i>
                        <span>{land.location}</span>
                      </p>
                      <p className="text-xs text-emerald-400 font-semibold mb-3">
                        আয়তন: {land.area_size}
                      </p>

                      {/* Financial & Share Metrics Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">প্রতি শেয়ার মূল্য</span>
                          <span className="font-bold text-emerald-400 font-num text-xs">{formatTaka(land.share_price)}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">মাসিক কিস্তি</span>
                          <span className="font-bold text-blue-400 font-num text-xs">{formatTaka(land.monthly_installment || 5000)}/মাস</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">অবশিষ্ট শেয়ার</span>
                          <span className="font-bold text-amber-400 font-num text-xs">{toBengaliDigits(availableShares)} টি খালি</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                          <span className="text-slate-400 block text-[10px]">অবশিষ্ট শেয়ারের মোট দাম</span>
                          <span className="font-bold text-amber-300 font-num text-xs">{formatTaka(remainingPrice)}</span>
                        </div>
                      </div>

                      <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] flex justify-between items-center mb-3">
                        <span className="text-slate-400">মোট শেয়ার মূলধন:</span>
                        <span className="font-bold text-white font-num">{formatTaka(totalProjectCapital)}</span>
                      </div>

                      {/* Shares Progress */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-400">শেয়ার বরাদ্দ অগ্রগতি</span>
                          <span className="text-amber-400 font-num">
                            {toBengaliDigits(land.sold_shares)} / {toBengaliDigits(land.total_shares)} টি
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-amber-500"
                            style={{
                              width: `${Math.min(100, Math.round((land.sold_shares / land.total_shares) * 100))}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex justify-between items-center gap-2">
                      <button
                        onClick={() => setEditingLand(land)}
                        className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600/30 text-blue-300 font-semibold text-xs border border-blue-500/30 flex items-center gap-1.5 transition"
                      >
                        <i className="fa-solid fa-pen-to-square text-[11px]"></i>
                        <span>তথ্য ও মূল্য পরিবর্তন</span>
                      </button>

                      <button
                        onClick={() => {
                          setAssignLandId(land.land_id);
                          setShowAssignShareModal(true);
                        }}
                        className="cursor-pointer px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
                      >
                        <i className="fa-solid fa-stamp text-[11px]"></i>
                        <span>শেয়ার বরাদ্দ</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: MARKETPLACE, OFFERS & LAND SUBMISSIONS */}
      {/* ========================================================================= */}
      {adminTab === 'marketplace' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-cart-flatbed text-purple-400"></i>
                <span>মার্কেটপ্লেস ও জমি লেনদেন প্রস্তাবনা</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                পাবলিক ক্রয় প্রস্তাব, জমি বিক্রির আবেদন এবং সদস্যদের ভবিষ্যৎ প্রকল্প প্রস্তাবনা
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchMarketplaceData}
                className="cursor-pointer px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <i className="fa-solid fa-arrows-rotate"></i>
                <span>রিফ্রেশ</span>
              </button>
            </div>
          </div>

          {/* Marketplace Sub-Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
            <button
              onClick={() => setMarketSection('offers')}
              className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                marketSection === 'offers'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <i className="fa-solid fa-cart-shopping"></i>
              <span>জমি ক্রয়ের প্রস্তাব ({toBengaliDigits(offers.length)})</span>
            </button>

            <button
              onClick={() => setMarketSection('submissions')}
              className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                marketSection === 'submissions'
                  ? 'bg-teal-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <i className="fa-solid fa-hand-holding-dollar"></i>
              <span>জমি বিক্রির আবেদন ({toBengaliDigits(submissions.length)})</span>
            </button>

            <button
              onClick={() => setMarketSection('proposals')}
              className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                marketSection === 'proposals'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <i className="fa-solid fa-lightbulb"></i>
              <span>সদস্যদের প্রস্তাবনা ({toBengaliDigits(proposals.length)})</span>
            </button>
          </div>

          {/* Section 1: Offers */}
          {marketSection === 'offers' && (
            <div>
              {offers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-slate-950 rounded-2xl border border-slate-800 text-sm">
                  <i className="fa-solid fa-cart-flatbed text-3xl mb-2 text-slate-600 block"></i>
                  বর্তমানে কোনো ক্রয় প্রস্তাব জমা পড়েনি।
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase text-xs">
                        <th className="pb-3 font-semibold">প্রস্তাবক ক্রেতা</th>
                        <th className="pb-3 font-semibold">লক্ষ্যকৃত ভূমি</th>
                        <th className="pb-3 font-semibold">যোগাযোগ</th>
                        <th className="pb-3 font-semibold text-right">প্রস্তাবিত মূল্য</th>
                        <th className="pb-3 font-semibold text-center">স্ট্যাটাস</th>
                        <th className="pb-3 font-semibold text-right">পদক্ষেপ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {offers.map((offer) => (
                        <tr key={offer.offer_id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5">
                            <div className="font-bold text-white">{offer.buyer_name}</div>
                            <div className="text-[11px] text-slate-400 font-num">
                              {toBengaliDigits(offer.submitted_at)}
                            </div>
                          </td>
                          <td className="py-3.5">
                            <div className="font-semibold text-indigo-300">{offer.land_name}</div>
                            {offer.notes && (
                              <div className="text-[11px] text-slate-400 line-clamp-1 italic mt-0.5">
                                "{offer.notes}"
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 text-slate-300 font-english">
                            <div className="font-medium text-white">{offer.mobile}</div>
                            {offer.email && <div className="text-[11px] text-slate-400">{offer.email}</div>}
                            {offer.address && <div className="text-[11px] text-slate-500 font-bengali">{offer.address}</div>}
                          </td>
                          <td className="py-3.5 text-right font-num font-bold text-emerald-400 text-base">
                            {formatTaka(offer.proposed_price)}
                          </td>
                          <td className="py-3.5 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                offer.status === 'Accepted'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : offer.status === 'Rejected'
                                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              }`}
                            >
                              {offer.status === 'Accepted'
                                ? 'গৃহীত (Accepted)'
                                : offer.status === 'Rejected'
                                ? 'বাতিল'
                                : 'পর্যালোচনাধীন (Pending)'}
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {offer.status !== 'Accepted' && (
                                <button
                                  onClick={async () => {
                                    await fetch(`/api/marketplace/offers/${offer.offer_id}/status`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: 'Accepted' }),
                                    });
                                    showNotification('ক্রয় প্রস্তাবটি গৃহীত হয়েছে!');
                                    fetchMarketplaceData();
                                  }}
                                  className="cursor-pointer px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                                >
                                  গ্রহণ করুন
                                </button>
                              )}
                              {offer.status !== 'Rejected' && (
                                <button
                                  onClick={async () => {
                                    await fetch(`/api/marketplace/offers/${offer.offer_id}/status`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status: 'Rejected' }),
                                    });
                                    showNotification('ক্রয় প্রস্তাব বাতিল করা হয়েছে', 'error');
                                    fetchMarketplaceData();
                                  }}
                                  className="cursor-pointer px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white text-xs"
                                >
                                  বাতিল
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Submissions */}
          {marketSection === 'submissions' && (
            <div>
              {submissions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-slate-950 rounded-2xl border border-slate-800 text-sm">
                  <i className="fa-solid fa-file-circle-question text-3xl mb-2 text-slate-600 block"></i>
                  বর্তমানে কোনো জমি বিক্রির আবেদন নেই।
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {submissions.map((sub) => (
                    <div
                      key={sub.submission_id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 relative hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-mono text-teal-400 font-bold">
                            {sub.submission_id}
                          </span>
                          <h4 className="text-base font-bold text-white">{sub.seller_name}</h4>
                          <div className="text-xs text-slate-400 font-english mt-0.5">
                            <i className="fa-solid fa-phone mr-1 text-slate-500"></i>
                            {sub.mobile} {sub.email && `• ${sub.email}`}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            sub.status === 'Approved' || sub.status === 'Accepted'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : sub.status === 'Rejected' || sub.status === 'Declined'
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {sub.status === 'Approved' || sub.status === 'Accepted'
                            ? 'অনুমোদিত'
                            : sub.status === 'Rejected' || sub.status === 'Declined'
                            ? 'বাতিল'
                            : 'যাচাইাধীন'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">জমির অবস্থান:</span>
                          <span className="text-white font-semibold">{sub.land_location || sub.location}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">জমির পরিমাণ:</span>
                          <span className="text-white font-semibold">{sub.land_size}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-800 pt-1.5">
                          <span className="text-slate-400">প্রত্যাশিত মূল্য:</span>
                          <span className="text-emerald-400 font-bold font-num text-sm">
                            {formatTaka(sub.expected_price)}
                          </span>
                        </div>
                      </div>

                      {sub.description && (
                        <p className="text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60 leading-relaxed">
                          "{sub.description}"
                        </p>
                      )}

                      {/* Photos */}
                      {sub.photos && sub.photos.length > 0 && (
                        <div>
                          <span className="text-[11px] text-slate-400 block mb-1.5">জমির সাইট ছবি:</span>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {sub.photos.map((p, idx) => (
                              <img
                                key={idx}
                                src={p}
                                alt="submission photo"
                                onClick={() => setPreviewVoucherUrl(p)}
                                className="w-16 h-16 rounded-lg object-cover border border-slate-700 cursor-pointer hover:border-emerald-400 transition"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Admin Action */}
                      <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                        <button
                          onClick={async () => {
                            await fetch(`/api/marketplace/submissions/${sub.submission_id}/status`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'Approved' }),
                            });
                            showNotification('আবেদনটি গৃহীত হয়েছে! টিম যোগাযোগ করবে।');
                            fetchMarketplaceData();
                          }}
                          className="cursor-pointer px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                        >
                          যাচাইকৃত ও অনুমোদন
                        </button>
                        <button
                          onClick={async () => {
                            await fetch(`/api/marketplace/submissions/${sub.submission_id}/status`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'Rejected' }),
                            });
                            showNotification('আবেদনটি বাতিল করা হয়েছে', 'error');
                            fetchMarketplaceData();
                          }}
                          className="cursor-pointer px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white text-xs"
                        >
                          বাতিল
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Member Proposals */}
          {marketSection === 'proposals' && (
            <div>
              {proposals.length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-slate-950 rounded-2xl border border-slate-800 text-sm">
                  <i className="fa-solid fa-clipboard-question text-3xl mb-2 text-slate-600 block"></i>
                  সদস্যদের কোনো প্রস্তাব এখনও জমা হয়নি।
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {proposals.map((prop) => (
                    <div
                      key={prop.proposal_id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 relative hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-mono text-cyan-400 font-bold">
                            {prop.proposal_id}
                          </span>
                          <h4 className="text-base font-bold text-white">{prop.location}</h4>
                          <div className="text-xs text-blue-400 mt-0.5">
                            প্রস্তাবক: {prop.member_name} ({prop.member_id})
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            prop.status === 'Approved' || prop.status === 'Accepted'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : prop.status === 'Rejected' || prop.status === 'Declined'
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          }`}
                        >
                          {prop.status === 'Approved' || prop.status === 'Accepted'
                            ? 'গৃহীত'
                            : prop.status === 'Under Review' || prop.status === 'Under_Review'
                            ? 'পর্যালোচনাধীন'
                            : prop.status === 'Rejected' || prop.status === 'Declined'
                            ? 'বাতিল'
                            : 'অপেক্ষমাণ'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">জমির পরিমাণ:</span>
                          <span className="text-white font-semibold">{prop.land_size}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-800 pt-1.5">
                          <span className="text-slate-400">সম্ভাব্য বাজেট / মূল্য:</span>
                          <span className="text-cyan-400 font-bold font-num text-sm">
                            {formatTaka(prop.estimated_price)}
                          </span>
                        </div>
                      </div>

                      {prop.description && (
                        <p className="text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60 leading-relaxed">
                          "{prop.description}"
                        </p>
                      )}

                      {/* Photos */}
                      {prop.photos && prop.photos.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {prop.photos.map((p, idx) => (
                            <img
                              key={idx}
                              src={p}
                              alt="proposal photo"
                              onClick={() => setPreviewVoucherUrl(p)}
                              className="w-14 h-14 rounded-lg object-cover border border-slate-700 cursor-pointer hover:border-cyan-400"
                            />
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                        <button
                          onClick={async () => {
                            await fetch(`/api/member-proposals/${prop.proposal_id}/status`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'Under Review' }),
                            });
                            showNotification('প্রস্তাবটি পরিচালনা পর্ষদের পর্যালোচনায় স্থানান্তর করা হয়েছে!');
                            fetchMarketplaceData();
                          }}
                          className="cursor-pointer px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                        >
                          পর্যালোচনায় নিন
                        </button>
                        <button
                          onClick={async () => {
                            await fetch(`/api/member-proposals/${prop.proposal_id}/status`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'Approved' }),
                            });
                            showNotification('প্রস্তাবটি গৃহীত হয়েছে!');
                            fetchMarketplaceData();
                          }}
                          className="cursor-pointer px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                        >
                          চূড়ান্ত অনুমোদন
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DIRECTORS & LEADERSHIP MANAGEMENT */}
      {/* ========================================================================= */}
      {adminTab === 'directors' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-user-tie text-rose-400"></i>
                <span>পরিচালনা পর্ষদ ও নেতৃত্ব ব্যবস্থাপনা</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                পরিচালনা কমিটির সদস্যদের ছবি, নাম, পদবী, মোবাইল, ইমেইল, বাণী ও ক্রম পরিবর্তন করুন
              </p>
            </div>
            <button
              onClick={() => {
                setDirName('');
                setDirDesignation('');
                setDirPhone('');
                setDirEmail('');
                setDirPhoto('');
                setDirMessage('');
                setDirOrder(directorsList.length + 1);
                setShowAddDirectorModal(true);
              }}
              className="cursor-pointer px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-600/30 transition"
            >
              <i className="fa-solid fa-user-plus"></i>
              <span>নতুন পরিচালক যোগ করুন</span>
            </button>
          </div>

          {directorsList.length === 0 ? (
            <div className="text-center py-10 text-slate-400 bg-slate-950 rounded-2xl border border-slate-800 text-sm">
              <i className="fa-solid fa-users text-3xl mb-2 text-slate-600 block"></i>
              বর্তমানে কোনো পরিচালকের তথ্য সংরক্ষিত নেই।
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {directorsList.map((dir) => (
                <div
                  key={dir.director_id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-rose-500/50 bg-slate-900 shrink-0">
                        <img
                          src={dir.photo_url}
                          alt={dir.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-bold text-white truncate">{dir.name}</h4>
                        <p className="text-xs text-rose-400 font-semibold">{dir.designation}</p>
                        <span className="text-[10px] text-slate-500 font-num">ক্রম: {toBengaliDigits(dir.order)}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-400 font-english bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-phone text-emerald-400 text-[11px]"></i>
                        <span>{dir.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <i className="fa-solid fa-envelope text-blue-400 text-[11px]"></i>
                        <span className="truncate">{dir.email}</span>
                      </div>
                    </div>

                    {dir.message && (
                      <p className="text-xs text-slate-300 italic bg-slate-900/30 p-2.5 rounded-xl border border-slate-800/40 line-clamp-3">
                        "{dir.message}"
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                    <button
                      onClick={() => setEditingDirector(dir)}
                      className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-600/30 text-blue-300 font-semibold text-xs border border-blue-500/30 flex items-center gap-1.5 transition"
                    >
                      <i className="fa-solid fa-pen-to-square text-[11px]"></i>
                      <span>সম্পাদনা</span>
                    </button>
                    <button
                      onClick={() => handleDeleteDirector(dir.director_id, dir.name)}
                      className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-600/30 text-red-300 font-semibold text-xs border border-red-500/30 flex items-center gap-1.5 transition"
                    >
                      <i className="fa-solid fa-trash-can text-[11px]"></i>
                      <span>মুছুন</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: OFFICIAL PAYMENT ACCOUNTS & CHANNELS */}
      {/* ========================================================================= */}
      {adminTab === 'payments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl max-w-4xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-building-columns text-teal-400"></i>
              <span>অফিশিয়াল পেমেন্ট তথ্য নিয়ন্ত্রণ</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              সদস্যদের ড্যাশবোর্ডে প্রদর্শিত ব্যাংক অ্যাকাউন্ট, বিকাশ, নগদ, রকেট ও অর্থ জমা নির্দেশিকা এখান থেকে পরিবর্তন করুন
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveSettingsSection(
                {
                  payment_bank_name: payBankName,
                  payment_bank_account_name: payBankAccountName,
                  payment_bank_account_no: payBankAccountNo,
                  payment_bank_branch: payBankBranch,
                  payment_bank_routing: payBankRouting,
                  payment_bkash_no: payBkashNo,
                  payment_nagad_no: payNagadNo,
                  payment_rocket_no: payRocketNo,
                  payment_instructions: payInstructions,
                },
                'অফিশিয়াল পেমেন্ট তথ্য সফলভাবে সংরক্ষিত হয়েছে!'
              );
            }}
            className="space-y-6 text-xs"
          >
            {/* Bank Information */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-landmark text-blue-400"></i>
                <span>ব্যাংক অ্যাকাউন্ট তথ্য (Bank Details)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">ব্যাংকের নাম</label>
                  <input
                    type="text"
                    required
                    value={payBankName}
                    onChange={(e) => setPayBankName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-english"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">হিসাবের নাম (Account Name)</label>
                  <input
                    type="text"
                    required
                    value={payBankAccountName}
                    onChange={(e) => setPayBankAccountName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-english"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">হিসাব নম্বর (Account Number)</label>
                  <input
                    type="text"
                    required
                    value={payBankAccountNo}
                    onChange={(e) => setPayBankAccountNo(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-num font-bold text-sm text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">শাখা (Branch)</label>
                  <input
                    type="text"
                    required
                    value={payBankBranch}
                    onChange={(e) => setPayBankBranch(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1">রাউটিং নম্বর (Routing Number)</label>
                  <input
                    type="text"
                    value={payBankRouting}
                    onChange={(e) => setPayBankRouting(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-english"
                  />
                </div>
              </div>
            </div>

            {/* Mobile Banking */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-mobile-screen-button text-pink-400"></i>
                <span>মোবাইল ফাইন্যান্সিয়াল সার্ভিস (MFS)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-pink-400 font-bold mb-1">বিকাশ নম্বর (bKash)</label>
                  <input
                    type="text"
                    value={payBkashNo}
                    onChange={(e) => setPayBkashNo(e.target.value)}
                    placeholder="01712-345678 (মার্চেন্ট)"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-num font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-orange-400 font-bold mb-1">নগদ নম্বর (Nagad)</label>
                  <input
                    type="text"
                    value={payNagadNo}
                    onChange={(e) => setPayNagadNo(e.target.value)}
                    placeholder="01890-123456 (ব্যক্তিগত)"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-num font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-purple-400 font-bold mb-1">রকেট নম্বর (Rocket)</label>
                  <input
                    type="text"
                    value={payRocketNo}
                    onChange={(e) => setPayRocketNo(e.target.value)}
                    placeholder="01712-345678-0"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-num font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <label className="block text-slate-300 font-bold mb-1">পেমেন্ট জমা নির্দেশিকা ও নোট</label>
              <textarea
                rows={3}
                value={payInstructions}
                onChange={(e) => setPayInstructions(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs leading-relaxed"
              />
              <span className="text-[11px] text-slate-500 block">
                * এই নির্দেশিকা ড্যাশবোর্ডে কিস্তি বা এককালীন জমা দেওয়ার সময় সদস্যদের প্রদর্শিত হবে।
              </span>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="cursor-pointer px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-600 text-white font-bold text-sm shadow-lg shadow-teal-600/30 transition flex items-center gap-2"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              <span>পেমেন্ট তথ্য সংরক্ষণ করুন</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SPECIAL ADS / OFFERS & SCROLLING NOTICES */}
      {/* ========================================================================= */}
      {adminTab === 'ads_ticker' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl max-w-4xl space-y-8">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-bullhorn text-amber-400"></i>
              <span>বিশেষ বিজ্ঞাপন / অফার ও স্ক্রলিং নোটিশ</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              হোম পেজের বিশেষ প্রমোশনাল ব্যানার অফার এবং ডান-থেকে-বামে স্ক্রল হওয়া নোটিশ টিকিন এখান থেকে নিয়ন্ত্রণ করুন
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveSettingsSection(
                {
                  banner_ad_active: adActive,
                  banner_ad_badge: adBadge,
                  banner_ad_text: adText,
                  banner_ad_image: adImage,
                  banner_ad_validity: adValidity,
                  banner_ad_action_text: adActionText,
                  notice_bengali: cmsNotice,
                },
                'বিজ্ঞাপন ও নোটিশ সফলভাবে সংরক্ষিত হয়েছে!'
              );
            }}
            className="space-y-6 text-xs"
          >
            {/* Section 1: Special Ad / Offer Banner */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-sm">
                    <i className="fa-solid fa-gift"></i>
                  </span>
                  <span className="text-sm font-bold text-white">বিশেষ অফার / প্রমোশন ব্যানার</span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adActive}
                    onChange={(e) => setAdActive(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span className={`text-xs font-bold ${adActive ? 'text-amber-400' : 'text-slate-500'}`}>
                    {adActive ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">অফার ব্যাজ টেক্সট</label>
                  <input
                    type="text"
                    value={adBadge}
                    onChange={(e) => setAdBadge(e.target.value)}
                    placeholder="যেমন: ঈদ ও বৈশাখী বিশেষ অফার"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">অফারের মেয়াদ / সময়সীমা</label>
                  <input
                    type="text"
                    value={adValidity}
                    onChange={(e) => setAdValidity(e.target.value)}
                    placeholder="যেমন: ৩০ অক্টোবর ২০২৬ পর্যন্ত বৈধ"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">বিজ্ঞাপনের মূল বক্তব্য / অফার বিবরণ</label>
                <textarea
                  rows={2}
                  value={adText}
                  onChange={(e) => setAdText(e.target.value)}
                  placeholder="যেমন: একসঙ্গে ৩টি শেয়ার বুকিং দিলে পাচ্ছেন বিশেষ ডিসকাউন্ট..."
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">অ্যাকশন বাটন টেক্সট</label>
                  <input
                    type="text"
                    value={adActionText}
                    onChange={(e) => setAdActionText(e.target.value)}
                    placeholder="যেমন: অফারটি বিস্তারিত দেখুন"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ব্যানার ছবি আপলোড বা URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={adImage}
                      onChange={(e) => setAdImage(e.target.value)}
                      placeholder="https://... অথবা নিচের ফাইল সিলেক্ট করুন"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-english"
                    />
                    <label className="cursor-pointer px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shrink-0 flex items-center gap-1">
                      <i className="fa-solid fa-upload"></i>
                      <span>ফাইল</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageFileUpload(e, setAdImage)}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {adImage && (
                <div className="mt-2">
                  <span className="text-[11px] text-slate-400 block mb-1">ব্যানার ইমেজ প্রিভিউ:</span>
                  <div className="w-full h-32 rounded-xl overflow-hidden border border-amber-400/40 relative">
                    <img src={adImage} alt="Ad Preview" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Scrolling Bengali Marquee Notice */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-scroll"></i>
                </span>
                <div>
                  <span className="text-sm font-bold text-white">স্ক্রলিং নোটিশ বার (ডান থেকে বামে চলবে)</span>
                  <span className="text-[10px] text-emerald-400 ml-2 font-english">Right-to-Left Auto Scroll</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">নোটিশ টেক্সট (বাংলায়)</label>
                <textarea
                  rows={3}
                  required
                  value={cmsNotice}
                  onChange={(e) => setCmsNotice(e.target.value)}
                  placeholder="সকল সদস্যদের অবগতির জন্য জানানো যাচ্ছে যে..."
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white leading-relaxed text-xs"
                />
              </div>

              {/* Live Preview Box */}
              <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-500 block mb-1">লাইভ স্ক্রলিং নোটিশ প্রিভিউ:</span>
                <div className="overflow-hidden whitespace-nowrap bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <div className="animate-marquee-rtl inline-block font-bengali text-amber-300 font-semibold text-xs">
                    {cmsNotice || 'কোনো নোটিশ সেট করা নেই'}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="cursor-pointer px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 transition flex items-center gap-2"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              <span>বিজ্ঞাপন ও স্ক্রল নোটিশ সংরক্ষণ করুন</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: OFFICIAL LOGO, BRANDING & DIRECT CALL CTA */}
      {/* ========================================================================= */}
      {adminTab === 'branding_contact' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl max-w-4xl space-y-8">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-phone-volume text-indigo-400"></i>
              <span>লগো, হোম পেজ তথ্য, যোগাযোগ ও সরাসরি কল CTA</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              সকল স্থানে ব্যবহার্য অফিশিয়াল লগো, হোম পেজের প্রধান টেক্সট, কল CTA হটলাইন এবং অফিস যোগাযোগের যাবতীয় তথ্য
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveSettingsSection(
                {
                  logo_url: cmsLogoUrl,
                  project_title: cmsProjectTitle,
                  slogan_bengali: cmsSlogan,
                  hero_title: cmsHeroTitle,
                  hero_subtitle: cmsHeroSubtitle,
                  target_amount: Number(cmsTarget),
                  project_vision: cmsVision,
                  contact_phone_1: cmsPhone1,
                  contact_phone_2: cmsPhone2,
                  contact_whatsapp: contactWhatsapp,
                  contact_email: cmsEmail,
                  contact_address: contactAddress,
                  call_cta_phone: callCtaPhone,
                  call_cta_text: callCtaText,
                  call_cta_timing: callCtaTiming,
                },
                'লগো, হোম পেজ তথ্য ও যোগাযোগ সেটিংস সফলভাবে সংরক্ষিত হয়েছে!'
              );
            }}
            className="space-y-6 text-xs"
          >
            {/* 1. Official Logo Manager */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <span className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-certificate"></i>
                </span>
                <div>
                  <span className="text-sm font-bold text-white">অফিশিয়াল লগো নিয়ন্ত্রণ (Official Logo)</span>
                  <p className="text-[11px] text-slate-400">এই লগোটি হেডার, স্প্ল্যাশ স্ক্রিন, ভাউচার, সিল ও ওয়াটারমার্কে স্বয়ংক্রিয়ভাবে ব্যবহৃত হবে</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                {/* Logo Preview */}
                <div className="w-24 h-24 rounded-full bg-white p-1 border-4 border-amber-400 shadow-xl overflow-hidden shrink-0 flex items-center justify-center">
                  <img
                    src={cmsLogoUrl || '/bob-logo.png'}
                    alt="Official Logo Preview"
                    className="w-full h-full object-contain"
                    onError={(e: any) => {
                      e.target.src = '/logo.png';
                    }}
                  />
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <label className="block text-slate-400">লগো ইমেজ URL অথবা নতুন লগো আপলোড করুন</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={cmsLogoUrl}
                      onChange={(e) => setCmsLogoUrl(e.target.value)}
                      placeholder="/bob-logo.png অথবা https://..."
                      className="flex-1 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-english text-xs"
                    />
                    <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow transition">
                      <i className="fa-solid fa-cloud-arrow-up"></i>
                      <span>লগো আপলোড</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageFileUpload(e, setCmsLogoUrl)}
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCmsLogoUrl('/bob-logo.png')}
                      className="cursor-pointer text-[11px] text-amber-400 hover:underline"
                    >
                      ডিফল্ট BoB অফিশিয়াল লগো সেট করুন (/bob-logo.png)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Direct Call CTA Settings */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-phone-volume"></i>
                </span>
                <div>
                  <span className="text-sm font-bold text-white">যোগাযোগ ও সরাসরি কল (Call CTA) সেটিংস</span>
                  <p className="text-[11px] text-slate-400">হোম পেজের হিরো সেকশনে সরাসরি কল করার বাটন ও হটলাইন তথ্য</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">সরাসরি কল নম্বর (Call Phone)</label>
                  <input
                    type="text"
                    required
                    value={callCtaPhone}
                    onChange={(e) => setCallCtaPhone(e.target.value)}
                    placeholder="+880 1712-345678"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-english text-xs font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">কল বাটন টেক্সট</label>
                  <input
                    type="text"
                    value={callCtaText}
                    onChange={(e) => setCallCtaText(e.target.value)}
                    placeholder="সরাসরি কল করুন"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">হটলাইন সহায়তার সময়সূচী</label>
                  <input
                    type="text"
                    value={callCtaTiming}
                    onChange={(e) => setCallCtaTiming(e.target.value)}
                    placeholder="সকাল ৯:০০ টা থেকে রাত ১০:০০ টা"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 3. Homepage Headlines & Titles */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-heading text-blue-400"></i>
                <span>হোম পেজের প্রধান শিরোনাম ও ভিশন</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">উদ্যোগের নাম (Project Title)</label>
                  <input
                    type="text"
                    required
                    value={cmsProjectTitle}
                    onChange={(e) => setCmsProjectTitle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">অফিশিয়াল স্লোগান (Slogan)</label>
                  <input
                    type="text"
                    required
                    value={cmsSlogan}
                    onChange={(e) => setCmsSlogan(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-emerald-400 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">হোম পেজ হিরো শিরোনাম</label>
                <input
                  type="text"
                  value={cmsHeroTitle}
                  onChange={(e) => setCmsHeroTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">হোম পেজ হিরো উপ-শিরোনাম ও বর্ণনা</label>
                <textarea
                  rows={2}
                  value={cmsHeroSubtitle}
                  onChange={(e) => setCmsHeroSubtitle(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">তহবিল লক্ষ্যমাত্রা (টাকা)</label>
                  <input
                    type="number"
                    step="500000"
                    value={cmsTarget}
                    onChange={(e) => setCmsTarget(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-num font-bold text-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">প্রকল্পের রূপরেখা ও লক্ষ্য</label>
                  <input
                    type="text"
                    value={cmsVision}
                    onChange={(e) => setCmsVision(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* 4. Contact Details & Address */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-address-book text-amber-400"></i>
                <span>সাধারণ অফিস যোগাযোগ ও ঠিকানা</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">হটলাইন ১</label>
                  <input
                    type="text"
                    value={cmsPhone1}
                    onChange={(e) => setCmsPhone1(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-english"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">হটলাইন ২</label>
                  <input
                    type="text"
                    value={cmsPhone2}
                    onChange={(e) => setCmsPhone2(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-english"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">হোয়াটসঅ্যাপ (WhatsApp)</label>
                  <input
                    type="text"
                    value={contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-english"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">অফিশিয়াল ইমেইল</label>
                  <input
                    type="email"
                    value={cmsEmail}
                    onChange={(e) => setCmsEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-english"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">অফিস কার্যালয়ের ঠিকানা</label>
                <input
                  type="text"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="cursor-pointer px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              <span>সকল ব্র্যান্ডিং ও যোগাযোগ তথ্য সংরক্ষণ করুন</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: OFFICIAL VOUCHER SIGNATURE UPLOAD */}
      {/* ========================================================================= */}
      {adminTab === 'voucher_signature' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl max-w-4xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-signature text-cyan-400"></i>
              <span>ভাউচার স্বাক্ষরের ছবি আপলোড ও অনুমোদন সেটিংস</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              অ্যাডমিন প্যানেল থেকে কর্তপক্ষের স্বাক্ষর ছবি আপলোড করুন। সদস্যদের প্রতিটি ডিজিটাল ভাউচার ও স্টেটমেন্টে এই স্বাক্ষরটি দৃশ্যমান থাকবে।
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveSettingsSection(
                {
                  voucher_signature_url: voucherSignatureUrl,
                  voucher_signatory_name: voucherSignatoryName,
                  voucher_signatory_title: voucherSignatoryTitle,
                  voucher_seal_text: voucherSealText,
                },
                'ভাউচার স্বাক্ষর ও সিল সফলভাবে সংরক্ষিত হয়েছে!'
              );
            }}
            className="space-y-6 text-xs"
          >
            <div className="p-6 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-5">
              {/* Signature Upload and URL */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-bold">
                  কর্তৃপক্ষের স্বাক্ষরের ছবি (Signature Image)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voucherSignatureUrl}
                    onChange={(e) => setVoucherSignatureUrl(e.target.value)}
                    placeholder="ছবির URL অথবা নিচের বাটন দিয়ে আপলোড করুন"
                    className="flex-1 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-english text-xs"
                  />
                  <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow transition">
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                    <span>স্বাক্ষর ফাইল আপলোড</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFileUpload(e, setVoucherSignatureUrl)}
                    />
                  </label>
                </div>
                <span className="text-[11px] text-slate-500 block">
                  * ট্রান্সপারেন্ট PNG ব্যাকগ্রাউন্ড বিশিষ্ট স্বাক্ষর ফাইল ব্যবহার করা সর্বোত্তম।
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">স্বাক্ষরকারীর পূর্ণ নাম</label>
                  <input
                    type="text"
                    required
                    value={voucherSignatoryName}
                    onChange={(e) => setVoucherSignatoryName(e.target.value)}
                    placeholder="সজিব মোল্লা"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">স্বাক্ষরকারীর পদবী</label>
                  <input
                    type="text"
                    required
                    value={voucherSignatoryTitle}
                    onChange={(e) => setVoucherSignatoryTitle(e.target.value)}
                    placeholder="ব্যবস্থাপনা পরিচালক ও প্রধান সমন্বয়ক"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">ডিজিটাল অনুমোদিত সিল টেক্সট</label>
                <input
                  type="text"
                  value={voucherSealText}
                  onChange={(e) => setVoucherSealText(e.target.value)}
                  placeholder="বন্ধন ও বিনিয়োগ অনুমোদিত ডিজিটাল সিল"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                />
              </div>

              {/* Live Voucher Signature Preview */}
              <div className="mt-4 p-5 rounded-2xl bg-white text-slate-900 border-2 border-dashed border-slate-300 shadow-md">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-3 font-english">
                  ভাউচার সিল ও স্বাক্ষর প্রিভিউ (Live Voucher Preview)
                </span>
                <div className="flex justify-between items-end pt-4">
                  <div className="text-center">
                    <div className="w-32 border-b border-slate-400 mb-1"></div>
                    <span className="text-[11px] text-slate-600 font-bengali">সদস্যের স্বাক্ষর</span>
                  </div>

                  <div className="text-center flex flex-col items-center">
                    {voucherSignatureUrl ? (
                      <img
                        src={voucherSignatureUrl}
                        alt="Signature Preview"
                        className="h-12 object-contain mb-1"
                      />
                    ) : (
                      <div className="font-bold text-slate-900 text-xs mb-1 font-bengali">
                        {voucherSignatoryName || 'সজিব মোল্লা'}
                      </div>
                    )}
                    <div className="w-36 border-b border-slate-800 mb-1"></div>
                    <span className="font-bold text-slate-900 text-[11px] font-bengali">
                      {voucherSignatoryName || 'সজিব মোল্লা'}
                    </span>
                    <span className="text-[10px] text-slate-600 font-bengali">
                      {voucherSignatoryTitle || 'ব্যবস্থাপনা পরিচালক, BoB'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="cursor-pointer px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 text-white font-bold text-sm shadow-lg shadow-cyan-600/30 transition flex items-center gap-2"
            >
              <i className="fa-solid fa-floppy-disk"></i>
              <span>ভাউচার স্বাক্ষর ও সিল সংরক্ষণ করুন</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 10: ADMIN USER ID & PASSWORD SECURITY MANAGEMENT (Requirements 6 & 9) */}
      {/* ========================================================================= */}
      {adminTab === 'admin_security' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl max-w-3xl space-y-6">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-xl">
                <i className="fa-solid fa-user-shield"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  এ্যাডমিন ইউজার আইডি ও পাসওয়ার্ড পরিবর্তন
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  অ্যাডমিন প্রোফাইলের লগইন ইমেইল/ইউজার আইডি, মেম্বার আইডি এবং পাসওয়ার্ড নিরাপদভাবে হালনাগাদ করুন
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-bold font-english">
              ADMIN SECURITY
            </span>
          </div>

          {adminCredMsg && (
            <div
              className={`p-4 rounded-2xl flex items-center gap-2.5 text-xs sm:text-sm border ${
                adminCredMsg.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/80 border-red-500/50 text-red-200'
              }`}
            >
              <i
                className={`fa-solid ${
                  adminCredMsg.type === 'success'
                    ? 'fa-circle-check text-emerald-400 text-base'
                    : 'fa-triangle-exclamation text-red-400 text-base'
                }`}
              ></i>
              <span>{adminCredMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleAdminCredentialsSubmit} className="space-y-5 text-xs">
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <i className="fa-solid fa-id-card text-blue-400"></i>
                <span>অ্যাডমিন প্রোফাইল ও ইউজার আইডি তথ্য</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    অ্যাডমিন লগইন ইমেইল (User ID / Email)
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@bob.com"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-english text-xs focus:border-red-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    লগইন করার সময় এই ইমেইলটি ব্যবহার করবেন
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    অ্যাডমিন মেম্বার আইডি (Member ID)
                  </label>
                  <input
                    type="text"
                    required
                    value={adminMemberId}
                    onChange={(e) => setAdminMemberId(e.target.value)}
                    placeholder="BoB-001"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-english font-bold text-xs focus:border-red-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    সিস্টেমে অ্যাডমিনের নির্দিষ্ট সদস্য আইডি
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    অ্যাডমিনের পূর্ণ নাম
                  </label>
                  <input
                    type="text"
                    required
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    মোবাইল নম্বর
                  </label>
                  <input
                    type="text"
                    required
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-english text-xs focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <i className="fa-solid fa-lock text-amber-400"></i>
                <span>অ্যাডমিন পাসওয়ার্ড পরিবর্তন</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    নতুন পাসওয়ার্ড
                  </label>
                  <input
                    type="password"
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড অপরিবর্তিত রাখতে খালি রাখুন"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-english text-xs focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    নতুন পাসওয়ার্ড নিশ্চিত করুন
                  </label>
                  <input
                    type="password"
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    placeholder="পুনরায় একই পাসওয়ার্ড লিখুন"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-english text-xs focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={adminCredLoading}
                className="cursor-pointer px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-600/30 transition flex items-center gap-2"
              >
                <i className="fa-solid fa-floppy-disk"></i>
                <span>{adminCredLoading ? 'সংরক্ষণ হচ্ছে...' : 'অ্যাডমিন আইডি ও পাসওয়ার্ড সংরক্ষণ করুন'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Password Reset Modal for Any Member or Admin */}
      {memberToChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn font-bengali">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-sm border border-amber-500/30">
                  <i className="fa-solid fa-key"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">পাসওয়ার্ড পরিবর্তন / রিসেট</h3>
                  <p className="text-[11px] text-slate-400">
                    সদস্য: <strong className="text-white">{memberToChangePassword.full_name}</strong> ({memberToChangePassword.member_id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMemberToChangePassword(null)}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleQuickPasswordReset} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  নতুন পাসওয়ার্ড
                </label>
                <input
                  type="password"
                  required
                  value={newPasswordForMember}
                  onChange={(e) => setNewPasswordForMember(e.target.value)}
                  placeholder="কমপক্ষে ৪ অক্ষরের নতুন পাসওয়ার্ড"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-english text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  পাসওয়ার্ড নিশ্চিত করুন
                </label>
                <input
                  type="password"
                  required
                  value={confirmPasswordForMember}
                  onChange={(e) => setConfirmPasswordForMember(e.target.value)}
                  placeholder="পুনরায় একই পাসওয়ার্ড লিখুন"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-english text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMemberToChangePassword(null)}
                  className="cursor-pointer px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={memberPasswordLoading}
                  className="cursor-pointer px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  {memberPasswordLoading ? 'সংরক্ষণ হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {previewVoucherUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <span className="text-sm font-bold text-white">আপলোডকৃত ভাউচার স্লিপ প্রিভিউ</span>
              <button
                onClick={() => setPreviewVoucherUrl(null)}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-slate-950">
              <img
                src={previewVoucherUrl}
                alt="voucher preview"
                className="max-h-[70vh] rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT MEMBER MODAL (ছবি, নাম, মোবাইল, ইমেইল, টার্গেট, শেয়ার, স্ট্যাটাস পরিবর্তন) */}
      {/* ========================================================================= */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">পুরাতন সদস্যের তথ্য ও ছবি সম্পাদনা</h3>
                <span className="text-xs text-blue-400 font-num">আইডি: {editingMember.member_id}</span>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveMemberEdits} className="space-y-4 text-xs">
              {/* Photo & Upload */}
              <div>
                <label className="block text-slate-400 mb-1">সদস্যের ছবি (Photo/Avatar)</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-950 shrink-0">
                    <img
                      src={editingMember.avatar_url || editingMember.live_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(editingMember.full_name)}`}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingMember.avatar_url || ''}
                        onChange={(e) => setEditingMember({ ...editingMember, avatar_url: e.target.value })}
                        placeholder="https://... অথবা ছবি আপলোড করুন"
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english text-xs"
                      />
                      <label className="cursor-pointer px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shrink-0 flex items-center gap-1 border border-slate-700">
                        <i className="fa-solid fa-upload"></i>
                        <span>ছবি</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleImageFileUpload(e, (url) =>
                              setEditingMember({ ...editingMember, avatar_url: url })
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-slate-400 mb-1">পূর্ণ নাম</label>
                <input
                  type="text"
                  required
                  value={editingMember.full_name}
                  onChange={(e) => setEditingMember({ ...editingMember, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              {/* Mobile & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">মোবাইল নম্বর</label>
                  <input
                    type="text"
                    required
                    value={editingMember.phone}
                    onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ইমেইল ঠিকানা</label>
                  <input
                    type="email"
                    required
                    value={editingMember.email}
                    onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english"
                  />
                </div>
              </div>

              {/* Financial Target & Shares */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">মাসিক কিস্তি টার্গেট (৳)</label>
                  <input
                    type="number"
                    value={editingMember.monthly_target}
                    onChange={(e) => setEditingMember({ ...editingMember, monthly_target: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-num"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">মালিকানাধীন শেয়ার সংখ্যা</label>
                  <input
                    type="number"
                    value={editingMember.owned_shares}
                    onChange={(e) => setEditingMember({ ...editingMember, owned_shares: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-num"
                  />
                </div>
              </div>

              {/* Member ID & Password Editing (Requirements 6 & 9) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/80 border border-amber-500/30">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">সদস্যের ইউজার আইডি (Member ID)</label>
                    <span className="text-[10px] text-amber-400">ইউনিক আইডি</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={editingMember.member_id}
                    onChange={(e) => setEditingMember({ ...editingMember, member_id: e.target.value })}
                    placeholder="যেমন: BoB-001"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-english font-bold text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">নতুন পাসওয়ার্ড নির্ধারণ</label>
                    <span className="text-[10px] text-slate-400">অপরিবর্তিত রাখতে খালি রাখুন</span>
                  </div>
                  <input
                    type="text"
                    value={editingMemberPassword}
                    onChange={(e) => setEditingMemberPassword(e.target.value)}
                    placeholder="নতুন পাসওয়ার্ড লিখুন..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-english text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Status & Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">সদস্য স্ট্যাটাস</label>
                  <select
                    value={editingMember.status}
                    onChange={(e: any) => setEditingMember({ ...editingMember, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="Active">Active (সক্রিয়)</option>
                    <option value="Pending">Pending (পেন্ডিং)</option>
                    <option value="Blocked">Blocked (স্থগিত)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ব্যবহারকারীর রোল</label>
                  <select
                    value={editingMember.role}
                    onChange={(e: any) => setEditingMember({ ...editingMember, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="Member">Member (সদস্য)</option>
                    <option value="Admin">Admin (প্রশাসক)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="cursor-pointer px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="cursor-pointer px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2.5: ADD NEW MEMBER MODAL (নতুন সদস্য যোগ - ছবি, নাম, মোবাইল, ইমেইল) */}
      {/* ========================================================================= */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-user-plus text-blue-400"></i>
                <span>নতুন সদস্য অন্তর্ভুক্ত করুন</span>
              </h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4 text-xs">
              {/* Photo Upload / URL */}
              <div>
                <label className="block text-slate-400 mb-1">সদস্যের ছবি (Photo/Avatar)</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-950 shrink-0">
                    <img
                      src={newMemberAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newMemberName || 'New Member')}`}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMemberAvatar}
                        onChange={(e) => setNewMemberAvatar(e.target.value)}
                        placeholder="https://... অথবা ছবি আপলোড করুন"
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english text-xs"
                      />
                      <label className="cursor-pointer px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shrink-0 flex items-center gap-1 border border-slate-700">
                        <i className="fa-solid fa-upload"></i>
                        <span>ছবি আপলোড</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileUpload(e, setNewMemberAvatar)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-slate-400 mb-1">পূর্ণ নাম</label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="যেমন: মোঃ জাহিদ হাসান"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              {/* Mobile & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">মোবাইল নম্বর</label>
                  <input
                    type="text"
                    required
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    placeholder="01712-345678"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ইমেইল ঠিকানা</label>
                  <input
                    type="email"
                    required
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="member@gmail.com"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-slate-400 mb-1">লগইন পাসওয়ার্ড</label>
                <input
                  type="text"
                  required
                  value={newMemberPassword}
                  onChange={(e) => setNewMemberPassword(e.target.value)}
                  placeholder="member123"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english"
                />
              </div>

              {/* Monthly Target & Shares */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">মাসিক কিস্তি টার্গেট (৳)</label>
                  <input
                    type="number"
                    value={newMemberTarget}
                    onChange={(e) => setNewMemberTarget(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-num"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">প্রাথমিক শেয়ার সংখ্যা</label>
                  <input
                    type="number"
                    value={newMemberShares}
                    onChange={(e) => setNewMemberShares(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-num"
                  />
                </div>
              </div>

              {/* Status & Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">স্ট্যাটাস</label>
                  <select
                    value={newMemberStatus}
                    onChange={(e: any) => setNewMemberStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="Active">Active (সক্রিয়)</option>
                    <option value="Pending">Pending (পেন্ডিং)</option>
                    <option value="Blocked">Blocked (স্থগিত)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">রোল</label>
                  <select
                    value={newMemberRole}
                    onChange={(e: any) => setNewMemberRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="Member">Member (সদস্য)</option>
                    <option value="Admin">Admin (প্রশাসক)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="cursor-pointer px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="cursor-pointer px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  সদস্য তৈরি করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD LAND PROJECT MODAL (মাসিক কিস্তি ও প্রতি শেয়ার মূল্য সহ) */}
      {/* ========================================================================= */}
      {showAddLandModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">নতুন ভূমি প্রকল্প যুক্ত করুন</h3>
              <button
                onClick={() => setShowAddLandModal(false)}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleCreateLand} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">প্রকল্পের নাম</label>
                <input
                  type="text"
                  required
                  value={newLandName}
                  onChange={(e) => setNewLandName(e.target.value)}
                  placeholder="যেমন: পূর্বাচল গ্রিন সিটি ভিউ"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">অবস্থান / লোকেশন</label>
                  <input
                    type="text"
                    required
                    value={newLandLocation}
                    onChange={(e) => setNewLandLocation(e.target.value)}
                    placeholder="সেক্টর ২১, পূর্বাচল"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">জমির আয়তন (কাঠা/বিঘা)</label>
                  <input
                    type="text"
                    required
                    value={newLandArea}
                    onChange={(e) => setNewLandArea(e.target.value)}
                    placeholder="১০ কাঠা"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">মোট শেয়ার</label>
                  <input
                    type="number"
                    required
                    value={newLandShares}
                    onChange={(e) => setNewLandShares(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-num"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">প্রতি শেয়ার মূল্য (৳)</label>
                  <input
                    type="number"
                    required
                    value={newLandSharePrice}
                    onChange={(e) => setNewLandSharePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-num"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">মাসিক কিস্তি (৳)</label>
                  <input
                    type="number"
                    required
                    value={newLandMonthlyInstallment}
                    onChange={(e) => setNewLandMonthlyInstallment(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-num text-blue-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">মোট মূল্য (৳)</label>
                  <input
                    type="number"
                    required
                    value={newLandPrice}
                    onChange={(e) => setNewLandPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-num"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">ছবির URL বা আপলোড</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLandImage}
                    onChange={(e) => setNewLandImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english"
                  />
                  <label className="cursor-pointer px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shrink-0 flex items-center gap-1 border border-slate-700">
                    <i className="fa-solid fa-upload"></i>
                    <span>ছবি</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageFileUpload(e, setNewLandImage)}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">সংক্ষিপ্ত বিবরণ</label>
                <textarea
                  rows={2}
                  value={newLandDescription}
                  onChange={(e) => setNewLandDescription(e.target.value)}
                  placeholder="জমি ও আইনি কাগজের বিস্তারিত..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddLandModal(false)}
                  className="cursor-pointer px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="cursor-pointer px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  প্রকল্প যুক্ত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3.5: EDIT LAND PROJECT MODAL (মাসিক কিস্তি, প্রতি শেয়ার মূল্য, অবশিষ্ট শেয়ার ও মোট দাম) */}
      {/* ========================================================================= */}
      {editingLand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">ভূমি প্রকল্প ও শেয়ার মূল্য সম্পাদনা</h3>
                <span className="text-xs text-emerald-400 font-num">আইডি: {editingLand.land_id}</span>
              </div>
              <button
                onClick={() => setEditingLand(null)}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleUpdateLand} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">প্রকল্পের নাম</label>
                <input
                  type="text"
                  required
                  value={editingLand.land_name}
                  onChange={(e) => setEditingLand({ ...editingLand, land_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">অবস্থান / লোকেশন</label>
                  <input
                    type="text"
                    required
                    value={editingLand.location}
                    onChange={(e) => setEditingLand({ ...editingLand, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">জমির আয়তন</label>
                  <input
                    type="text"
                    required
                    value={editingLand.area_size}
                    onChange={(e) => setEditingLand({ ...editingLand, area_size: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              {/* Pricing & Installment Row */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="block text-emerald-400 font-bold mb-1">প্রতি শেয়ার মূল্য (৳)</label>
                  <input
                    type="number"
                    required
                    value={editingLand.share_price}
                    onChange={(e) => setEditingLand({ ...editingLand, share_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-num font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-blue-400 font-bold mb-1">মাসিক কিস্তি পরিমাণ (৳)</label>
                  <input
                    type="number"
                    required
                    value={editingLand.monthly_installment || 5000}
                    onChange={(e) => setEditingLand({ ...editingLand, monthly_installment: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-num font-bold text-blue-400"
                  />
                </div>
              </div>

              {/* Shares & Remaining Row */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">মোট শেয়ার</label>
                  <input
                    type="number"
                    required
                    value={editingLand.total_shares}
                    onChange={(e) => setEditingLand({ ...editingLand, total_shares: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-num"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">বিক্রয়কৃত শেয়ার</label>
                  <input
                    type="number"
                    required
                    value={editingLand.sold_shares}
                    onChange={(e) => setEditingLand({ ...editingLand, sold_shares: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-num"
                  />
                </div>

                <div>
                  <label className="block text-amber-400 mb-1 font-semibold">অবশিষ্ট শেয়ার</label>
                  <div className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-amber-400 font-num font-bold">
                    {toBengaliDigits(editingLand.total_shares - editingLand.sold_shares)} টি
                  </div>
                </div>
              </div>

              {/* Remaining Shares Total Value Display */}
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex justify-between items-center text-xs">
                <span className="text-amber-300">অবশিষ্ট শেয়ারের মোট দাম:</span>
                <span className="font-black text-amber-300 font-num text-sm">
                  {formatTaka((editingLand.total_shares - editingLand.sold_shares) * editingLand.share_price)}
                </span>
              </div>

              {/* Status */}
              <div>
                <label className="block text-slate-400 mb-1">প্রকল্প স্ট্যাটাস</label>
                <select
                  value={editingLand.status}
                  onChange={(e: any) => setEditingLand({ ...editingLand, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >
                  <option value="Active">Active (সক্রিয় বুকিং)</option>
                  <option value="Acquired">Acquired (অর্জিত)</option>
                  <option value="In Discussion">In Discussion (আলোচনায়)</option>
                  <option value="Sold Out">Sold Out (সম্পূর্ণ বিক্রিত)</option>
                </select>
              </div>

              {/* Image URL & Upload */}
              <div>
                <label className="block text-slate-400 mb-1">জমির ছবি URL বা ফাইল</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingLand.images[0] || ''}
                    onChange={(e) => setEditingLand({ ...editingLand, images: [e.target.value, ...editingLand.images.slice(1)] })}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english"
                  />
                  <label className="cursor-pointer px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shrink-0 flex items-center gap-1 border border-slate-700">
                    <i className="fa-solid fa-upload"></i>
                    <span>ছবি</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleImageFileUpload(e, (url) =>
                          setEditingLand({ ...editingLand, images: [url, ...editingLand.images.slice(1)] })
                        )
                      }
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">বিবরণ</label>
                <textarea
                  rows={2}
                  value={editingLand.description}
                  onChange={(e) => setEditingLand({ ...editingLand, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingLand(null)}
                  className="cursor-pointer px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="cursor-pointer px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  তথ্য ও মূল্য আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ADD DIRECTOR MODAL */}
      {/* ========================================================================= */}
      {showAddDirectorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-user-tie text-rose-400"></i>
                <span>নতুন পরিচালক যোগ করুন</span>
              </h3>
              <button
                onClick={() => setShowAddDirectorModal(false)}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleCreateDirector} className="space-y-3 text-xs">
              {/* Photo Upload / URL */}
              <div>
                <label className="block text-slate-400 mb-1">পরিচালকের ছবি</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
                    <img
                      src={dirPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'}
                      alt="director"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={dirPhoto}
                        onChange={(e) => setDirPhoto(e.target.value)}
                        placeholder="https://... অথবা ছবি আপলোড করুন"
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english"
                      />
                      <label className="cursor-pointer px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shrink-0 flex items-center gap-1 border border-slate-700">
                        <i className="fa-solid fa-upload"></i>
                        <span>ছবি আপলোড</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileUpload(e, setDirPhoto)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">পরিচালকের পূর্ণ নাম</label>
                  <input
                    type="text"
                    required
                    value={dirName}
                    onChange={(e) => setDirName(e.target.value)}
                    placeholder="সজিব মোল্লা"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">পদবী</label>
                  <input
                    type="text"
                    required
                    value={dirDesignation}
                    onChange={(e) => setDirDesignation(e.target.value)}
                    placeholder="ব্যবস্থাপনা পরিচালক"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">মোবাইল নম্বর</label>
                  <input
                    type="text"
                    value={dirPhone}
                    onChange={(e) => setDirPhone(e.target.value)}
                    placeholder="+880 1712-345678"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ইমেইল</label>
                  <input
                    type="email"
                    value={dirEmail}
                    onChange={(e) => setDirEmail(e.target.value)}
                    placeholder="director@bob.com"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">পরিচালকের বাণী / বক্তব্য</label>
                <textarea
                  rows={3}
                  value={dirMessage}
                  onChange={(e) => setDirMessage(e.target.value)}
                  placeholder="সততা ও স্বচ্ছতাই আমাদের শক্তি..."
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">প্রদর্শন ক্রম (Order)</label>
                <input
                  type="number"
                  min="1"
                  value={dirOrder}
                  onChange={(e) => setDirOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-num"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDirectorModal(false)}
                  className="cursor-pointer px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="cursor-pointer px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  পরিচালক সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5.5: EDIT DIRECTOR MODAL */}
      {/* ========================================================================= */}
      {editingDirector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-user-pen text-rose-400"></i>
                <span>পরিচালকের তথ্য ও বাণী সম্পাদনা</span>
              </h3>
              <button
                onClick={() => setEditingDirector(null)}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleUpdateDirector} className="space-y-3 text-xs">
              {/* Photo Upload / URL */}
              <div>
                <label className="block text-slate-400 mb-1">পরিচালকের ছবি</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
                    <img
                      src={editingDirector.photo_url}
                      alt={editingDirector.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingDirector.photo_url}
                        onChange={(e) => setEditingDirector({ ...editingDirector, photo_url: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english"
                      />
                      <label className="cursor-pointer px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shrink-0 flex items-center gap-1 border border-slate-700">
                        <i className="fa-solid fa-upload"></i>
                        <span>ছবি</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleImageFileUpload(e, (url) =>
                              setEditingDirector({ ...editingDirector, photo_url: url })
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">পরিচালকের নাম</label>
                  <input
                    type="text"
                    required
                    value={editingDirector.name}
                    onChange={(e) => setEditingDirector({ ...editingDirector, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">পদবী</label>
                  <input
                    type="text"
                    required
                    value={editingDirector.designation}
                    onChange={(e) => setEditingDirector({ ...editingDirector, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">মোবাইল</label>
                  <input
                    type="text"
                    value={editingDirector.phone}
                    onChange={(e) => setEditingDirector({ ...editingDirector, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ইমেইল</label>
                  <input
                    type="email"
                    value={editingDirector.email}
                    onChange={(e) => setEditingDirector({ ...editingDirector, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">পরিচালকের বাণী</label>
                <textarea
                  rows={3}
                  value={editingDirector.message}
                  onChange={(e) => setEditingDirector({ ...editingDirector, message: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">প্রদর্শন ক্রম</label>
                <input
                  type="number"
                  min="1"
                  value={editingDirector.order}
                  onChange={(e) => setEditingDirector({ ...editingDirector, order: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-num"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingDirector(null)}
                  className="cursor-pointer px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="cursor-pointer px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  তথ্য আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: ASSIGN SHARES MODAL */}
      {/* ========================================================================= */}
      {showAssignShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-stamp text-purple-400"></i>
                <span>সদস্যের অনুকূলে শেয়ার বরাদ্দ ও সনদ ইস্যু</span>
              </h3>
              <button
                onClick={() => setShowAssignShareModal(false)}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleAssignShare} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">ভূমি প্রকল্প নির্বাচন করুন</label>
                <select
                  value={assignLandId}
                  onChange={(e) => setAssignLandId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >
                  {lands.map((l) => (
                    <option key={l.land_id} value={l.land_id}>
                      {l.land_name} (অবশিষ্ট: {toBengaliDigits(l.total_shares - l.sold_shares)} টি)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">সদস্য নির্বাচন করুন</label>
                <select
                  value={assignMemberId}
                  onChange={(e) => setAssignMemberId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                >
                  {members.map((m) => (
                    <option key={m.member_id} value={m.member_id}>
                      {m.full_name} ({m.member_id}) - {m.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">বরাদ্দকৃত শেয়ার সংখ্যা</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={assignShareCount}
                    onChange={(e) => setAssignShareCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-num"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">শেয়ার সনদ নম্বর</label>
                  <input
                    type="text"
                    required
                    value={assignCertNo}
                    onChange={(e) => setAssignCertNo(e.target.value)}
                    placeholder="CERT-P01-005"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-english"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignShareModal(false)}
                  className="cursor-pointer px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="cursor-pointer px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  শেয়ার বরাদ্দ নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: SINGLE MEMBER LEDGER PREVIEW & PDF / JPG EXPORT MODAL */}
      {/* ========================================================================= */}
      {selectedMemberForLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn font-bengali">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Top Bar */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <i className="fa-solid fa-file-invoice"></i>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    সদস্য লেজার ও পূর্ণ বিবরণী: {selectedMemberForLedger.full_name} ({selectedMemberForLedger.member_id})
                  </h3>
                  <p className="text-xs text-slate-400">
                    এক ক্লিকে সম্পূর্ণ লেজার PDF অথবা উচ্চ রেজোলিউশন JPG ছবি হিসেবে ডাউনলোড করুন
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Instant Download JPG */}
                <button
                  onClick={async () => {
                    setIsExportingLedgerJpg(true);
                    try {
                      await downloadElementAsJpg(
                        'member-ledger-sheet-admin',
                        `Ledger-${selectedMemberForLedger.member_id}-${selectedMemberForLedger.full_name.replace(/\s+/g, '_')}`
                      );
                      showNotification('সদস্যের লেজার ছবি (JPG) সফলভাবে ডাউনলোড হয়েছে!');
                    } finally {
                      setIsExportingLedgerJpg(false);
                    }
                  }}
                  disabled={isExportingLedgerJpg}
                  className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition"
                  title="JPG ছবি হিসেবে ডাউনলোড"
                >
                  <i className="fa-solid fa-file-image"></i>
                  <span>{isExportingLedgerJpg ? 'ছবি হচ্ছে...' : 'JPG ডাউনলোড'}</span>
                </button>

                {/* Instant Download PDF */}
                <button
                  onClick={async () => {
                    setIsExportingLedgerPdf(true);
                    try {
                      await downloadElementAsPdf(
                        'member-ledger-sheet-admin',
                        `Ledger-${selectedMemberForLedger.member_id}-${selectedMemberForLedger.full_name.replace(/\s+/g, '_')}`
                      );
                      showNotification('সদস্যের লেজার পিডিএফ (PDF) সফলভাবে ডাউনলোড হয়েছে!');
                    } finally {
                      setIsExportingLedgerPdf(false);
                    }
                  }}
                  disabled={isExportingLedgerPdf}
                  className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
                  title="PDF ডকুমেন্ট হিসেবে ডাউনলোড"
                >
                  <i className="fa-solid fa-file-pdf"></i>
                  <span>{isExportingLedgerPdf ? 'পিডিএফ হচ্ছে...' : 'PDF ডাউনলোড'}</span>
                </button>

                {/* Instant Excel Download */}
                <button
                  onClick={() => {
                    const memberDeposits = monthlyDeposits.filter((d) => d.member_id === selectedMemberForLedger.member_id);
                    const memberLumpsum = lumpsumDeposits.filter((d) => d.member_id === selectedMemberForLedger.member_id);
                    const rows = [
                      ...memberDeposits.map((d) => ({
                        'ধরন': 'মাসিক কিস্তি',
                        'মাস/প্রকল্প': d.month_year,
                        'তারিখ': d.submitted_at ? d.submitted_at.slice(0, 10) : '',
                        'পরিমাণ (টাকা)': d.amount,
                        'পেমেন্ট মাধ্যম': d.payment_method,
                        'Trx ID': d.trx_id,
                        'স্ট্যাটাস': d.status,
                      })),
                      ...memberLumpsum.map((d) => ({
                        'ধরন': 'এককালীন জমা',
                        'মাস/প্রকল্প': d.target_land_name || d.purpose,
                        'তারিখ': d.submitted_at ? d.submitted_at.slice(0, 10) : '',
                        'পরিমাণ (টাকা)': d.amount,
                        'পেমেন্ট মাধ্যম': d.payment_method,
                        'Trx ID': d.trx_id,
                        'স্ট্যাটাস': d.status,
                      })),
                    ];
                    exportTableToExcel(
                      rows,
                      'Ledger',
                      `Ledger-${selectedMemberForLedger.member_id}-${selectedMemberForLedger.full_name.replace(/\s+/g, '_')}.xlsx`
                    );
                    showNotification('এক্সেল (.xlsx) ফাইল ডাউনলোড সম্পন্ন হয়েছে!');
                  }}
                  className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition"
                  title="Excel ফাইল ডাউনলোড"
                >
                  <i className="fa-solid fa-file-excel"></i>
                  <span>Excel</span>
                </button>

                <button
                  onClick={() => setSelectedMemberForLedger(null)}
                  className="cursor-pointer p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>
            </div>

            {/* Printable Paper Sheet for Member Ledger */}
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-slate-950/50">
              <div
                id="member-ledger-sheet-admin"
                className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl max-w-3xl mx-auto border border-slate-200"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-800 pb-5 mb-5">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={settings?.logo_url || '/bob-logo.png'}
                      alt="Logo"
                      className="w-14 h-14 object-contain rounded-xl border border-slate-200 p-0.5"
                      onError={(e: any) => {
                        e.target.src = '/bob-logo.png';
                      }}
                    />
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-bengali tracking-tight">
                        {settings?.project_title || 'বন্ধন ও বিনিয়োগ'}
                      </h1>
                      <p className="text-xs text-emerald-700 font-bold font-bengali">
                        {settings?.slogan_bengali || 'যৌথ স্বপ্ন • নিশ্চিত ভবিষ্যৎ'}
                      </p>
                      <p className="text-[10px] text-slate-500 font-english mt-0.5">
                        {settings?.contact_phone_1} • {settings?.contact_email}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 text-xs font-bold inline-block mb-1 font-bengali">
                      সদস্য ব্যক্তিগত লেজার বিবরণী
                    </span>
                    <p className="text-[10px] text-slate-500 font-num">
                      প্রিন্ট তারিখ: {new Date().toLocaleDateString('bn-BD')}
                    </p>
                  </div>
                </div>

                {/* Member Meta Info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-6 font-bengali">
                  <div>
                    <span className="text-slate-500 block text-[10px]">সদস্যের নাম:</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedMemberForLedger.full_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">সদস্য আইডি:</span>
                    <span className="font-bold text-blue-700 font-num text-sm">{selectedMemberForLedger.member_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">মোবাইল নম্বর:</span>
                    <span className="font-bold text-slate-800 font-english text-xs">{selectedMemberForLedger.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">সদস্য স্ট্যাটাস:</span>
                    <span className={`font-bold text-xs ${selectedMemberForLedger.status === 'Active' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {selectedMemberForLedger.status === 'Active' ? 'সক্রিয় (Active)' : selectedMemberForLedger.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">মাসিক টার্গেট:</span>
                    <span className="font-bold text-slate-800 font-num">{formatTaka(selectedMemberForLedger.monthly_target)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">পরিশোধিত কিস্তি মোট:</span>
                    <span className="font-bold text-emerald-700 font-num">{formatTaka(selectedMemberForLedger.total_monthly_paid)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">এককালীন জমা মোট:</span>
                    <span className="font-bold text-amber-700 font-num">{formatTaka(selectedMemberForLedger.total_lumpsum_paid)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">সর্বমোট মোট জমা:</span>
                    <span className="font-bold text-blue-700 font-num">{formatTaka(selectedMemberForLedger.grand_total_paid)}</span>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <div className="overflow-hidden border border-slate-300 rounded-xl mb-6">
                  <table className="w-full text-left text-xs font-bengali">
                    <thead className="bg-slate-800 text-white font-semibold">
                      <tr>
                        <th className="py-2 px-3">ক্র নং</th>
                        <th className="py-2 px-3">ধরন</th>
                        <th className="py-2 px-3">মাস / প্রকল্প</th>
                        <th className="py-2 px-3 font-english">TrxID / মাধ্যম</th>
                        <th className="py-2 px-3 text-right">পরিমাণ (টাকা)</th>
                        <th className="py-2 px-3 text-center">স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-num text-slate-800">
                      {(() => {
                        const mDeps = monthlyDeposits.filter((d) => d.member_id === selectedMemberForLedger.member_id);
                        const lDeps = lumpsumDeposits.filter((d) => d.member_id === selectedMemberForLedger.member_id);
                        const allTx = [
                          ...mDeps.map((d) => ({
                            id: d.deposit_id,
                            type: 'মাসিক কিস্তি',
                            detail: d.month_year,
                            trx: `${d.payment_method} • ${d.trx_id}`,
                            amount: d.amount,
                            status: d.status,
                            date: d.submitted_at ? d.submitted_at.slice(0, 10) : '',
                          })),
                          ...lDeps.map((d) => ({
                            id: d.lumpsum_id,
                            type: 'এককালীন জমা',
                            detail: d.target_land_name || d.purpose,
                            trx: `${d.payment_method} • ${d.trx_id}`,
                            amount: d.amount,
                            status: d.status,
                            date: d.submitted_at ? d.submitted_at.slice(0, 10) : '',
                          })),
                        ];

                        if (allTx.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="text-center py-6 text-slate-500 font-bengali">
                                এই সদস্যের কোনো লেনদেন রেকর্ড পাওয়া যায়নি।
                              </td>
                            </tr>
                          );
                        }

                        return allTx.map((tx, idx) => (
                          <tr key={tx.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="py-2 px-3 text-slate-500">{toBengaliDigits(idx + 1)}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900 font-bengali">{tx.type}</td>
                            <td className="py-2 px-3 font-bold text-slate-800 font-bengali">{tx.detail}</td>
                            <td className="py-2 px-3 font-english text-slate-600 text-[11px]">{tx.trx}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900 font-num">
                              {formatTaka(tx.amount)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  tx.status === 'Approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : tx.status === 'Pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {tx.status === 'Approved' ? 'অনুমোদিত' : tx.status === 'Pending' ? 'পেন্ডিং' : 'বাতিল'}
                              </span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Signatures & Seal */}
                <div className="flex items-end justify-between pt-6 border-t border-slate-300">
                  <div className="text-center">
                    <div className="w-32 border-b border-slate-400 mb-1"></div>
                    <span className="text-[10px] text-slate-600 font-bengali block">সদস্যের স্বাক্ষর</span>
                  </div>

                  <div className="text-center">
                    {settings?.voucher_signature_url ? (
                      <img
                        src={settings.voucher_signature_url}
                        alt="Signature"
                        className="h-10 object-contain mb-1 mx-auto"
                      />
                    ) : (
                      <div className="font-english italic text-blue-900 font-bold text-sm mb-1">
                        Sajib Molla
                      </div>
                    )}
                    <div className="w-36 border-b border-slate-400 mb-1"></div>
                    <span className="text-[10px] font-bold text-slate-900 font-bengali block">
                      {settings?.voucher_signatory_name || 'সজিব মোল্লা'}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bengali block">
                      {settings?.voucher_signatory_title || 'ব্যবস্থাপনা পরিচালক ও প্রধান সমন্বয়ক'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cloudflare R2 Storage Modal for Admin */}
      <CloudflareR2ExplorerModal
        isOpen={showAdminR2Modal}
        onClose={() => setShowAdminR2Modal(false)}
        isAdmin={true}
      />
    </div>
  );
};
