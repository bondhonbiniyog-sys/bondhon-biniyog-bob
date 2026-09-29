import React, { useState } from 'react';
import type { MonthlyDeposit, LumpsumDeposit, Member, SystemSettings } from '../types';
import { formatTaka, toBengaliDigits } from '../utils/bengaliUtils';
import { downloadElementAsJpg, downloadElementAsPdf } from '../utils/exportUtils';

interface VoucherGeneratorModalProps {
  deposit: MonthlyDeposit | LumpsumDeposit | null;
  depositType: 'monthly' | 'lumpsum';
  member: Member;
  settings?: SystemSettings | null;
  onClose: () => void;
}

export const VoucherGeneratorModal: React.FC<VoucherGeneratorModalProps> = ({
  deposit,
  depositType,
  member,
  settings,
  onClose,
}) => {
  const [isExportingJpg, setIsExportingJpg] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!deposit) return null;

  const isMonthly = depositType === 'monthly';
  const monthlyDep = isMonthly ? (deposit as MonthlyDeposit) : null;
  const lumpsumDep = !isMonthly ? (deposit as LumpsumDeposit) : null;

  const receiptNo = isMonthly ? monthlyDep?.deposit_id : lumpsumDep?.lumpsum_id;
  const dateStr = deposit.submitted_at || new Date().toISOString().split('T')[0];
  const purpose = isMonthly
    ? `মাসিক কিস্তি জমা — মাস: ${monthlyDep?.month_year}`
    : `${lumpsumDep?.purpose || 'এককালীন প্রকল্প বিনিয়োগ'}`;

  const voucherElementId = `bob-voucher-${receiptNo}`;
  const officialLogo = settings?.logo_url || '/bob-logo.png';
  const projectTitle = settings?.project_title || 'বন্ধন ও বিনিয়োগ';
  const slogan = settings?.slogan_bengali || 'যৌথ স্বপ্ন • নিশ্চিত ভবিষ্যৎ';

  const handleDownloadJpg = async () => {
    setIsExportingJpg(true);
    await downloadElementAsJpg(voucherElementId, `BoB_Receipt_${receiptNo}`);
    setIsExportingJpg(false);
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    await downloadElementAsPdf(voucherElementId, `BoB_Receipt_${receiptNo}`);
    setIsExportingPdf(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            <span className="text-sm font-bold text-white font-bengali">
              অফিশিয়াল মানি রিসিট ও জমা ভাউচার প্রিভিউ
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* JPG Download Button */}
            <button
              onClick={handleDownloadJpg}
              disabled={isExportingJpg}
              className="cursor-pointer px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs font-bengali flex items-center gap-1.5 transition shadow-sm"
              title="JPG ছবি আকারে ডাউনলোড করুন"
            >
              {isExportingJpg ? (
                <i className="fa-solid fa-spinner animate-spin"></i>
              ) : (
                <i className="fa-solid fa-file-image"></i>
              )}
              <span>JPG ডাউনলোড</span>
            </button>

            {/* PDF Download Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="cursor-pointer px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs font-bengali flex items-center gap-1.5 transition shadow-sm"
              title="PDF ডকুমেন্ট আকারে ডাউনলোড করুন"
            >
              {isExportingPdf ? (
                <i className="fa-solid fa-spinner animate-spin"></i>
              ) : (
                <i className="fa-solid fa-file-pdf"></i>
              )}
              <span>PDF ডাউনলোড</span>
            </button>

            <button
              onClick={handlePrint}
              className="cursor-pointer px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs font-bengali flex items-center gap-1.5 transition shadow-sm"
            >
              <i className="fa-solid fa-print"></i>
              <span>প্রিন্ট</span>
            </button>

            <button
              onClick={onClose}
              className="cursor-pointer p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 selection:bg-blue-200">
          <div
            id={voucherElementId}
            className="border-4 border-double border-slate-800 p-6 sm:p-8 relative bg-amber-50/20"
          >
            {/* Background Watermark Seal */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
              <img
                src={officialLogo}
                alt="BoB Official Watermark"
                className="w-96 h-96 object-contain"
                onError={(e: any) => {
                  e.target.src = '/bob-logo.png';
                }}
              />
            </div>

            {/* Receipt Header */}
            <div className="text-center pb-4 border-b-2 border-slate-800 mb-6">
              <div className="inline-flex items-center gap-3 mb-1">
                <div className="w-12 h-12 rounded-xl bg-white p-0.5 border border-slate-400 flex items-center justify-center overflow-hidden shadow-sm">
                  <img
                    src={officialLogo}
                    alt="BoB Official Logo"
                    className="w-full h-full object-contain"
                    onError={(e: any) => {
                      e.target.src = '/bob-logo.png';
                    }}
                  />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-bengali">
                  {projectTitle}
                </h2>
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-600 font-english">
                BONDHON O BINIYOG (BoB)
              </p>
              <p className="text-xs font-semibold text-emerald-700 font-bengali mt-0.5">
                {slogan}
              </p>
              <div className="inline-block mt-2 px-4 py-1 rounded-full bg-slate-900 text-white font-bold text-xs sm:text-sm font-bengali tracking-wider">
                টাকা প্রাপ্তি রসিদ ও জমা ভাউচার (MONEY RECEIPT)
              </div>
            </div>

            {/* Meta Row: Receipt No & Date */}
            <div className="flex justify-between items-center text-xs font-bengali mb-4 text-slate-700">
              <div>
                <span className="font-bold">রসিদ নম্বর: </span>
                <span className="font-num font-bold text-blue-800">{receiptNo}</span>
              </div>
              <div>
                <span className="font-bold">তারিখ: </span>
                <span className="font-num">{toBengaliDigits(dateStr)}</span>
              </div>
            </div>

            {/* Member Details Box */}
            <div className="bg-slate-100 rounded-lg p-4 border border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bengali mb-5">
              <div>
                <span className="text-slate-500 block">সদস্যের নাম:</span>
                <span className="text-sm font-bold text-slate-900">{member.full_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">সদস্য আইডি:</span>
                <span className="text-sm font-bold text-slate-900 font-num">{member.member_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block">মোবাইল নম্বর:</span>
                <span className="font-medium text-slate-900 font-num">{member.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block">ইমেইল:</span>
                <span className="font-medium text-slate-900 font-english">{member.email}</span>
              </div>
            </div>

            {/* Payment Particulars Table */}
            <table className="w-full text-left border-collapse border border-slate-300 text-xs font-bengali mb-6">
              <thead>
                <tr className="bg-slate-200 text-slate-800 border-b border-slate-300">
                  <th className="p-2.5 border-r border-slate-300">বিবরণ / খাত</th>
                  <th className="p-2.5 border-r border-slate-300">পেমেন্ট মাধ্যম ও ট্রানজেকশন</th>
                  <th className="p-2.5 text-right">পরিমাণ (টাকা)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-3 border-r border-slate-300">
                    <div className="font-bold text-slate-900">{purpose}</div>
                    <div className="text-[11px] text-slate-500">
                      খাত: {isMonthly ? 'নিয়মিত মাসিক কিস্তি ফান্ড' : 'এককালীন ভূমি শেয়ার মূলধন'}
                    </div>
                  </td>
                  <td className="p-3 border-r border-slate-300 font-english">
                    <span className="font-semibold text-slate-800">{deposit.payment_method}</span>
                    <div className="text-[11px] text-slate-600 font-mono">
                      TrxID: {deposit.trx_id}
                    </div>
                  </td>
                  <td className="p-3 text-right font-num font-bold text-base text-slate-900">
                    {formatTaka(deposit.amount)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={2} className="p-2.5 border-r border-slate-300 text-right">
                    সর্বমোট প্রাপ্ত অর্থ:
                  </td>
                  <td className="p-2.5 text-right font-num text-lg text-emerald-800 font-black">
                    {formatTaka(deposit.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Status & Verification Stamp */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 mb-8 text-xs font-bengali">
              <div className="flex items-center gap-2">
                <span className="font-bold">ভাউচার স্ট্যাটাস:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold ${
                    deposit.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : deposit.status === 'Rejected'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {deposit.status === 'Approved' ? 'অনুমোদিত (Verified)' : deposit.status === 'Rejected' ? 'বাতিলকৃত' : 'যাচাইকরণ প্রক্রিয়াধীন'}
                </span>
              </div>
              <div className="text-slate-500 font-num">
                যাচাইকারী: {deposit.approved_by || 'সিস্টেম অ্যাডমিন'}
              </div>
            </div>

            {/* Signatures & Seal Row */}
            <div className="pt-6 flex justify-between items-end text-xs font-bengali">
              <div className="text-center">
                <div className="w-36 border-b border-slate-500 mb-1"></div>
                <span className="text-slate-600">জমাকারীর স্বাক্ষর</span>
              </div>

              {/* Official Seal Graphic */}
              <div className="w-24 h-24 rounded-full border-2 border-emerald-700/60 p-1 flex flex-col items-center justify-center text-center text-emerald-800 rotate-[-12deg] shrink-0">
                <div className="w-full h-full rounded-full border border-dashed border-emerald-700/60 flex flex-col items-center justify-center p-1">
                  <span className="text-[9px] font-black uppercase font-english">OFFICIAL SEAL</span>
                  <span className="text-[10px] font-bold leading-tight line-clamp-1">{projectTitle.slice(0, 16)}</span>
                  <span className="text-[8px] font-english font-semibold">VERIFIED • APPROVED</span>
                </div>
              </div>

              {/* Authorized Signatory Block with Uploaded Signature Image */}
              <div className="text-center flex flex-col items-center min-w-[150px]">
                {settings?.voucher_signature_url ? (
                  <div className="h-12 flex items-end justify-center mb-1">
                    <img
                      src={settings.voucher_signature_url}
                      alt="অনুমোদনকারী স্বাক্ষর"
                      className="max-h-12 max-w-[150px] object-contain drop-shadow"
                    />
                  </div>
                ) : (
                  <div className="h-8 flex items-end justify-center text-blue-900 font-serif italic text-base font-semibold mb-1">
                    {settings?.voucher_signatory_name || 'সজিব মোল্লা'}
                  </div>
                )}
                <div className="font-bold text-slate-900 mb-0.5 font-bengali">
                  {settings?.voucher_signatory_name || 'সজিব মোল্লা'}
                </div>
                <div className="w-40 border-b border-slate-800 mb-1"></div>
                <span className="text-slate-700 font-semibold text-[11px] font-bengali">
                  {settings?.voucher_signatory_title || 'ব্যবস্থাপনা পরিচালক (অনুমোদনকারী)'}
                </span>
              </div>
            </div>

            {/* Footnote */}
            <div className="text-[10px] text-center text-slate-400 mt-6 pt-3 border-t border-slate-200 font-bengali">
              এই রসিদটি কম্পিউটার জেনারেটেড ও বন্ধন ও বিনিয়োগের ডিজিটাল রেজিস্টারে সংরক্ষিত।
            </div>
          </div>
        </div>

        {/* Modal Bottom (Hidden when printing) */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center text-xs text-slate-400 font-bengali no-print">
          <span>* ব্রাউজারের প্রিন্ট অপশন থেকে 'Save as PDF' নির্বাচন করে সেভ করতে পারেন</span>
          <button
            onClick={onClose}
            className="cursor-pointer px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
