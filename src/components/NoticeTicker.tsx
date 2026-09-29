import React from 'react';

interface NoticeTickerProps {
  notice: string;
}

export const NoticeTicker: React.FC<NoticeTickerProps> = ({ notice }) => {
  if (!notice) return null;

  return (
    <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border-b border-amber-500/30 text-amber-200 text-xs sm:text-sm py-2 px-4 shadow-sm no-print">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {/* Badge */}
        <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold text-xs font-bengali">
          <i className="fa-solid fa-bullhorn text-amber-400 animate-bounce"></i>
          <span>বিজ্ঞপ্তি</span>
        </div>

        {/* Marquee Notice Content - moves from right to left */}
        <div className="flex-1 overflow-hidden whitespace-nowrap relative">
          <div
            className="animate-marquee-rtl pl-4 font-bengali text-slate-100 font-medium cursor-pointer"
            title="নোটিশটি থামিয়ে পড়তে কার্সার রাখুন"
          >
            <i className="fa-solid fa-circle-exclamation text-amber-400 mr-2"></i>
            {notice}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 text-[11px] text-amber-400/80 font-english">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping"></span>
          <span>Live Update</span>
        </div>
      </div>
    </div>
  );
};
