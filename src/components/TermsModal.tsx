import React, { useState, useRef, useEffect } from 'react';
import type { Member } from '../types';

interface TermsModalProps {
  member: Member;
  onAccept: () => void;
  onClose?: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ member, onAccept, onClose }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreedCheckbox, setAgreedCheckbox] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;

    const totalScrollable = scrollHeight - clientHeight;
    if (totalScrollable <= 0) {
      setHasScrolledToBottom(true);
      setScrollProgress(100);
      return;
    }

    const currentPercent = Math.min(100, Math.round((scrollTop / totalScrollable) * 100));
    setScrollProgress(currentPercent);

    // If within 25px of the bottom, unlock acceptance
    if (scrollTop + clientHeight >= scrollHeight - 25) {
      setHasScrolledToBottom(true);
    }
  };

  useEffect(() => {
    // Check initial height in case content fits without scrolling
    const el = scrollContainerRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 10) {
      setHasScrolledToBottom(true);
      setScrollProgress(100);
    }
  }, []);

  const handleConfirmAccept = async () => {
    if (!hasScrolledToBottom || !agreedCheckbox) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/accept-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: member.member_id }),
      });
      const data = await res.json();
      if (data.success) {
        onAccept();
      }
    } catch (err) {
      console.error('Failed to accept terms:', err);
      // fallback
      onAccept();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <i className="fa-solid fa-file-contract text-lg"></i>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white font-bengali">
                যৌথ ভূমি বিনিয়োগ নীতিমালা ও সদস্য সম্মতিপত্র
              </h3>
              <p className="text-xs text-slate-400 font-bengali">
                সম্মানিত সদস্য: <span className="text-emerald-400 font-semibold">{member.full_name}</span> (আইডি: {member.member_id})
              </p>
            </div>
          </div>

          {/* Scroll progress badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>পঠন অগ্রগতি: {scrollProgress}%</span>
          </div>
        </div>

        {/* Scroll Progress Bar at the top of container */}
        <div className="w-full bg-slate-800 h-1">
          <div
            className="bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400 h-full transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          ></div>
        </div>

        {/* Scrollable Terms Content */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300 font-bengali leading-relaxed divide-y divide-slate-800/80"
        >
          {/* Introductory notice */}
          <div className="bg-blue-950/40 border border-blue-600/30 rounded-xl p-4 text-xs text-blue-200">
            <div className="flex items-start gap-2.5">
              <i className="fa-solid fa-circle-info text-blue-400 text-sm mt-0.5"></i>
              <div>
                <strong>মনোযোগ দিন:</strong> বন্ধন ও বিনিয়োগ (BoB)-এর সকল কার্যক্রমে সর্বোচ্চ স্বচ্ছতা ও নিরাপত্তা রক্ষার্থে নিম্নোক্ত শর্তাবলী বাধ্যতামূলক। শর্তাবলী সম্পূর্ণ পড়ার পর স্ক্রলের নিচে থাকা বোতামটি সক্রিয় হবে।
              </div>
            </div>
          </div>

          {/* Article 1 */}
          <div className="pt-4">
            <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-english">১</span>
              উদ্দেশ্য ও সমবায় ভূমি মালিকানার ভিত্তি
            </h4>
            <p className="text-slate-400 text-xs sm:text-sm">
              বন্ধন ও বিনিয়োগ (BoB) হলো একটি অরাজনৈতিক, পারস্পরিক বিশ্বাস ও সমবায়ভিত্তিক যৌথ ভূমি বিনিয়োগ প্ল্যাটফর্ম। সকল সদস্যের সম্মতিতে সংগৃহীত মাসিক সঞ্চয় ও এককালীন জমা সরাসরি ভূমি ক্রয়, সীমানা নির্ধারণ ও যৌথ মালিকানা প্রতিষ্ঠায় ব্যবহৃত হবে।
            </p>
          </div>

          {/* Article 2 */}
          <div className="pt-4">
            <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-english">২</span>
              মাসিক কিস্তি ও জমার নির্দিষ্ট সময়সীমা
            </h4>
            <p className="text-slate-400 text-xs sm:text-sm">
              প্রতিটি সক্রিয় সদস্যকে তার নির্ধারিত মাসিক সঞ্চয় টার্গেট (যেমন: ৫,০০০ / ১০,০০০ টাকা) প্রতি মাসের ১০ তারিখের মধ্যে নির্ধারিত প্রাতিষ্ঠানিক ব্যাংক বা বিকাশ/নগদ চ্যানেলে পরিশোধ করতে হবে। জমা দেয়ার পর ট্রানজেকশন আইডি ও ভাউচার স্লিপ সিস্টেমে আপলোড করা বাধ্যতামূলক।
            </p>
          </div>

          {/* Article 3 */}
          <div className="pt-4">
            <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-english">৩</span>
              এককালীন বিনিয়োগ ও শেয়ার বরাদ্দ নীতি
            </h4>
            <p className="text-slate-400 text-xs sm:text-sm">
              যেকোনো চালু ভূমি প্রকল্পের শেয়ার মূল্যের সমপরিমাণ অর্থ এককালীন জমার মাধ্যমে সদস্য নির্ধারিত প্রকল্পের শেয়ার ক্রয় করতে পারবেন। অর্থ অনুমোদনের পর সদস্যের নামে অফিশিয়াল শেয়ার সনদ (Share Certificate) ডিজিটাল ও মূল প্রিন্ট আকারে হস্তান্তর করা হবে।
            </p>
          </div>

          {/* Article 4 */}
          <div className="pt-4">
            <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-english">৪</span>
              আইনি দলিলের বৈধতা ও সরকারি সাব-কবলা রেজিস্ট্রেশন
            </h4>
            <p className="text-slate-400 text-xs sm:text-sm">
              ক্রয়কৃত প্রতিটি জমির দলিল সরকারি রেজিস্ট্রি অফিসের মাধ্যমে সংবিধিবদ্ধ যৌথ নামে বা ট্রাস্টের মাধ্যমে সমহারে সাব-কবলা সম্পাদন করা হবে। সকল সদস্য নিজ নিজ শেয়ার অনুযায়ী ভূমির প্রত্যক্ষ অনুপাতিক মালিক হবেন।
            </p>
          </div>

          {/* Article 5 */}
          <div className="pt-4">
            <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-english">৫</span>
              মুনাফা বণ্টন ও বিক্রয় নীতি (Exit Policy)
            </h4>
            <p className="text-slate-400 text-xs sm:text-sm">
              জমি বিক্রয় বা বাণিজ্যিক প্রকল্প থেকে প্রাপ্ত সকল নিট মুনাফা সাধারণ সভায় সর্বসম্মত সিদ্ধান্তের ভিত্তিতে শেয়ার অনুপাত অনুযায়ী সরাসরি সদস্যদের ব্যাংক অ্যাকাউন্টে বণ্টন করা হবে। কোনো সদস্য জরুরি প্রয়োজনে তার শেয়ার অন্য কোনো সদস্যের কাছে হস্তান্তর করতে পারবেন।
            </p>
          </div>

          {/* Article 6 */}
          <div className="pt-4">
            <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-english">৬</span>
              আর্থিক নিরীক্ষা ও জিরো-টরারেন্স স্বচ্ছতা
            </h4>
            <p className="text-slate-400 text-xs sm:text-sm">
              প্রতি মাসের আর্থিক বিবরণী, ব্যাংক ব্যালেন্স এবং ব্যয়ের হিসাব ওয়েব অ্যাপ্লিকেশনে উন্মুক্ত থাকবে। পরিচালনা পর্ষদের পরিচালকদের অডিট কমিটি প্রতি ত্রৈমাসিকে সম্পূর্ণ নিরীক্ষা রিপোর্ট পেশ করবে।
            </p>
          </div>

          {/* Article 7 */}
          <div className="pt-4">
            <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-english">৭</span>
              সদস্যপদ বাতিল ও শৃঙ্খলাবিধি
            </h4>
            <p className="text-slate-400 text-xs sm:text-sm">
              ধারাবাহিকভাবে নোটিশ প্রদান সত্ত্বেও কোনো সদস্য কারণ দর্শানো ব্যতিরেকে পর পর তিন মাস কিস্তি পরিশোধে ব্যর্থ হলে অথবা সংগঠনের সুনাম ক্ষুণ্ণকারী কোনো কর্মকাণ্ডে জড়িত হলে পরিচালনা পর্ষদ সদস্যপদ স্থগিতের এখতিয়ার সংরক্ষণ করে।
            </p>
          </div>

          {/* Bottom Confirmation Marker */}
          <div className="pt-6 pb-2 text-center text-emerald-400 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2">
            <i className="fa-solid fa-circle-check text-base"></i>
            <span>আপনি শর্তাবলীর শেষ প্রান্ত পর্যন্ত সফলভাবে পড়েছেন।</span>
          </div>
        </div>

        {/* Footer with Enforced Scrolling Controls */}
        <div className="p-5 sm:p-6 border-t border-slate-800 bg-slate-900 flex flex-col gap-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              disabled={!hasScrolledToBottom}
              checked={agreedCheckbox}
              onChange={(e) => setAgreedCheckbox(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-800 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <span className={`text-xs sm:text-sm font-bengali ${hasScrolledToBottom ? 'text-slate-200 group-hover:text-white' : 'text-slate-500'}`}>
              আমি বন্ধন ও বিনিয়োগ (BoB)-এর সকল ধারা, বিনিয়োগ নীতিমালা ও শৃঙ্খলাবিধি মনোযোগ সহকারে পড়েছি এবং এতে সম্পূর্ণ সম্মতি জ্ঞাপন করছি।
            </span>
          </label>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-400 font-bengali">
              {!hasScrolledToBottom ? (
                <span className="text-amber-400 flex items-center gap-1.5 animate-pulse">
                  <i className="fa-solid fa-arrow-down"></i>
                  <span>সম্মতি দিতে অনুগ্রহ করে শর্তাবলী নিচে স্ক্রল করুন ({scrollProgress}%)</span>
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <i className="fa-solid fa-check-double"></i>
                  <span>এখন চেকবক্সে টিক দিয়ে সম্মতি নিশ্চিত করুন</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {onClose && (
                <button
                  onClick={onClose}
                  className="cursor-pointer px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs sm:text-sm font-bengali transition"
                >
                  পরে সিদ্ধান্ত নেব
                </button>
              )}

              <button
                disabled={!hasScrolledToBottom || !agreedCheckbox || isSubmitting}
                onClick={handleConfirmAccept}
                className="cursor-pointer px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold font-bengali shadow-lg shadow-emerald-700/20 transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-spinner animate-spin"></i>
                    <span>সংরক্ষণ হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-signature"></i>
                    <span>সম্মতি নিশ্চিত করুন ও প্রবেশ করুন</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
