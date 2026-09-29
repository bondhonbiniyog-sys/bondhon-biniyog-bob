import React, { useEffect, useState } from 'react';
import type { SystemSettings } from '../types';
import { toBengaliDigits } from '../utils/bengaliUtils';

interface SplashScreenProps {
  onFinish: () => void;
  settings?: SystemSettings | null;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, settings }) => {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [progress, setProgress] = useState(0);

  const logoSrc = settings?.logo_url || '/bob-logo.png';
  const projectTitle = settings?.project_title || 'বন্ধন ও বিনিয়োগ';
  const slogan = settings?.slogan_bengali || 'যৌথ স্বপ্ন • নিশ্চিত ভবিষ্যৎ';

  useEffect(() => {
    const totalDuration = 5000;
    const intervalMs = 50;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += intervalMs;
      const pct = Math.min(100, (elapsed / totalDuration) * 100);
      setProgress(pct);
      setSecondsLeft(Math.max(0, Math.ceil((totalDuration - elapsed) / 1000)));

      if (elapsed >= totalDuration) {
        clearInterval(interval);
        onFinish();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Animated Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
        {/* Animated Brand Emblem / Seal with Official Logo */}
        <div className="relative mb-8 group">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500 opacity-75 blur-lg group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-spin" style={{ animationDuration: '8s' }}></div>
          
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-white border-4 border-amber-400/80 flex items-center justify-center shadow-2xl p-2 overflow-hidden animate-pulseGlow">
            <img
              src={logoSrc}
              alt="BONDHON O BINIYOG (BoB) Official Logo"
              className="w-full h-full object-contain rounded-full"
              onError={(e: any) => {
                e.target.src = '/bob-logo.png';
              }}
            />
          </div>
        </div>

        {/* Brand Title */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2 font-bengali">
          {projectTitle}
        </h1>
        <p className="text-sm sm:text-base font-semibold tracking-wider text-blue-400 uppercase font-english mb-4">
          BONDHON O BINIYOG (BoB)
        </p>

        {/* Bengali Slogan */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-emerald-400 font-medium text-sm sm:text-base shadow-inner mb-8">
          <i className="fa-solid fa-gem text-amber-400 text-xs"></i>
          <span>{slogan}</span>
          <i className="fa-solid fa-gem text-amber-400 text-xs"></i>
        </div>

        {/* Progress Bar & Countdown */}
        <div className="w-full max-w-xs mb-6">
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400 rounded-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-400 mt-2">
            <span>লোড হচ্ছে...</span>
            <span>{toBengaliDigits(secondsLeft)} সেকেন্ড</span>
          </div>
        </div>

        {/* Direct Skip Button */}
        <button
          onClick={onFinish}
          className="cursor-pointer text-xs sm:text-sm text-slate-400 hover:text-white px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 transition-all flex items-center gap-2"
        >
          <span>সরাসরি প্রবেশ করুন</span>
          <i className="fa-solid fa-arrow-right text-xs"></i>
        </button>
      </div>

      {/* Decorative Bottom Credits */}
      <div className="absolute bottom-6 text-xs text-slate-500 text-center font-bengali">
        যৌথ ভূমি বিনিয়োগ ও সঞ্চয় ব্যবস্থাপনা প্ল্যাটফর্ম
      </div>
    </div>
  );
};
