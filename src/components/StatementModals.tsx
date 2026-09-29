import React, { useState } from 'react';
import type { Member, MonthlyDeposit, LumpsumDeposit, SystemSettings } from '../types';
import { formatTaka, toBengaliDigits } from '../utils/bengaliUtils';
import { downloadElementAsJpg, downloadElementAsPdf } from '../utils/exportUtils';
import { uploadDataUrlToR2 } from '../services/r2Storage';
import html2canvas from 'html2canvas';

interface StatementModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Member;
  settings?: SystemSettings | null;
}

// ============================================================================
// 1. PAID INSTALLMENTS STATEMENT MODAL (পরিশোধিত কিস্তির হিসাব ও ছবি ডাউনলোড)
// ============================================================================
interface PaidInstallmentsModalProps extends StatementModalBaseProps {
  monthlyDeposits: MonthlyDeposit[];
}

export const PaidInstallmentsModal: React.FC<PaidInstallmentsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  monthlyDeposits,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isR2Saving, setIsR2Saving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  if (!isOpen) return null;

  const myPaidDeposits = monthlyDeposits
    .filter((d) => d.member_id === currentUser.member_id && d.status === 'Approved')
    .sort((a, b) => new Date(b.month_year).getTime() - new Date(a.month_year).getTime());

  const totalPaidSum = myPaidDeposits.reduce((sum, d) => sum + d.amount, 0);

  const handleDownloadJpg = async () => {
    setIsExporting(true);
    setFeedbackMsg('');
    try {
      const filename = `BoB-Paid-Installments-${currentUser.member_id}-${new Date().toISOString().slice(0, 10)}`;
      const success = await downloadElementAsJpg('paid-installments-statement-sheet', filename);
      if (success) {
        setFeedbackMsg('পরিশোধিত কিস্তির হিসাবের ছবি (JPG) সফলভাবে ডাউনলোড হয়েছে!');
        setTimeout(() => setFeedbackMsg(''), 4000);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsPdfExporting(true);
    setFeedbackMsg('');
    try {
      const filename = `BoB-Paid-Installments-${currentUser.member_id}-${new Date().toISOString().slice(0, 10)}`;
      const success = await downloadElementAsPdf('paid-installments-statement-sheet', filename);
      if (success) {
        setFeedbackMsg('পরিশোধিত কিস্তির হিসাবের পিডিএফ (PDF) সফলভাবে ডাউনলোড হয়েছে!');
        setTimeout(() => setFeedbackMsg(''), 4000);
      }
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleSaveToR2 = async () => {
    const el = document.getElementById('paid-installments-statement-sheet');
    if (!el) return;

    setIsR2Saving(true);
    setFeedbackMsg('');
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
      const filename = `paid-stmt-${currentUser.member_id}-${Date.now()}.jpg`;
      const res = await uploadDataUrlToR2(dataUrl, filename, 'statement');
      if (res.success) {
        setFeedbackMsg('হিসাব বিবরণীটি সফলভাবে Cloudflare R2 বাকেটে সংরক্ষিত হয়েছে!');
        setTimeout(() => setFeedbackMsg(''), 4000);
      } else {
        alert('R2 তে সংরক্ষণ করা সম্ভব হয়নি।');
      }
    } catch (err: any) {
      alert(err.message || 'Cloudflare R2 তে সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setIsR2Saving(false);
    }
  };

  const logoSrc = settings?.logo_url || '/bob-logo.png';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn font-bengali">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <i className="fa-solid fa-receipt"></i>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                পরিশোধিত মাসিক কিস্তির পূর্ণাঙ্গ বিবরণী
              </h3>
              <p className="text-xs text-slate-400">
                মাসভিত্তিক পরিশোধিত কিস্তির হিসাব বিবরণী এবং রসিদ ইমেজ ডাউনলোড
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToR2}
              disabled={isR2Saving}
              className="cursor-pointer px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Cloudflare R2 ক্লাউডে সেভ করুন"
            >
              <i className="fa-solid fa-cloud text-orange-400"></i>
              <span>{isR2Saving ? 'সংরক্ষণ হচ্ছে...' : 'R2 তে সেভ'}</span>
            </button>

            <button
              onClick={handleDownloadJpg}
              disabled={isExporting}
              className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition"
              title="JPG ছবি হিসেবে ডাউনলোড"
            >
              <i className="fa-solid fa-file-image"></i>
              <span>{isExporting ? 'তৈরি হচ্ছে...' : 'JPG ছবি'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isPdfExporting}
              className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
              title="PDF ডকুমেন্ট হিসেবে ডাউনলোড"
            >
              <i className="fa-solid fa-file-pdf"></i>
              <span>{isPdfExporting ? 'পিডিএফ হচ্ছে...' : 'PDF ডাউনলোড'}</span>
            </button>

            <button
              onClick={onClose}
              className="cursor-pointer p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div className="mx-6 mt-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <i className="fa-solid fa-circle-check text-emerald-400"></i>
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Printable/Exportable Paper Sheet */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-slate-950/50">
          <div
            id="paid-installments-statement-sheet"
            className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl max-w-2xl mx-auto border border-slate-200"
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-5 mb-5">
              <div className="flex items-center gap-3.5">
                <img
                  src={logoSrc}
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
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold inline-block mb-1">
                  পরিশোধিত কিস্তি বিবরণী
                </span>
                <p className="text-[10px] text-slate-500 font-num">
                  তারিখ: {new Date().toLocaleDateString('bn-BD')}
                </p>
              </div>
            </div>

            {/* Member Profile Meta Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-6 font-bengali">
              <div>
                <span className="text-slate-500 block text-[10px]">সদস্যের নাম:</span>
                <span className="font-bold text-slate-900 text-sm">{currentUser.full_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">সদস্য আইডি (ID):</span>
                <span className="font-bold text-blue-700 font-num text-sm">{currentUser.member_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">মাসিক টার্গেট:</span>
                <span className="font-bold text-slate-800 font-num text-sm">{formatTaka(currentUser.monthly_target)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">মোট পরিশোধিত কিস্তি:</span>
                <span className="font-bold text-emerald-600 font-num text-sm">{toBengaliDigits(myPaidDeposits.length)} টি মাস</span>
              </div>
            </div>

            {/* Table of Monthly Payments */}
            <div className="overflow-hidden border border-slate-300 rounded-xl mb-6">
              <table className="w-full text-left text-xs font-bengali">
                <thead className="bg-slate-800 text-white font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">ক্র নং</th>
                    <th className="py-2.5 px-3">কিস্তির মাস</th>
                    <th className="py-2.5 px-3">পেমেন্ট মাধ্যম</th>
                    <th className="py-2.5 px-3 font-english">TrxID / তারিখ</th>
                    <th className="py-2.5 px-3 text-right">পরিমাণ (টাকা)</th>
                    <th className="py-2.5 px-3 text-center">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-num text-slate-800">
                  {myPaidDeposits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500 font-bengali">
                        এখনও কোনো অনুমোদিত পরিশোধিত কিস্তি পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    myPaidDeposits.map((d, idx) => (
                      <tr key={d.deposit_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="py-2 px-3 text-slate-500">{toBengaliDigits(idx + 1)}</td>
                        <td className="py-2 px-3 font-bold text-slate-900 font-bengali">
                          {d.month_year}
                        </td>
                        <td className="py-2 px-3 font-bengali">{d.payment_method}</td>
                        <td className="py-2 px-3 font-english text-[11px] text-slate-600">
                          {d.trx_id}
                          <span className="block text-[9px] text-slate-400">{d.submitted_at.slice(0, 10)}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          {formatTaka(d.amount)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-bengali">
                            অনুমোদিত
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Balance Card */}
            <div className="flex justify-between items-center p-4 rounded-xl bg-emerald-50 border-2 border-emerald-400 mb-6">
              <span className="text-sm font-bold text-emerald-950 font-bengali">
                সর্বমোট পরিশোধিত কিস্তির পরিমাণ:
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-800 font-num">
                {formatTaka(totalPaidSum || currentUser.total_monthly_paid)}
              </span>
            </div>

            {/* Signatory & Digital Seal */}
            <div className="flex justify-between items-end pt-4 border-t border-slate-300">
              <div className="text-center">
                <div className="w-32 border-b border-slate-400 mb-1"></div>
                <span className="text-[10px] text-slate-600 font-bengali">সদস্যের স্বাক্ষর</span>
              </div>

              <div className="text-center flex flex-col items-center">
                {settings?.voucher_signature_url ? (
                  <img
                    src={settings.voucher_signature_url}
                    alt="Official Signature"
                    className="h-10 object-contain mb-1"
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
                <span className="text-[8px] text-emerald-700 font-bengali block mt-0.5 font-bold">
                  {settings?.voucher_seal_text || 'বন্ধন ও বিনিয়োগ অনুমোদিত ডিজিটাল সিল'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. LUMPSUM DEPOSITS STATEMENT MODAL (এককালীন জমা হিসাব ও ছবি ডাউনলোড)
// ============================================================================
interface LumpsumDepositsModalProps extends StatementModalBaseProps {
  lumpsumDeposits: LumpsumDeposit[];
}

export const LumpsumDepositsModal: React.FC<LumpsumDepositsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  lumpsumDeposits,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isR2Saving, setIsR2Saving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  if (!isOpen) return null;

  const myLumpsumDeposits = lumpsumDeposits
    .filter((d) => d.member_id === currentUser.member_id && d.status === 'Approved')
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

  const totalLumpsumSum = myLumpsumDeposits.reduce((sum, d) => sum + d.amount, 0);

  const handleDownloadJpg = async () => {
    setIsExporting(true);
    setFeedbackMsg('');
    try {
      const filename = `BoB-Lumpsum-Deposits-${currentUser.member_id}-${new Date().toISOString().slice(0, 10)}`;
      const success = await downloadElementAsJpg('lumpsum-deposits-statement-sheet', filename);
      if (success) {
        setFeedbackMsg('এককালীন জমার হিসাবের ছবি (JPG) সফলভাবে ডাউনলোড সম্পন্ন হয়েছে!');
        setTimeout(() => setFeedbackMsg(''), 4000);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsPdfExporting(true);
    setFeedbackMsg('');
    try {
      const filename = `BoB-Lumpsum-Deposits-${currentUser.member_id}-${new Date().toISOString().slice(0, 10)}`;
      const success = await downloadElementAsPdf('lumpsum-deposits-statement-sheet', filename);
      if (success) {
        setFeedbackMsg('এককালীন জমার হিসাবের পিডিএফ (PDF) সফলভাবে ডাউনলোড হয়েছে!');
        setTimeout(() => setFeedbackMsg(''), 4000);
      }
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleSaveToR2 = async () => {
    const el = document.getElementById('lumpsum-deposits-statement-sheet');
    if (!el) return;

    setIsR2Saving(true);
    setFeedbackMsg('');
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
      const filename = `lumpsum-stmt-${currentUser.member_id}-${Date.now()}.jpg`;
      const res = await uploadDataUrlToR2(dataUrl, filename, 'statement');
      if (res.success) {
        setFeedbackMsg('এককালীন জমার হিসাব বিবরণী Cloudflare R2 বাকেটে সংরক্ষিত হয়েছে!');
        setTimeout(() => setFeedbackMsg(''), 4000);
      } else {
        alert('R2 তে সংরক্ষণ করা সম্ভব হয়নি।');
      }
    } catch (err: any) {
      alert(err.message || 'Cloudflare R2 তে সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setIsR2Saving(false);
    }
  };

  const logoSrc = settings?.logo_url || '/bob-logo.png';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn font-bengali">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <i className="fa-solid fa-sack-dollar"></i>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                এককালীন বিনিয়োগ ও প্রকল্প শেয়ার জমার পূর্ণাঙ্গ হিসাব
              </h3>
              <p className="text-xs text-slate-400">
                এককালীন জমার প্রকল্পভিত্তিক বিবরণী ও মানি রিসিট ডাউনলোড
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToR2}
              disabled={isR2Saving}
              className="cursor-pointer px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Cloudflare R2 ক্লাউডে সেভ করুন"
            >
              <i className="fa-solid fa-cloud text-orange-400"></i>
              <span>{isR2Saving ? 'সংরক্ষণ হচ্ছে...' : 'R2 তে সেভ'}</span>
            </button>

            <button
              onClick={handleDownloadJpg}
              disabled={isExporting}
              className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition"
              title="JPG ছবি হিসেবে ডাউনলোড"
            >
              <i className="fa-solid fa-file-image"></i>
              <span>{isExporting ? 'তৈরি হচ্ছে...' : 'JPG ছবি'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isPdfExporting}
              className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
              title="PDF ডকুমেন্ট হিসেবে ডাউনলোড"
            >
              <i className="fa-solid fa-file-pdf"></i>
              <span>{isPdfExporting ? 'পিডিএফ হচ্ছে...' : 'PDF ডাউনলোড'}</span>
            </button>

            <button
              onClick={onClose}
              className="cursor-pointer p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div className="mx-6 mt-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <i className="fa-solid fa-circle-check text-emerald-400"></i>
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Printable/Exportable Paper Sheet */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-slate-950/50">
          <div
            id="lumpsum-deposits-statement-sheet"
            className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl max-w-2xl mx-auto border border-slate-200"
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-5 mb-5">
              <div className="flex items-center gap-3.5">
                <img
                  src={logoSrc}
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
                  <p className="text-xs text-amber-700 font-bold font-bengali">
                    {settings?.slogan_bengali || 'যৌথ স্বপ্ন • নিশ্চিত ভবিষ্যৎ'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-english mt-0.5">
                    {settings?.contact_phone_1} • {settings?.contact_email}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold inline-block mb-1">
                  এককালীন জমা বিবরণী
                </span>
                <p className="text-[10px] text-slate-500 font-num">
                  তারিখ: {new Date().toLocaleDateString('bn-BD')}
                </p>
              </div>
            </div>

            {/* Member Profile Meta Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-6 font-bengali">
              <div>
                <span className="text-slate-500 block text-[10px]">সদস্যের নাম:</span>
                <span className="font-bold text-slate-900 text-sm">{currentUser.full_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">সদস্য আইডি (ID):</span>
                <span className="font-bold text-blue-700 font-num text-sm">{currentUser.member_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">মালিকানাধীন শেয়ার:</span>
                <span className="font-bold text-purple-700 font-num text-sm">{toBengaliDigits(currentUser.owned_shares)} টি</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">এককালীন জমা সংখ্যা:</span>
                <span className="font-bold text-amber-700 font-num text-sm">{toBengaliDigits(myLumpsumDeposits.length)} বার</span>
              </div>
            </div>

            {/* Table of Lumpsum Payments */}
            <div className="overflow-hidden border border-slate-300 rounded-xl mb-6">
              <table className="w-full text-left text-xs font-bengali">
                <thead className="bg-slate-800 text-white font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">ক্র নং</th>
                    <th className="py-2.5 px-3">উদ্দেশ্য ও প্রকল্প</th>
                    <th className="py-2.5 px-3">পেমেন্ট মাধ্যম</th>
                    <th className="py-2.5 px-3 font-english">TrxID / তারিখ</th>
                    <th className="py-2.5 px-3 text-right">পরিমাণ (টাকা)</th>
                    <th className="py-2.5 px-3 text-center">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-num text-slate-800">
                  {myLumpsumDeposits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500 font-bengali">
                        এখনও কোনো অনুমোদিত এককালীন বিনিয়োগের হিসাব নেই।
                      </td>
                    </tr>
                  ) : (
                    myLumpsumDeposits.map((d, idx) => (
                      <tr key={d.lumpsum_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="py-2 px-3 text-slate-500">{toBengaliDigits(idx + 1)}</td>
                        <td className="py-2 px-3 font-bold text-slate-900 font-bengali">
                          <div>{d.purpose}</div>
                          <span className="text-[10px] text-blue-700 block font-normal">
                            প্রকল্প: {d.target_land_name || 'সাধারণ ল্যান্ড ফান্ড'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bengali">{d.payment_method}</td>
                        <td className="py-2 px-3 font-english text-[11px] text-slate-600">
                          {d.trx_id}
                          <span className="block text-[9px] text-slate-400">{d.submitted_at.slice(0, 10)}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-amber-700">
                          {formatTaka(d.amount)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-bengali">
                            অনুমোদিত
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Balance Card */}
            <div className="flex justify-between items-center p-4 rounded-xl bg-amber-50 border-2 border-amber-400 mb-6">
              <span className="text-sm font-bold text-amber-950 font-bengali">
                সর্বমোট এককালীন জমার পরিমাণ:
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-800 font-num">
                {formatTaka(totalLumpsumSum || currentUser.total_lumpsum_paid)}
              </span>
            </div>

            {/* Signatory & Digital Seal */}
            <div className="flex justify-between items-end pt-4 border-t border-slate-300">
              <div className="text-center">
                <div className="w-32 border-b border-slate-400 mb-1"></div>
                <span className="text-[10px] text-slate-600 font-bengali">সদস্যের স্বাক্ষর</span>
              </div>

              <div className="text-center flex flex-col items-center">
                {settings?.voucher_signature_url ? (
                  <img
                    src={settings.voucher_signature_url}
                    alt="Official Signature"
                    className="h-10 object-contain mb-1"
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
                <span className="text-[8px] text-amber-700 font-bengali block mt-0.5 font-bold">
                  {settings?.voucher_seal_text || 'বন্ধন ও বিনিয়োগ অনুমোদিত ডিজিটাল সিল'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. DUE INSTALLMENTS STATEMENT MODAL (বকেয়া কিস্তি হিসাব ও ছবি ডাউনলোড)
// ============================================================================
export const DueInstallmentsModal: React.FC<StatementModalBaseProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [isR2Saving, setIsR2Saving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  if (!isOpen) return null;

  const dueCount = currentUser.due_installments || 0;
  const targetAmount = currentUser.monthly_target || 5000;
  const totalDueAmount = dueCount * targetAmount;

  const handleDownloadJpg = async () => {
    setIsExporting(true);
    setFeedbackMsg('');
    try {
      const filename = `BoB-Due-Installments-Statement-${currentUser.member_id}-${new Date().toISOString().slice(0, 10)}`;
      const success = await downloadElementAsJpg('due-installments-statement-sheet', filename);
      if (success) {
        setFeedbackMsg('বকেয়া কিস্তির হিসাবের ছবি (JPG) ডাউনলোড সম্পন্ন হয়েছে!');
        setTimeout(() => setFeedbackMsg(''), 4000);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsPdfExporting(true);
    setFeedbackMsg('');
    try {
      const filename = `BoB-Due-Installments-Statement-${currentUser.member_id}-${new Date().toISOString().slice(0, 10)}`;
      const success = await downloadElementAsPdf('due-installments-statement-sheet', filename);
      if (success) {
        setFeedbackMsg('বকেয়া কিস্তির হিসাবের পিডিএফ (PDF) ডাউনলোড সম্পন্ন হয়েছে!');
        setTimeout(() => setFeedbackMsg(''), 4000);
      }
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleSaveToR2 = async () => {
    const el = document.getElementById('due-installments-statement-sheet');
    if (!el) return;

    setIsR2Saving(true);
    setFeedbackMsg('');
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
      const filename = `due-stmt-${currentUser.member_id}-${Date.now()}.jpg`;
      const res = await uploadDataUrlToR2(dataUrl, filename, 'statement');
      if (res.success) {
        setFeedbackMsg('বকেয়া হিসাবের বিবরণী Cloudflare R2 বাকেটে সংরক্ষিত হয়েছে!');
        setTimeout(() => setFeedbackMsg(''), 4000);
      } else {
        alert('R2 তে সংরক্ষণ করা সম্ভব হয়নি।');
      }
    } catch (err: any) {
      alert(err.message || 'Cloudflare R2 তে সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setIsR2Saving(false);
    }
  };

  const logoSrc = settings?.logo_url || '/bob-logo.png';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn font-bengali">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                বকেয়া কিস্তির হিসাব বিবরণী ও নোটিশ
              </h3>
              <p className="text-xs text-slate-400">
                বকেয়া কিস্তির পূর্ণ হিসাব এবং পরিশোধ নির্দেশনা বিবরণী ছবি ডাউনলোড
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToR2}
              disabled={isR2Saving}
              className="cursor-pointer px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Cloudflare R2 ক্লাউডে সেভ করুন"
            >
              <i className="fa-solid fa-cloud text-orange-400"></i>
              <span>{isR2Saving ? 'সংরক্ষণ হচ্ছে...' : 'R2 তে সেভ'}</span>
            </button>

            <button
              onClick={handleDownloadJpg}
              disabled={isExporting}
              className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 transition"
              title="JPG ছবি হিসেবে ডাউনলোড"
            >
              <i className="fa-solid fa-file-image"></i>
              <span>{isExporting ? 'তৈরি হচ্ছে...' : 'JPG ছবি'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isPdfExporting}
              className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
              title="PDF ডকুমেন্ট হিসেবে ডাউনলোড"
            >
              <i className="fa-solid fa-file-pdf"></i>
              <span>{isPdfExporting ? 'পিডিএফ হচ্ছে...' : 'PDF ডাউনলোড'}</span>
            </button>

            <button
              onClick={onClose}
              className="cursor-pointer p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div className="mx-6 mt-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <i className="fa-solid fa-circle-check text-emerald-400"></i>
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Printable/Exportable Paper Sheet */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-slate-950/50">
          <div
            id="due-installments-statement-sheet"
            className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl max-w-2xl mx-auto border border-slate-200"
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-5 mb-5">
              <div className="flex items-center gap-3.5">
                <img
                  src={logoSrc}
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
                  <p className="text-xs text-red-700 font-bold font-bengali">
                    {settings?.slogan_bengali || 'যৌথ স্বপ্ন • নিশ্চিত ভবিষ্যৎ'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-english mt-0.5">
                    {settings?.contact_phone_1} • {settings?.contact_email}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block mb-1 ${
                  dueCount > 0
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {dueCount > 0 ? 'বকেয়া কিস্তি নোটিশ' : 'বকেয়া সংক্রান্ত বিবরণী'}
                </span>
                <p className="text-[10px] text-slate-500 font-num">
                  তারিখ: {new Date().toLocaleDateString('bn-BD')}
                </p>
              </div>
            </div>

            {/* Member Profile Meta Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-6 font-bengali">
              <div>
                <span className="text-slate-500 block text-[10px]">সদস্যের নাম:</span>
                <span className="font-bold text-slate-900 text-sm">{currentUser.full_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">সদস্য আইডি (ID):</span>
                <span className="font-bold text-blue-700 font-num text-sm">{currentUser.member_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">মোবাইল নম্বর:</span>
                <span className="font-bold text-slate-800 font-english text-sm">{currentUser.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">নির্ধারিত তারিখ:</span>
                <span className="font-bold text-amber-700 text-xs font-bengali">প্রতি মাসের ১০ তারিখ</span>
              </div>
            </div>

            {/* Calculation Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 font-bengali">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 block">মাসিক নির্ধারিত কিস্তি</span>
                <span className="text-lg font-bold text-slate-900 font-num">
                  {formatTaka(targetAmount)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <span className="text-[10px] text-red-600 block">মোট বকেয়া কিস্তির সংখ্যা</span>
                <span className="text-lg font-bold text-red-700 font-num">
                  {toBengaliDigits(dueCount)} টি মাস
                </span>
              </div>

              <div className="p-4 rounded-xl bg-red-100 border-2 border-red-400">
                <span className="text-[10px] text-red-800 block font-semibold">সর্বমোট বকেয়ার পরিমাণ</span>
                <span className="text-lg sm:text-xl font-black text-red-900 font-num">
                  {formatTaka(totalDueAmount)}
                </span>
              </div>
            </div>

            {/* Status Message / Notice Box */}
            <div className={`p-4 rounded-xl mb-6 text-xs leading-relaxed font-bengali ${
              dueCount > 0
                ? 'bg-red-50 border border-red-300 text-red-900'
                : 'bg-emerald-50 border border-emerald-300 text-emerald-900'
            }`}>
              <div className="flex items-start gap-2">
                <i className={`fa-solid ${dueCount > 0 ? 'fa-triangle-exclamation text-red-600' : 'fa-circle-check text-emerald-600'} text-base mt-0.5 shrink-0`}></i>
                <div>
                  <div className="font-bold mb-1">
                    {dueCount > 0
                      ? 'জরুরি কিস্তি পরিশোধ সংক্রান্ত নির্দেশনা:'
                      : 'আলহামদুলিল্লাহ! আপনার কোনো কিস্তি বকেয়া নেই:'}
                  </div>
                  <p>
                    {dueCount > 0
                      ? `সম্মানিত ${currentUser.full_name}, সমবায় ভূমি প্রকল্পের নিয়মিত গতিশীলতা রক্ষার্থে প্রতিটি সদস্যের নিয়মিত কিস্তি জমা প্রদান অপরিহার্য। আপনার ${toBengaliDigits(dueCount)}টি কিস্তির মোট ${formatTaka(totalDueAmount)} দ্রুত পরিশোধ করে ট্রানজেকশন স্লিপ আপলোড করার জন্য বিশেষ অনুরোধ করা যাচ্ছে।`
                      : `সম্মানিত ${currentUser.full_name}, আপনি যথাসময়ে আপনার সকল মাসিক কিস্তি পরিশোধ করেছেন। বন্ধন ও বিনিয়োগ পরিবারের সাথে থাকার জন্য আপনাকে আন্তরিক ধন্যবাদ।`}
                  </p>
                </div>
              </div>
            </div>

            {/* Official Payment Accounts Section */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6 text-xs font-bengali">
              <span className="font-bold text-slate-800 block mb-2 text-xs">
                অনুমোদিত পেমেন্ট চ্যানেলসমূহ (পরিশোধের জন্য):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
                <div className="p-2 rounded bg-white border border-slate-200">
                  <span className="font-bold block text-blue-900">ব্যাংক অ্যাকাউন্ট:</span>
                  <span className="font-english font-semibold">{settings?.payment_bank_name || 'BRAC Bank PLC'}</span>
                  <div className="font-num text-slate-600">হিসাব: {settings?.payment_bank_account_no || '1501-2049-88001'}</div>
                </div>

                <div className="p-2 rounded bg-white border border-slate-200">
                  <span className="font-bold block text-pink-700">বিকাশ / নগদ:</span>
                  <div className="font-num text-slate-600">বিকাশ: {settings?.payment_bkash_no || '01712-345678'}</div>
                  <div className="font-num text-slate-600">নগদ: {settings?.payment_nagad_no || '01890-123456'}</div>
                </div>
              </div>
            </div>

            {/* Signatory & Digital Seal */}
            <div className="flex justify-between items-end pt-4 border-t border-slate-300">
              <div className="text-center">
                <div className="w-32 border-b border-slate-400 mb-1"></div>
                <span className="text-[10px] text-slate-600 font-bengali">হিসাব শাখা নিরীক্ষা</span>
              </div>

              <div className="text-center flex flex-col items-center">
                {settings?.voucher_signature_url ? (
                  <img
                    src={settings.voucher_signature_url}
                    alt="Official Signature"
                    className="h-10 object-contain mb-1"
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
                <span className="text-[8px] text-red-700 font-bengali block mt-0.5 font-bold">
                  {settings?.voucher_seal_text || 'বন্ধন ও বিনিয়োগ অনুমোদিত ডিজিটাল সিল'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
