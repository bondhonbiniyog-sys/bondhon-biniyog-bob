import React from 'react';
import type { LandInvestment } from '../types';
import { toBengaliDigits, formatTaka } from '../utils/bengaliUtils';

interface ShareholdersModalProps {
  land: LandInvestment | null;
  onClose: () => void;
}

export const ShareholdersModal: React.FC<ShareholdersModalProps> = ({ land, onClose }) => {
  if (!land) return null;

  const shares = land.shares_detail || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <i className="fa-solid fa-users text-lg"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-bengali">
                শেয়ারহোল্ডার তালিকা (ভূমি প্রকল্প)
              </h3>
              <p className="text-xs text-emerald-400 font-bengali">
                {land.land_name} • মোট শেয়ার: {toBengaliDigits(land.total_shares)} টি
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="cursor-pointer p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Land Overview summary strip */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs font-bengali">
          <div>
            <span className="text-slate-400 block text-[11px]">বরাদ্দকৃত শেয়ার</span>
            <span className="text-emerald-400 font-bold font-num text-sm">{toBengaliDigits(land.sold_shares)} টি</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">অবশিষ্ট শেয়ার</span>
            <span className="text-amber-400 font-bold font-num text-sm">{toBengaliDigits(land.total_shares - land.sold_shares)} টি</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">প্রতি শেয়ার মূল্য</span>
            <span className="text-blue-400 font-bold font-num text-sm">{formatTaka(land.share_price)}</span>
          </div>
        </div>

        {/* Shareholders Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {shares.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-bengali">
              <i className="fa-solid fa-folder-open text-3xl mb-3 text-slate-600 block"></i>
              <p>এখনও কোনো শেয়ারহোল্ডার তালিকাভুক্ত হয়নি।</p>
              <p className="text-xs text-slate-500 mt-1">অ্যাডমিন প্যানেল থেকে শেয়ার বরাদ্দ করা হলে তা এখানে প্রদর্শিত হবে।</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm font-bengali">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                    <th className="pb-3 font-semibold">সদস্যের নাম</th>
                    <th className="pb-3 font-semibold">সদস্য আইডি</th>
                    <th className="pb-3 font-semibold text-center">শেয়ার সংখ্যা</th>
                    <th className="pb-3 font-semibold">সনদ নম্বর</th>
                    <th className="pb-3 font-semibold text-right">বরাদ্দ তারিখ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {shares.map((share, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 font-medium text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-english font-bold">
                          {idx + 1}
                        </div>
                        <span>{share.member_name}</span>
                      </td>
                      <td className="py-3 text-slate-400 font-num">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300">
                          {share.member_id}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold font-num border border-emerald-500/30">
                          {toBengaliDigits(share.share_count)} টি
                        </span>
                      </td>
                      <td className="py-3 text-amber-300 font-num text-xs">
                        <i className="fa-solid fa-stamp text-amber-500 mr-1"></i>
                        {share.certificate_no}
                      </td>
                      <td className="py-3 text-right text-slate-400 font-num text-xs">
                        {toBengaliDigits(share.assigned_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center text-xs text-slate-400 font-bengali">
          <span>* সকল শেয়ার রেজিস্ট্রি অফিসের সাব-কবলা দলিলের সাথে সম্পৃক্ত</span>
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
