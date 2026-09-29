import React, { useState, useEffect } from 'react';
import type { Member, MonthlyDeposit, LumpsumDeposit, LandInvestment, SystemSettings, AppNotification } from '../types';
import { formatTaka, toBengaliDigits } from '../utils/bengaliUtils';
import { VoucherGeneratorModal } from './VoucherGeneratorModal';
import { MemberProposalModal } from './MemberProposalModal';
import {
  PaidInstallmentsModal,
  LumpsumDepositsModal,
  DueInstallmentsModal,
} from './StatementModals';
import { CloudflareR2ExplorerModal } from './CloudflareR2ExplorerModal';
import { downloadElementAsJpg, downloadElementAsPdf } from '../utils/exportUtils';
import { useCloudflareRealtime } from '../services/realtimeClient';
import { uploadDataUrlToR2 } from '../services/r2Storage';

interface UserDashboardProps {
  currentUser: Member;
  monthlyDeposits: MonthlyDeposit[];
  lumpsumDeposits: LumpsumDeposit[];
  lands: LandInvestment[];
  settings?: SystemSettings | null;
  notifications?: AppNotification[];
  onRefreshData: () => void;
  onOpenNotifications?: () => void;
  onUpdateUser?: (updated: Member) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  currentUser,
  monthlyDeposits,
  lumpsumDeposits,
  lands,
  settings,
  notifications = [],
  onRefreshData,
  onOpenNotifications,
  onUpdateUser,
}) => {
  // Payment module toggle
  const [paymentType, setPaymentType] = useState<'monthly' | 'lumpsum'>('monthly');

  // Form states for Monthly Deposit
  const currentMonthYear = new Date().toISOString().slice(0, 7);
  const [monthlyMonth, setMonthlyMonth] = useState(currentMonthYear);
  const [monthlyAmount, setMonthlyAmount] = useState<number>(currentUser.monthly_target || 5000);
  const [monthlyMethod, setMonthlyMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Bank' | 'Cash'>('bKash');
  const [monthlyTrxId, setMonthlyTrxId] = useState('');
  const [monthlyVoucherPreview, setMonthlyVoucherPreview] = useState<string>('');

  // Form states for Lumpsum Deposit
  const [lumpsumPurpose, setLumpsumPurpose] = useState('ভূমি প্রকল্পের শেয়ার বাবদ জমা');
  const [lumpsumLandId, setLumpsumLandId] = useState<string>(lands[0]?.land_id || '');
  const [lumpsumAmount, setLumpsumAmount] = useState<number>(100000);
  const [lumpsumMethod, setLumpsumMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Bank' | 'Cash'>('Bank');
  const [lumpsumTrxId, setLumpsumTrxId] = useState('');
  const [lumpsumVoucherPreview, setLumpsumVoucherPreview] = useState<string>('');

  // Submission feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Voucher generator modal state
  const [selectedVoucher, setSelectedVoucher] = useState<{
    deposit: MonthlyDeposit | LumpsumDeposit;
    type: 'monthly' | 'lumpsum';
  } | null>(null);

  // Member land proposal modal state
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);

  // Statement & Cloudflare R2 Storage Modals
  const [showPaidInstallmentsModal, setShowPaidInstallmentsModal] = useState(false);
  const [showLumpsumDepositsModal, setShowLumpsumDepositsModal] = useState(false);
  const [showDueInstallmentsModal, setShowDueInstallmentsModal] = useState(false);
  const [showR2StorageModal, setShowR2StorageModal] = useState(false);

  // Member Change Password Modal
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Printable Statement Mode
  const [showFullStatement, setShowFullStatement] = useState(false);
  const [isStatementPdfExporting, setIsStatementPdfExporting] = useState(false);
  const [isStatementJpgExporting, setIsStatementJpgExporting] = useState(false);

  // Filter deposits for current member
  const myMonthly = monthlyDeposits.filter((d) => d.member_id === currentUser.member_id);
  const myLumpsum = lumpsumDeposits.filter((d) => d.member_id === currentUser.member_id);

  // Real-time Cloudflare Durable Objects WebSocket listener for Member updates
  useEffect(() => {
    if (!currentUser?.member_id) return;
    const unsub = useCloudflareRealtime((event) => {
      // Refresh on real-time broadcast
      onRefreshData();
    });
    return () => unsub();
  }, [currentUser?.member_id, onRefreshData]);

  // Profile Edit & Photo Upload Modal State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editFullName, setEditFullName] = useState(currentUser.full_name);
  const [editPhone, setEditPhone] = useState(currentUser.phone);
  const [editAvatarUrl, setEditAvatarUrl] = useState(currentUser.avatar_url || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setEditFullName(currentUser.full_name);
    setEditPhone(currentUser.phone);
    setEditAvatarUrl(currentUser.avatar_url || '');
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) {
      setProfileMsg({ type: 'error', text: 'অনুগ্রহ করে পূর্ণ নাম দিন' });
      return;
    }
    setIsSavingProfile(true);
    setProfileMsg(null);
    try {
      let finalAvatarUrl = editAvatarUrl || currentUser.avatar_url;

      // If user uploaded a new data-URL photo, upload to Cloudflare R2
      if (editAvatarUrl && editAvatarUrl.startsWith('data:')) {
        try {
          const r2Res = await uploadDataUrlToR2(editAvatarUrl, `avatar-${currentUser.member_id}.jpg`, 'avatar');
          if (r2Res.success && r2Res.url) {
            finalAvatarUrl = r2Res.url;
          }
        } catch (e) {}
      }

      const updateData = {
        full_name: editFullName.trim(),
        phone: editPhone.trim(),
        avatar_url: finalAvatarUrl,
      };

      // Call Cloudflare D1 API endpoint
      const res = await fetch(`/api/members/${currentUser.member_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        throw new Error('তথ্য আপডেট সম্পন্ন করা যায়নি');
      }

      const updatedUser = { ...currentUser, ...updateData };
      if (onUpdateUser) onUpdateUser(updatedUser);
      localStorage.setItem('bob_logged_user', JSON.stringify(updatedUser));
      setProfileMsg({ type: 'success', text: 'প্রোফাইল ছবি ও তথ্য Cloudflare D1 ও R2-তে সংরক্ষিত হয়েছে!' });
      onRefreshData();

      setTimeout(() => {
        setShowEditProfileModal(false);
        setProfileMsg(null);
      }, 1200);
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'প্রোফাইল আপডেট ব্যর্থ হয়েছে' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Member Password Change
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setPasswordFeedback({ type: 'error', text: 'অনুগ্রহ করে নতুন পাসওয়ার্ড লিখুন' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'দুই পাসওয়ার্ড মেলেনি' });
      return;
    }

    setPasswordChangeLoading(true);
    setPasswordFeedback(null);
    try {
      const res = await fetch('/api/auth/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_member_id: currentUser.member_id,
          password: newPassword.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordFeedback({ type: 'success', text: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' });
        setTimeout(() => {
          setShowChangePasswordModal(false);
          setNewPassword('');
          setConfirmPassword('');
          setPasswordFeedback(null);
        }, 1500);
      } else {
        setPasswordFeedback({ type: 'error', text: data.message || 'পাসওয়ার্ড পরিবর্তনে ব্যর্থ' });
      }
    } catch (err) {
      setPasswordFeedback({ type: 'error', text: 'সার্ভার সংযোগ ত্রুটি' });
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  // Handle Base64 file upload
  const handleFileUpload = (
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

  // Submit Monthly Deposit
  const handleMonthlySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthlyTrxId.trim()) {
      setStatusMessage({ type: 'error', text: 'ট্রানজেকশন আইডি (TrxID) প্রদান করুন' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/deposits/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: currentUser.member_id,
          month_year: monthlyMonth,
          amount: Number(monthlyAmount),
          payment_method: monthlyMethod,
          trx_id: monthlyTrxId,
          voucher_url: monthlyVoucherPreview || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatusMessage({ type: 'error', text: data.message || 'ভাউচার জমা ব্যর্থ হয়েছে' });
        return;
      }

      setStatusMessage({ type: 'success', text: 'মাসিক কিস্তির ভাউচার জমা হয়েছে! অ্যাডমিন অনুমোদনের পর ব্যালেন্সে যুক্ত হবে।' });
      setMonthlyTrxId('');
      setMonthlyVoucherPreview('');
      onRefreshData();

      if (data.deposit) {
        setSelectedVoucher({ deposit: data.deposit, type: 'monthly' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'সার্ভার সংযোগে ত্রুটি' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Lumpsum Deposit
  const handleLumpsumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lumpsumTrxId.trim()) {
      setStatusMessage({ type: 'error', text: 'ট্রানজেকশন আইডি (TrxID) প্রদান করুন' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/deposits/lumpsum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: currentUser.member_id,
          purpose: lumpsumPurpose,
          amount: Number(lumpsumAmount),
          target_land_id: lumpsumLandId,
          payment_method: lumpsumMethod,
          trx_id: lumpsumTrxId,
          voucher_url: lumpsumVoucherPreview || 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=600&auto=format&fit=crop&q=80',
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatusMessage({ type: 'error', text: data.message || 'এককালীন জমা ব্যর্থ হয়েছে' });
        return;
      }

      setStatusMessage({ type: 'success', text: 'এককালীন বিনিয়োগ ভাউচার দাখিল হয়েছে! অ্যাডমিন অনুমোদনের অপেক্ষায়।' });
      setLumpsumTrxId('');
      setLumpsumVoucherPreview('');
      onRefreshData();

      if (data.deposit) {
        setSelectedVoucher({ deposit: data.deposit, type: 'lumpsum' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'সার্ভার সংযোগে ত্রুটি' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Greeting helper
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'সুপ্রভাত';
    if (hours < 17) return 'শুভ অপরাহ্ন';
    return 'শুভ সন্ধ্যা';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* 1. Dynamic Greeting & Profile Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950/60 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative group">
              <img
                src={currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                alt={currentUser.full_name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-500/60 shadow-lg"
              />
              <button
                onClick={() => setShowEditProfileModal(true)}
                title="প্রোফাইল ছবি ও তথ্য পরিবর্তন করুন (Cloudflare D1 ও R2 Auto-Sync)"
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-2xl flex flex-col items-center justify-center text-white text-[10px] font-semibold transition cursor-pointer"
              >
                <i className="fa-solid fa-camera text-sm mb-0.5 text-amber-300"></i>
                <span>ছবি পরিবর্তন</span>
              </button>
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                currentUser.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs text-blue-300 font-semibold font-bengali">
                  {getGreeting()},
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-num">
                  আইডি: {currentUser.member_id}
                </span>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold font-bengali border ${
                  currentUser.status === 'Active'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/40'
                }`}>
                  {currentUser.status === 'Active' ? 'সক্রিয় সদস্য (Active)' : 'অনুমোদন প্রক্রিয়াধীন (Pending)'}
                </span>

                {/* Cloudflare Realtime DO indicator */}
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-bengali shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Cloudflare Realtime (DO) সক্রিয়</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-bengali tracking-tight">
                {currentUser.full_name}
              </h1>

              <p className="text-xs text-slate-400 font-english mt-0.5">
                {currentUser.email} • {currentUser.phone}
              </p>
            </div>
          </div>

          {/* Quick Action: Profile Edit, Cloudflare R2 Storage, Password Change, Printable Statement & Land Proposal */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setShowEditProfileModal(true)}
              className="cursor-pointer px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 text-xs sm:text-sm font-semibold font-bengali flex items-center gap-1.5 transition"
            >
              <i className="fa-solid fa-user-pen text-emerald-100"></i>
              <span>প্রোফাইল এডিট ও ছবি</span>
            </button>

            <button
              onClick={() => setShowR2StorageModal(true)}
              className="cursor-pointer px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-lg shadow-orange-600/30 text-xs sm:text-sm font-semibold font-bengali flex items-center gap-2 transition"
            >
              <i className="fa-solid fa-cloud text-orange-200 text-base"></i>
              <span>Cloudflare R2 ক্লাউড স্টোরেজ</span>
            </button>

            <button
              onClick={() => setShowChangePasswordModal(true)}
              className="cursor-pointer px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold font-bengali flex items-center gap-1.5 transition"
            >
              <i className="fa-solid fa-key text-blue-400"></i>
              <span>পাসওয়ার্ড পরিবর্তন</span>
            </button>

            <button
              onClick={() => setIsProposalModalOpen(true)}
              className="cursor-pointer px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 text-xs sm:text-sm font-semibold font-bengali flex items-center gap-2 transition"
            >
              <i className="fa-solid fa-map-location-dot text-amber-300"></i>
              <span>নতুন জমি ক্রয়ের প্রস্তাব দাখিল</span>
            </button>

            <button
              onClick={() => setShowFullStatement(true)}
              className="cursor-pointer px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold font-bengali flex items-center gap-2 transition"
            >
              <i className="fa-solid fa-file-invoice text-emerald-400"></i>
              <span>হিসাব বিবরণী (Statement)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overdue Installments Warning Notification Banner */}
      {currentUser.due_installments > 0 && (
        <div
          onClick={() => setShowDueInstallmentsModal(true)}
          className="cursor-pointer p-4 rounded-3xl bg-gradient-to-r from-red-950/90 via-red-900/70 to-red-950/90 border-2 border-red-500/80 text-white shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 flex items-center justify-center text-2xl shrink-0 shadow-lg animate-pulse">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-wider">
                  জরুরি নোটিশ
                </span>
                <h3 className="text-base sm:text-lg font-bold text-red-100 font-bengali">
                  আপনার {toBengaliDigits(currentUser.due_installments)}টি মাসিক কিস্তি বকেয়া রয়েছে!
                </h3>
              </div>
              <p className="text-xs text-red-200 mt-1 font-bengali">
                মোট বকেয়ার পরিমাণ: <strong className="text-white font-num font-bold text-sm">{formatTaka(currentUser.due_installments * (currentUser.monthly_target || 5000))}</strong>। প্রকল্পের নিয়ম অনুযায়ী দ্রুত পরিশোধের জন্য অনুরোধ করা যাচ্ছে।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDueInstallmentsModal(true);
              }}
              className="cursor-pointer px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold font-bengali flex items-center gap-1.5 shadow-lg shadow-red-600/40 transition"
            >
              <i className="fa-solid fa-file-invoice"></i>
              <span>বকেয়া হিসাব ও ছবি ডাউনলোড</span>
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>
        </div>
      )}

      {/* 2. Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1: Monthly Target */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-md">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs mb-2">
            <i className="fa-solid fa-bullseye"></i>
          </div>
          <span className="text-xs text-slate-400 font-bengali block">মাসিক টার্গেট</span>
          <span className="text-lg sm:text-xl font-bold text-white font-num">
            {formatTaka(currentUser.monthly_target)}
          </span>
          <span className="text-[10px] text-slate-500 block font-bengali mt-0.5">প্রতি মাসের ১০ তারিখ</span>
        </div>

        {/* Card 2: Total Monthly Paid - TAP TO VIEW BREAKDOWN & DOWNLOAD IMAGE */}
        <div
          onClick={() => setShowPaidInstallmentsModal(true)}
          className="cursor-pointer p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/60 shadow-md transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-calendar-check"></i>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold group-hover:bg-emerald-600 group-hover:text-white transition">
              হিসাব ও ছবি ↗
            </span>
          </div>
          <span className="text-xs text-slate-400 font-bengali block">পরিশোধিত কিস্তি</span>
          <span className="text-lg sm:text-xl font-bold text-emerald-400 font-num">
            {formatTaka(currentUser.total_monthly_paid)}
          </span>
          <span className="text-[10px] text-emerald-500/80 block font-bengali mt-0.5">ট্যাপ করে প্রতি মাসের হিসাব দেখুন</span>
        </div>

        {/* Card 3: Total Lumpsum Paid - TAP TO VIEW BREAKDOWN & DOWNLOAD IMAGE */}
        <div
          onClick={() => setShowLumpsumDepositsModal(true)}
          className="cursor-pointer p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/60 shadow-md transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-sack-dollar"></i>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-semibold group-hover:bg-amber-600 group-hover:text-white transition">
              হিসাব ও ছবি ↗
            </span>
          </div>
          <span className="text-xs text-slate-400 font-bengali block">এককালীন জমা</span>
          <span className="text-lg sm:text-xl font-bold text-amber-400 font-num">
            {formatTaka(currentUser.total_lumpsum_paid)}
          </span>
          <span className="text-[10px] text-amber-500/80 block font-bengali mt-0.5">ট্যাপ করে জমার বিবরণ দেখুন</span>
        </div>

        {/* Card 4: Grand Total Paid - TAP TO VIEW FULL STATEMENT */}
        <div
          onClick={() => setShowPaidInstallmentsModal(true)}
          className="cursor-pointer p-4 rounded-2xl bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-500/40 hover:border-blue-400 shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-300 flex items-center justify-center text-xs">
              <i className="fa-solid fa-vault"></i>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-semibold group-hover:bg-blue-600 group-hover:text-white transition">
              স্টেটমেন্ট ↗
            </span>
          </div>
          <span className="text-xs text-blue-200 font-bengali block font-semibold">সর্বমোট মোট জমা</span>
          <span className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-emerald-300 font-num">
            {formatTaka(currentUser.grand_total_paid)}
          </span>
          <span className="text-[10px] text-blue-300/80 block font-bengali mt-0.5">ট্যাপ করে সম্পূর্ণ স্টেটমেন্ট দেখুন</span>
        </div>

        {/* Card 5: Due Installments - TAP TO VIEW BREAKDOWN & DOWNLOAD IMAGE */}
        <div
          onClick={() => setShowDueInstallmentsModal(true)}
          className="cursor-pointer p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-red-500/60 shadow-md transition-all group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 font-semibold group-hover:bg-red-600 group-hover:text-white transition">
              হিসাব ও ছবি ↗
            </span>
          </div>
          <span className="text-xs text-slate-400 font-bengali block">বকেয়া কিস্তি</span>
          <span className={`text-lg sm:text-xl font-bold font-num ${
            currentUser.due_installments > 0 ? 'text-red-400' : 'text-slate-300'
          }`}>
            {toBengaliDigits(currentUser.due_installments)} টি
          </span>
          <span className="text-[10px] text-slate-500 block font-bengali mt-0.5">
            {currentUser.due_installments === 0 ? 'কোনো বকেয়া নেই' : 'ট্যাপ করে বকেয়া হিসাব দেখুন'}
          </span>
        </div>

        {/* Card 6: Owned Land Shares */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-md">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center text-xs mb-2">
            <i className="fa-solid fa-award"></i>
          </div>
          <span className="text-xs text-slate-400 font-bengali block">মালিকানাধীন শেয়ার</span>
          <span className="text-lg sm:text-xl font-bold text-purple-300 font-num">
            {toBengaliDigits(currentUser.owned_shares)} টি
          </span>
          <span className="text-[10px] text-purple-400/80 block font-bengali mt-0.5">সনদপত্র প্রাপ্ত</span>
        </div>
      </div>

      {/* 3. Toggle Payment Module */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-bengali flex items-center gap-2">
              <i className="fa-solid fa-credit-card text-emerald-400"></i>
              <span>অর্থ জমা ও ডিজিটাল ভাউচার আপলোড</span>
            </h2>
            <p className="text-xs text-slate-400 font-bengali mt-1">
              মাসিক কিস্তি অথবা এককালীন প্রকল্প শেয়ার জমা দিন এবং তাত্ক্ষণিক ডিজিটাল মানি রিসিট সংগ্রহ করুন
            </p>
          </div>

          {/* Module Tab Toggle */}
          <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-800 self-start sm:self-auto font-bengali">
            <button
              onClick={() => {
                setPaymentType('monthly');
                setStatusMessage(null);
              }}
              className={`cursor-pointer px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                paymentType === 'monthly'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-calendar-days mr-1.5"></i>
              মাসিক কিস্তি (Monthly)
            </button>
            <button
              onClick={() => {
                setPaymentType('lumpsum');
                setStatusMessage(null);
              }}
              className={`cursor-pointer px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                paymentType === 'lumpsum'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-layer-group mr-1.5"></i>
              এককালীন বিনিয়োগ (Lumpsum)
            </button>
          </div>
        </div>

        {/* Feedback message */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl mb-6 text-xs sm:text-sm flex items-center gap-2 font-bengali border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/60 border-red-500/50 text-red-200'
            }`}
          >
            <i className={`fa-solid ${statusMessage.type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-red-400'}`}></i>
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Payment Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-8">
            {paymentType === 'monthly' ? (
              <form onSubmit={handleMonthlySubmit} className="space-y-4 font-bengali">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      কিস্তির মাস ও বছর (YYYY-MM)
                    </label>
                    <input
                      type="month"
                      required
                      value={monthlyMonth}
                      onChange={(e) => setMonthlyMonth(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-english focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      জমার পরিমাণ (টাকা)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">৳</span>
                      <input
                        type="number"
                        min="500"
                        step="500"
                        required
                        value={monthlyAmount}
                        onChange={(e) => setMonthlyAmount(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-num focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      পরিশোধ মাধ্যম (Payment Method)
                    </label>
                    <select
                      value={monthlyMethod}
                      onChange={(e: any) => setMonthlyMethod(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="bKash">বিকাশ (bKash Merchant/Personal)</option>
                      <option value="Nagad">নগদ (Nagad)</option>
                      <option value="Rocket">রকেট (Rocket)</option>
                      <option value="Bank">ব্যাংক ট্রান্সফার (Bank Deposit)</option>
                      <option value="Cash">সরাসরি ক্যাশ (Office Cash)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      ট্রানজেকশন আইডি (TrxID)
                    </label>
                    <input
                      type="text"
                      required
                      value={monthlyTrxId}
                      onChange={(e) => setMonthlyTrxId(e.target.value)}
                      placeholder="যেমন: BK9A772X51 অথবা ব্যাংক ডিপোজিট স্লিপ নং"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-english focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Voucher Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    টাকা জমার ভাউচার / স্লিপ / স্ক্রিনশট আপলোড (ঐচ্ছিক কিন্তু বাঞ্ছনীয়)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setMonthlyVoucherPreview)}
                      className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                    />
                    {monthlyVoucherPreview && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <i className="fa-solid fa-check"></i> ইমেজ লোড হয়েছে
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin"></i>
                      <span>জমা প্রসেসিং হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      <span>মাসিক কিস্তির ভাউচার দাখিল করুন</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLumpsumSubmit} className="space-y-4 font-bengali">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    উদ্দিষ্ট ভূমি প্রকল্প নির্বাচন করুন
                  </label>
                  <select
                    value={lumpsumLandId}
                    onChange={(e) => setLumpsumLandId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-500 focus:outline-none"
                  >
                    {lands.map((land) => (
                      <option key={land.land_id} value={land.land_id}>
                        {land.land_name} — প্রতি শেয়ার {formatTaka(land.share_price)} (অবশিষ্ট {toBengaliDigits(land.total_shares - land.sold_shares)} টি)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      বিনিয়োগের খাত / বিবরণ
                    </label>
                    <input
                      type="text"
                      required
                      value={lumpsumPurpose}
                      onChange={(e) => setLumpsumPurpose(e.target.value)}
                      placeholder="যেমন: ১টি শেয়ার ক্রয় বাবদ এককালীন জমা"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      এককালীন জমার পরিমাণ (টাকা)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">৳</span>
                      <input
                        type="number"
                        min="10000"
                        step="5000"
                        required
                        value={lumpsumAmount}
                        onChange={(e) => setLumpsumAmount(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-num focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      পেমেন্ট মাধ্যম (Payment Method)
                    </label>
                    <select
                      value={lumpsumMethod}
                      onChange={(e: any) => setLumpsumMethod(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-amber-500 focus:outline-none"
                    >
                      <option value="Bank">ব্যাংক ডিপোজিট / অনলাইন ব্যাংকিং</option>
                      <option value="bKash">বিকাশ (bKash)</option>
                      <option value="Nagad">নগদ (Nagad)</option>
                      <option value="Cash">অফিস ক্যাশ (Cash)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      ব্যাংক রেফারেন্স / ট্রানজেকশন আইডি
                    </label>
                    <input
                      type="text"
                      required
                      value={lumpsumTrxId}
                      onChange={(e) => setLumpsumTrxId(e.target.value)}
                      placeholder="যেমন: EBL-ONLINE-987654"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-english focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Voucher Upload */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    ব্যাংক ডিপোজিট স্লিপ / পে-অর্ডার কপি আপলোড
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, setLumpsumVoucherPreview)}
                      className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer"
                    />
                    {lumpsumVoucherPreview && (
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <i className="fa-solid fa-check"></i> ইমেজ লোড হয়েছে
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin"></i>
                      <span>জমা প্রসেসিং হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      <span>এককালীন বিনিয়োগ ভাউচার দাখিল করুন</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right: Payment Instructions Box */}
          <div className="lg:col-span-4 bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-english flex items-center gap-2">
                <i className="fa-solid fa-building-columns text-emerald-400"></i>
                <span>অফিশিয়াল পেমেন্ট তথ্য</span>
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bengali">
                অ্যাডমিন অনুমোদিত
              </span>
            </div>

            <div className="space-y-3 text-xs font-bengali">
              {/* Bank Details */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="font-bold text-white mb-1 flex items-center justify-between">
                  <span>ব্যাংক অ্যাকাউন্ট</span>
                  <span className="text-[10px] text-blue-400 font-english">{settings?.payment_bank_name || 'BRAC Bank PLC'}</span>
                </div>
                <div className="text-slate-400">হিসাবের নাম: {settings?.payment_bank_account_name || 'BONDHON O BINIYOG'}</div>
                <div className="text-emerald-400 font-num font-semibold">হিসাব নং: {settings?.payment_bank_account_no || '1501-2049-88001'}</div>
                <div className="text-slate-500 text-[11px]">শাখা: {settings?.payment_bank_branch || 'গুলশান / বসুন্ধরা শাখা, ঢাকা'}</div>
                {settings?.payment_bank_routing && (
                  <div className="text-slate-500 text-[11px] font-english">রাউটিং: {settings.payment_bank_routing}</div>
                )}
              </div>

              {/* Mobile Banking */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white mb-1 flex items-center justify-between">
                  <span>মোবাইল ব্যাংকিং</span>
                  <span className="text-[10px] text-pink-400 font-english">bKash / Nagad / Rocket</span>
                </div>
                {settings?.payment_bkash_no && (
                  <div className="text-slate-300 flex items-center justify-between">
                    <span className="text-pink-400 font-semibold">বিকাশ:</span>
                    <span className="font-num font-bold text-slate-100">{settings.payment_bkash_no}</span>
                  </div>
                )}
                {settings?.payment_nagad_no && (
                  <div className="text-slate-300 flex items-center justify-between">
                    <span className="text-orange-400 font-semibold">নগদ:</span>
                    <span className="font-num font-bold text-slate-100">{settings.payment_nagad_no}</span>
                  </div>
                )}
                {settings?.payment_rocket_no && (
                  <div className="text-slate-300 flex items-center justify-between">
                    <span className="text-purple-400 font-semibold">রকেট:</span>
                    <span className="font-num font-bold text-slate-100">{settings.payment_rocket_no}</span>
                  </div>
                )}
                <div className="text-amber-400/90 text-[11px] pt-1 border-t border-slate-800">
                  * রেফারেন্সে আপনার মেম্বার আইডি (<strong className="font-num">{currentUser.member_id}</strong>) লিখুন
                </div>
              </div>

              {/* Payment Instruction Notes */}
              {settings?.payment_instructions && (
                <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20 text-slate-300 text-[11px] leading-relaxed">
                  <i className="fa-solid fa-circle-info text-blue-400 mr-1.5"></i>
                  {settings.payment_instructions}
                </div>
              )}

              {/* Direct Call / Hotline Help CTA */}
              {(settings?.call_cta_phone || settings?.contact_phone_1) && (
                <a
                  href={`tel:${(settings.call_cta_phone || settings.contact_phone_1).replace(/\s+/g, '')}`}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition"
                >
                  <i className="fa-solid fa-phone-volume text-emerald-400"></i>
                  <span>পেমেন্ট সংক্রান্ত সহায়তায় সরাসরি কল করুন: {settings.call_cta_phone || settings.contact_phone_1}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Deposit Ledger History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-white font-bengali flex items-center gap-2">
              <i className="fa-solid fa-list-check text-blue-400"></i>
              <span>আমার জমার ইতিহাস ও ডিজিটাল ভাউচার খতিয়ান</span>
            </h3>
            <p className="text-xs text-slate-400 font-bengali mt-0.5">
              অনুমোদিত ও পেন্ডিং থাকা সকল জমার রসিদ দেখুন এবং প্রিন্ট করুন
            </p>
          </div>
        </div>

        {myMonthly.length === 0 && myLumpsum.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-bengali bg-slate-950 rounded-2xl border border-slate-800">
            <i className="fa-solid fa-receipt text-3xl mb-3 text-slate-600 block"></i>
            <p>আপনার কোনো জমার রেকর্ড এখনও নেই।</p>
            <p className="text-xs text-slate-500 mt-1">উপরের ফর্ম থেকে মাসিক কিস্তি বা এককালীন অর্থ জমা দিন।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm font-bengali">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-xs">
                  <th className="pb-3 font-semibold">ভাউচার আইডি</th>
                  <th className="pb-3 font-semibold">ধরণ ও বিবরণ</th>
                  <th className="pb-3 font-semibold">তারিখ</th>
                  <th className="pb-3 font-semibold">মাধ্যম ও TrxID</th>
                  <th className="pb-3 font-semibold text-right">পরিমাণ</th>
                  <th className="pb-3 font-semibold text-center">স্ট্যাটাস</th>
                  <th className="pb-3 font-semibold text-right">মানি রিসিট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {/* Monthly rows */}
                {myMonthly.map((m) => (
                  <tr key={m.deposit_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 text-blue-400 font-mono text-xs font-semibold">
                      {m.deposit_id}
                    </td>
                    <td className="py-3.5 text-white">
                      <div className="font-semibold">মাসিক কিস্তি ({m.month_year})</div>
                      <div className="text-[11px] text-slate-400 font-english">Monthly Installment</div>
                    </td>
                    <td className="py-3.5 text-slate-400 font-num text-xs">
                      {toBengaliDigits(m.submitted_at)}
                    </td>
                    <td className="py-3.5 text-slate-300 font-english">
                      <span className="font-medium">{m.payment_method}</span>
                      <div className="text-[11px] text-slate-500 font-mono">{m.trx_id}</div>
                    </td>
                    <td className="py-3.5 text-right font-bold text-emerald-400 font-num">
                      {formatTaka(m.amount)}
                    </td>
                    <td className="py-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          m.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : m.status === 'Rejected'
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {m.status === 'Approved' ? 'অনুমোদিত' : m.status === 'Rejected' ? 'বাতিল' : 'যাচাইাধীন'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => setSelectedVoucher({ deposit: m, type: 'monthly' })}
                        className="cursor-pointer px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium inline-flex items-center gap-1.5 transition"
                      >
                        <i className="fa-solid fa-receipt text-xs"></i>
                        <span>রসিদ দেখুন</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Lumpsum rows */}
                {myLumpsum.map((l) => (
                  <tr key={l.lumpsum_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 text-amber-400 font-mono text-xs font-semibold">
                      {l.lumpsum_id}
                    </td>
                    <td className="py-3.5 text-white">
                      <div className="font-semibold">{l.purpose}</div>
                      <div className="text-[11px] text-amber-400/80 font-bengali">
                        {l.target_land_name || 'ভূমি প্রকল্প'}
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-400 font-num text-xs">
                      {toBengaliDigits(l.submitted_at)}
                    </td>
                    <td className="py-3.5 text-slate-300 font-english">
                      <span className="font-medium">{l.payment_method}</span>
                      <div className="text-[11px] text-slate-500 font-mono">{l.trx_id}</div>
                    </td>
                    <td className="py-3.5 text-right font-bold text-amber-400 font-num">
                      {formatTaka(l.amount)}
                    </td>
                    <td className="py-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          l.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : l.status === 'Rejected'
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {l.status === 'Approved' ? 'অনুমোদিত' : l.status === 'Rejected' ? 'বাতিল' : 'যাচাইাধীন'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => setSelectedVoucher({ deposit: l, type: 'lumpsum' })}
                        className="cursor-pointer px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-medium inline-flex items-center gap-1.5 transition"
                      >
                        <i className="fa-solid fa-receipt text-xs"></i>
                        <span>রসিদ দেখুন</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Printable Statement Modal */}
      {showFullStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3 no-print">
              <span className="text-sm font-bold text-white font-bengali">
                সদস্য আর্থিক বিবরণী (Official Member Ledger Statement)
              </span>
              <div className="flex items-center gap-2">
                {/* Export JPG */}
                <button
                  onClick={async () => {
                    setIsStatementJpgExporting(true);
                    await downloadElementAsJpg('bob-member-statement', `BoB_Statement_${currentUser.member_id}`);
                    setIsStatementJpgExporting(false);
                  }}
                  disabled={isStatementJpgExporting}
                  className="cursor-pointer px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs font-bengali flex items-center gap-1.5 transition"
                >
                  {isStatementJpgExporting ? (
                    <i className="fa-solid fa-spinner animate-spin"></i>
                  ) : (
                    <i className="fa-solid fa-file-image"></i>
                  )}
                  <span>JPG ডাউনলোড</span>
                </button>

                {/* Export PDF */}
                <button
                  onClick={async () => {
                    setIsStatementPdfExporting(true);
                    await downloadElementAsPdf('bob-member-statement', `BoB_Statement_${currentUser.member_id}`);
                    setIsStatementPdfExporting(false);
                  }}
                  disabled={isStatementPdfExporting}
                  className="cursor-pointer px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs font-bengali flex items-center gap-1.5 transition"
                >
                  {isStatementPdfExporting ? (
                    <i className="fa-solid fa-spinner animate-spin"></i>
                  ) : (
                    <i className="fa-solid fa-file-pdf"></i>
                  )}
                  <span>PDF ডাউনলোড</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="cursor-pointer px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs font-bengali flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-print"></i>
                  <span>প্রিন্ট</span>
                </button>
                <button
                  onClick={() => setShowFullStatement(false)}
                  className="cursor-pointer p-2 rounded-lg text-slate-400 hover:text-white"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div id="bob-member-statement" className="p-8 overflow-y-auto flex-1 bg-white text-slate-900 font-bengali">
              {/* Header */}
              <div className="text-center pb-6 border-b-2 border-slate-800 mb-6">
                <div className="inline-flex items-center gap-3 mb-2">
                  <div className="w-14 h-14 rounded-2xl bg-white p-0.5 border border-slate-300 shadow-sm flex items-center justify-center overflow-hidden">
                    <img
                      src="/bob-logo.png"
                      alt="BoB Official Logo"
                      className="w-full h-full object-contain"
                      onError={(e: any) => {
                        e.target.src = '/logo.png';
                      }}
                    />
                  </div>
                  <div className="text-left">
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">বন্ধন ও বিনিয়োগ (BONDHON O BINIYOG)</h2>
                    <p className="text-xs uppercase font-bold tracking-widest text-slate-600 font-english">
                      Joint Land Investment & Member Deposit Management
                    </p>
                    <p className="text-xs text-emerald-700 font-medium">যৌথ স্বপ্ন • নিশ্চিত ভবিষ্যৎ</p>
                  </div>
                </div>
                <div className="inline-block mt-1 px-4 py-1 rounded bg-slate-900 text-white text-xs font-bold uppercase tracking-wider">
                  সদস্য হিসাব খতিয়ান বিবরণী (MEMBER ACCOUNT STATEMENT)
                </div>
              </div>

              {/* Member Meta */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded border border-slate-300 text-xs mb-6">
                <div>
                  <div><span className="font-bold">সদস্যের নাম: </span>{currentUser.full_name}</div>
                  <div><span className="font-bold">সদস্য আইডি: </span><span className="font-num">{currentUser.member_id}</span></div>
                  <div><span className="font-bold">যোগদানের তারিখ: </span><span className="font-num">{currentUser.joined_date}</span></div>
                </div>
                <div>
                  <div><span className="font-bold">মোবাইল: </span><span className="font-num">{currentUser.phone}</span></div>
                  <div><span className="font-bold">ইমেইল: </span><span className="font-english">{currentUser.email}</span></div>
                  <div><span className="font-bold">মালিকানাধীন শেয়ার: </span><span className="font-num font-bold">{toBengaliDigits(currentUser.owned_shares)} টি</span></div>
                </div>
              </div>

              {/* Summary Strip */}
              <div className="grid grid-cols-3 gap-3 text-center mb-6 text-xs">
                <div className="p-3 bg-slate-100 border border-slate-300 rounded">
                  <span className="text-slate-600 block">মোট পরিশোধিত কিস্তি</span>
                  <span className="font-num font-bold text-sm text-slate-900">{formatTaka(currentUser.total_monthly_paid)}</span>
                </div>
                <div className="p-3 bg-slate-100 border border-slate-300 rounded">
                  <span className="text-slate-600 block">মোট এককালীন জমা</span>
                  <span className="font-num font-bold text-sm text-slate-900">{formatTaka(currentUser.total_lumpsum_paid)}</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded">
                  <span className="text-emerald-800 font-bold block">সর্বমোট জমা (Grand Total)</span>
                  <span className="font-num font-bold text-base text-emerald-900">{formatTaka(currentUser.grand_total_paid)}</span>
                </div>
              </div>

              {/* Transaction Table */}
              <table className="w-full text-left border-collapse border border-slate-300 text-xs mb-8">
                <thead>
                  <tr className="bg-slate-200 border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300">তারিখ</th>
                    <th className="p-2 border-r border-slate-300">ভাউচার নং</th>
                    <th className="p-2 border-r border-slate-300">বিবরণ / খাত</th>
                    <th className="p-2 border-r border-slate-300">মাধ্যম ও TrxID</th>
                    <th className="p-2 border-r border-slate-300 text-center">স্ট্যাটাস</th>
                    <th className="p-2 text-right">পরিমাণ (টাকা)</th>
                  </tr>
                </thead>
                <tbody>
                  {[...myMonthly, ...myLumpsum]
                    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
                    .map((item: any, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-300 font-num">{toBengaliDigits(item.submitted_at)}</td>
                        <td className="p-2 border-r border-slate-300 font-english font-mono text-[11px]">{item.deposit_id || item.lumpsum_id}</td>
                        <td className="p-2 border-r border-slate-300 font-semibold">{item.month_year ? `মাসিক কিস্তি (${item.month_year})` : item.purpose}</td>
                        <td className="p-2 border-r border-slate-300 font-english text-[11px]">{item.payment_method} - {item.trx_id}</td>
                        <td className="p-2 border-r border-slate-300 text-center font-bold">{item.status === 'Approved' ? 'অনুমোদিত' : item.status === 'Rejected' ? 'বাতিল' : 'পেন্ডিং'}</td>
                        <td className="p-2 text-right font-num font-bold">{formatTaka(item.amount)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="pt-12 flex justify-between items-end text-xs">
                <div className="text-center">
                  <div className="w-36 border-b border-slate-600 mb-1"></div>
                  <span>সদস্যের স্বাক্ষর</span>
                </div>
                <div className="text-center flex flex-col items-center">
                  {settings?.voucher_signature_url ? (
                    <img
                      src={settings.voucher_signature_url}
                      alt="Authorized Signature"
                      className="h-10 object-contain mb-1"
                    />
                  ) : (
                    <div className="font-bold">{settings?.voucher_signatory_name || 'সজিব মোল্লা'}</div>
                  )}
                  <div className="w-36 border-b border-slate-800 mb-1"></div>
                  <span className="font-semibold">{settings?.voucher_signatory_title || 'ব্যবস্থাপনা পরিচালক, BoB'}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 text-right no-print">
              <button
                onClick={() => setShowFullStatement(false)}
                className="cursor-pointer px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Single Voucher Modal */}
      {selectedVoucher && (
        <VoucherGeneratorModal
          deposit={selectedVoucher.deposit}
          depositType={selectedVoucher.type}
          member={currentUser}
          settings={settings}
          onClose={() => setSelectedVoucher(null)}
        />
      )}

      {/* 7. Member Proposal Modal */}
      <MemberProposalModal
        isOpen={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
        currentUser={currentUser}
        onProposalSubmitted={() => {
          onRefreshData();
        }}
      />

      {/* 8. Paid Monthly Installments Statement Modal */}
      <PaidInstallmentsModal
        isOpen={showPaidInstallmentsModal}
        onClose={() => setShowPaidInstallmentsModal(false)}
        currentUser={currentUser}
        settings={settings}
        monthlyDeposits={monthlyDeposits}
      />

      {/* 9. Lumpsum Deposits Statement Modal */}
      <LumpsumDepositsModal
        isOpen={showLumpsumDepositsModal}
        onClose={() => setShowLumpsumDepositsModal(false)}
        currentUser={currentUser}
        settings={settings}
        lumpsumDeposits={lumpsumDeposits}
      />

      {/* 10. Due Installments Calculation & Notice Modal */}
      <DueInstallmentsModal
        isOpen={showDueInstallmentsModal}
        onClose={() => setShowDueInstallmentsModal(false)}
        currentUser={currentUser}
        settings={settings}
      />

      {/* 11. Cloudflare R2 Project Files & Archive Modal */}
      <CloudflareR2ExplorerModal
        isOpen={showR2StorageModal}
        onClose={() => setShowR2StorageModal(false)}
      />

      {/* 12. Member Password Change Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn font-bengali">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-key"></i>
                </div>
                <h3 className="text-base font-bold text-white">পাসওয়ার্ড পরিবর্তন করুন</h3>
              </div>
              <button
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setPasswordFeedback(null);
                }}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {passwordFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passwordFeedback.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/80 border border-red-500/40 text-red-200'
                }`}
              >
                <i className={`fa-solid ${passwordFeedback.type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-triangle-exclamation text-red-400'}`}></i>
                <span>{passwordFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">নতুন পাসওয়ার্ড</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-english"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">পাসওয়ার্ড নিশ্চিত করুন</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="পুনরায় একই পাসওয়ার্ড লিখুন"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-english"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="cursor-pointer px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={passwordChangeLoading}
                  className="cursor-pointer px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  {passwordChangeLoading ? 'সংরক্ষণ হচ্ছে...' : 'পাসওয়ার্ড সংরক্ষণ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 13. Member Profile & Photo Edit Modal (Cloudflare D1 & R2) */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn font-bengali">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-user-pen"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">প্রোফাইল তথ্য ও ছবি পরিবর্তন</h3>
                  <p className="text-[11px] text-emerald-400">Cloudflare D1 & R2 Auto-Sync সক্রিয়</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditProfileModal(false);
                  setProfileMsg(null);
                }}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {profileMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/80 border border-red-500/40 text-red-200'
                }`}
              >
                <i className={`fa-solid ${profileMsg.type === 'success' ? 'fa-circle-check text-emerald-400' : 'fa-triangle-exclamation text-red-400'}`}></i>
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              {/* Photo Preview & Selector */}
              <div className="flex items-center gap-4 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <img
                  src={editAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt="Avatar Preview"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/60 shadow-md"
                />
                <div className="flex-1">
                  <label className="block text-slate-300 font-semibold mb-1">নতুন ছবি আপলোড করুন</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setEditAvatarUrl)}
                    className="w-full text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">সর্বোচ্চ ৫ মেগাবাইট (JPG, PNG)</p>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">সদস্যের নাম (Full Name)</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-bengali text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">মোবাইল ফোন নম্বর</label>
                <input
                  type="text"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-english text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="cursor-pointer px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="cursor-pointer px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
                >
                  <i className={`fa-solid fa-cloud-arrow-up ${isSavingProfile ? 'animate-bounce' : ''}`}></i>
                  <span>{isSavingProfile ? 'ক্লাউডে সেভ হচ্ছে...' : 'Cloudflare R2 ও D1-এ সেভ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
