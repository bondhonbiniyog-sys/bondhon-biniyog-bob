import React, { useState } from 'react';
import type { LandInvestment } from '../types';
import { formatTaka, toBengaliDigits } from '../utils/bengaliUtils';

interface RoiCalculatorProps {
  lands: LandInvestment[];
  onBookShare?: (land: LandInvestment) => void;
}

export const RoiCalculator: React.FC<RoiCalculatorProps> = ({ lands, onBookShare }) => {
  const [selectedLandId, setSelectedLandId] = useState<string>(lands[0]?.land_id || 'LAND-01');
  const [shareCount, setShareCount] = useState<number>(2);
  const [durationYears, setDurationYears] = useState<number>(5);
  const [growthRate, setGrowthRate] = useState<number>(18); // 18% annual appreciation

  const selectedLand = lands.find((l) => l.land_id === selectedLandId) || lands[0];
  const sharePrice = selectedLand ? selectedLand.share_price : 100000;

  const totalInvestment = shareCount * sharePrice;
  // Compound appreciation formula: A = P * (1 + r/100)^t
  const futureValue = Math.round(totalInvestment * Math.pow(1 + growthRate / 100, durationYears));
  const netProfit = futureValue - totalInvestment;
  const roiPercentage = Math.round((netProfit / totalInvestment) * 100);
  const monthlyAverageProfit = Math.round(netProfit / (durationYears * 12));

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      {/* Decorative ambient gradient */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold uppercase tracking-wider mb-2 font-english">
              <i className="fa-solid fa-calculator"></i>
              <span>Smart Land ROI Calculator</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-bengali">
              ভূমি বিনিয়োগ মুনাফা ও মূল্যায়ন ক্যালকুলেটর
            </h2>
            <p className="text-sm text-slate-400 font-bengali mt-1">
              আপনার কাঙ্ক্ষিত ভূমি প্রকল্প ও মেয়াদ অনুযায়ী প্রত্যাশিত ভবিষ্যৎ সম্পদ মূল্যায়ন হিসাব করুন
            </p>
          </div>

          <div className="text-xs text-slate-400 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 font-bengali">
            <span className="text-emerald-400 font-bold font-num">১৮% - ২২%</span> সাধারণ বার্ষিক জমির মূলধন বৃদ্ধি হার
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Inputs Column */}
          <div className="lg:col-span-6 space-y-6">
            {/* Land Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 font-bengali">
                ভূমি প্রকল্প নির্বাচন করুন
              </label>
              <select
                value={selectedLandId}
                onChange={(e) => setSelectedLandId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-bengali focus:border-blue-500 focus:outline-none"
              >
                {lands.map((land) => (
                  <option key={land.land_id} value={land.land_id}>
                    {land.land_name} — (প্রতি শেয়ার {formatTaka(land.share_price)})
                  </option>
                ))}
              </select>
            </div>

            {/* Shares Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-slate-300 font-bengali">শেয়ার সংখ্যা</span>
                <span className="text-emerald-400 font-bold font-num text-sm bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                  {toBengaliDigits(shareCount)} টি শেয়ার ({formatTaka(totalInvestment)})
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={shareCount}
                onChange={(e) => setShareCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-num mt-1">
                <span>১টি</span>
                <span>৫টি</span>
                <span>১০টি</span>
                <span>১৫টি</span>
                <span>২০টি</span>
              </div>
            </div>

            {/* Investment Duration Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-slate-300 font-bengali">বিনিয়োগের সময়কাল</span>
                <span className="text-blue-400 font-bold font-num text-sm bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                  {toBengaliDigits(durationYears)} বছর ({toBengaliDigits(durationYears * 12)} মাস)
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={durationYears}
                onChange={(e) => setDurationYears(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-num mt-1">
                <span>১ বছর</span>
                <span>৩ বছর</span>
                <span>৫ বছর</span>
                <span>৭ বছর</span>
                <span>১০ বছর</span>
              </div>
            </div>

            {/* Expected Annual Appreciation % Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-slate-300 font-bengali">প্রত্যাশিত বার্ষিক জমি মূল্যবৃদ্ধি হার (%)</span>
                <span className="text-amber-400 font-bold font-num text-sm bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                  {toBengaliDigits(growthRate)}% বাৎসরিক
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="30"
                step="1"
                value={growthRate}
                onChange={(e) => setGrowthRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-num mt-1">
                <span>১০% (সাধারণ)</span>
                <span>১৮% (গড়)</span>
                <span>২৫% (উচ্চ প্রবৃদ্ধি)</span>
                <span>৩০%</span>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl border border-slate-800 p-6 sm:p-7 shadow-xl">
            <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold font-english mb-4 flex items-center gap-2">
              <i className="fa-solid fa-chart-line text-emerald-400"></i>
              <span>প্রজেকশন ফলাফল সারাংশ</span>
            </h3>

            {/* Primary Future Valuation Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-blue-950/70 border border-emerald-500/40 mb-5 relative">
              <span className="text-xs text-slate-300 font-bengali block mb-1">
                {toBengaliDigits(durationYears)} বছর পর আপনার শেয়ারের আনুমানিক ভবিষ্যৎ মূল্য:
              </span>
              <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-blue-300 font-num">
                {formatTaka(futureValue)}
              </div>
              <div className="mt-2 text-xs text-emerald-300 font-bengali flex items-center gap-1.5">
                <i className="fa-solid fa-circle-arrow-up text-emerald-400"></i>
                <span>প্রত্যাশিত বৃদ্ধি: +{toBengaliDigits(roiPercentage)}% মোট মূলধন লাভ</span>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-bengali block">মোট বিনিয়োগ মূলধন</span>
                <span className="text-base font-bold text-white font-num">{formatTaka(totalInvestment)}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-bengali block">আনুমানিক মোট নিট মুনাফা</span>
                <span className="text-base font-bold text-amber-400 font-num">{formatTaka(netProfit)}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-bengali block">মাসিক গড় সম্পদ বৃদ্ধি</span>
                <span className="text-base font-bold text-blue-400 font-num">{formatTaka(monthlyAverageProfit)}/মাস</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-bengali block">প্রকল্পের বর্তমান স্ট্যাটাস</span>
                <span className="text-xs font-bold text-emerald-400 font-bengali flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                  {selectedLand?.status === 'Active' ? 'সক্রিয় বুকিং চলছে' : 'আলোচনাধীন'}
                </span>
              </div>
            </div>

            {/* Action CTA */}
            {selectedLand && (
              <button
                onClick={() => onBookShare && onBookShare(selectedLand)}
                className="cursor-pointer w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-sm sm:text-base font-bengali shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-handshake"></i>
                <span>{selectedLand.land_name}-এ শেয়ার বুকিং করুন</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
