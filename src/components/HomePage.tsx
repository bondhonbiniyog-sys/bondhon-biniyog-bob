import React, { useState } from 'react';
import type {
  LandInvestment,
  Director,
  GalleryItem,
  SystemSettings,
  DashboardStats,
  Member,
} from '../types';
import { formatTaka, toBengaliDigits } from '../utils/bengaliUtils';
import { ShareholdersModal } from './ShareholdersModal';
import { RoiCalculator } from './RoiCalculator';
import { LandBuyModal } from './LandBuyModal';
import { LandSellModal } from './LandSellModal';

interface HomePageProps {
  settings: SystemSettings | null;
  stats: DashboardStats | null;
  lands: LandInvestment[];
  directors: Director[];
  gallery: GalleryItem[];
  currentUser: Member | null;
  onOpenAuth: () => void;
  onNavigateTab: (tab: string) => void;
  onRefreshData?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  settings,
  stats,
  lands,
  directors,
  gallery,
  currentUser,
  onOpenAuth,
  onNavigateTab,
  onRefreshData,
}) => {
  // Modal for shareholder list of a selected land
  const [selectedLandForShareholders, setSelectedLandForShareholders] = useState<LandInvestment | null>(null);

  // Modals for Public Marketplace: Buy and Sell
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedLandForBuy, setSelectedLandForBuy] = useState<LandInvestment | null>(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);

  // Image carousel indices for each land card
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});

  // Gallery category filter
  const [selectedGalleryCat, setSelectedGalleryCat] = useState<string>('All');
  // Selected gallery image preview modal
  const [previewImage, setPreviewImage] = useState<GalleryItem | null>(null);

  const handlePrevImage = (landId: string, totalImages: number) => {
    setCarouselIndices((prev) => {
      const current = prev[landId] || 0;
      return { ...prev, [landId]: (current - 1 + totalImages) % totalImages };
    });
  };

  const handleNextImage = (landId: string, totalImages: number) => {
    setCarouselIndices((prev) => {
      const current = prev[landId] || 0;
      return { ...prev, [landId]: (current + 1) % totalImages };
    });
  };

  // Gallery categories
  const categories = ['All', ...Array.from(new Set(gallery.map((g) => g.category)))];
  const filteredGallery = selectedGalleryCat === 'All'
    ? gallery
    : gallery.filter((g) => g.category === selectedGalleryCat);

  return (
    <div className="space-y-20 pb-16 font-bengali">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION & DYNAMIC REAL-TIME CAPITAL COUNTER */}
      {/* ========================================================================= */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:py-20 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950">
        {/* Ambient background glows */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-40 right-10 w-[400px] h-[300px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Dynamic Promotional Banner Ad if Active from Admin Panel */}
          {settings?.banner_ad_active && settings.banner_ad_text && (
            <div className="mb-10 p-5 rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-emerald-950/80 border-2 border-amber-400/60 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-md animate-pulseGlow overflow-hidden relative">
              {settings.banner_ad_image && (
                <div className="w-full md:w-48 h-28 rounded-2xl overflow-hidden shrink-0 border border-amber-400/40 relative">
                  <img
                    src={settings.banner_ad_image}
                    alt="বিশেষ অফার ব্যানার"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent"></div>
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[10px]">
                    HOT DEAL
                  </span>
                </div>
              )}

              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-950 px-3 py-1 rounded-full border border-amber-400/50 font-bengali">
                    <i className="fa-solid fa-gift mr-1.5 text-amber-400"></i>
                    {settings.banner_ad_badge || 'বিশেষ বিজ্ঞাপন / অফার'}
                  </span>
                  {settings.banner_ad_validity && (
                    <span className="text-[11px] text-emerald-300 font-semibold bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40 font-bengali">
                      <i className="fa-regular fa-clock mr-1 text-emerald-400"></i>
                      {settings.banner_ad_validity}
                    </span>
                  )}
                </div>

                <p className="text-sm sm:text-base font-bold text-white leading-relaxed font-bengali">
                  {settings.banner_ad_text}
                </p>
              </div>

              <div className="shrink-0">
                <button
                  onClick={() => {
                    const el = document.getElementById('projects-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="cursor-pointer px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/20 transition-all font-bengali flex items-center gap-2 hover:scale-105"
                >
                  <span>{settings.banner_ad_action_text || 'অফারটি বিস্তারিত দেখুন'}</span>
                  <i className="fa-solid fa-arrow-right text-xs"></i>
                </button>
              </div>
            </div>
          )}

          <div className="text-center max-w-3xl mx-auto space-y-6 mb-12">
            {/* Center Official Brand Logo Emblem */}
            <div className="inline-flex flex-col items-center justify-center mb-1">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white p-1 border-4 border-amber-400/60 shadow-2xl overflow-hidden hover:scale-105 transition-transform duration-300">
                <img
                  src={settings?.logo_url || '/bob-logo.png'}
                  alt="BONDHON O BINIYOG (BoB)"
                  className="w-full h-full object-contain"
                  onError={(e: any) => {
                    e.target.src = '/logo.png';
                  }}
                />
              </div>
            </div>

            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-emerald-400 text-xs sm:text-sm font-semibold shadow-inner">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{settings?.slogan_bengali || 'যৌথ স্বপ্ন • নিশ্চিত ভবিষ্যৎ'}</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400">নিষ্কলঙ্ক ভূমি মালিকানা</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight sm:leading-tight">
              {settings?.hero_title ? (
                <span>{settings.hero_title}</span>
              ) : (
                <>
                  যৌথ বিনিয়োগে ভূমির মালিকানা,{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-300 to-amber-300">
                    নিশ্চিত ভবিষ্যৎ
                  </span>
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              {settings?.hero_subtitle ||
                settings?.project_vision ||
                'বন্ধন ও বিনিয়োগ (BoB) হলো একটি বিশ্বস্ত সমবায় ভূমি বিনিয়োগ উদ্যোগ। ক্ষুদ্র ক্ষুদ্র মাসিক সঞ্চয় ও সদস্যদের এককালীন যৌথ বিনিয়োগে আমরা লাভজনক ও ঝামেলামুক্ত ভূমি প্রকল্পের মালিকানা নিশ্চিত করি।'}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              {currentUser ? (
                <button
                  onClick={() => onNavigateTab('dashboard')}
                  className="cursor-pointer px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm sm:text-base shadow-xl shadow-emerald-700/30 transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-gauge-high"></i>
                  <span>আমার ড্যাশবোর্ডে প্রবেশ করুন</span>
                </button>
              ) : (
                <button
                  onClick={onOpenAuth}
                  className="cursor-pointer px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-sm sm:text-base shadow-xl shadow-blue-600/40 transition-all flex items-center gap-2 border border-blue-400/30 hover:scale-105"
                >
                  <i className="fa-solid fa-user-plus"></i>
                  <span>সদস্য হিসেবে যুক্ত হোন</span>
                </button>
              )}

              <button
                onClick={() => {
                  const el = document.getElementById('projects-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="cursor-pointer px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm sm:text-base transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-map-location-dot text-amber-400"></i>
                <span>চলমান ভূমি প্রকল্পসমূহ দেখুন</span>
              </button>

              {/* Direct Call CTA Button configured from Admin Panel */}
              {(settings?.call_cta_phone || settings?.contact_phone_1) && (
                <a
                  href={`tel:${(settings.call_cta_phone || settings.contact_phone_1).replace(/\s+/g, '')}`}
                  className="cursor-pointer px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm sm:text-base shadow-xl shadow-emerald-700/30 transition-all flex items-center gap-2 border border-emerald-400/40 hover:scale-105"
                  title="সরাসরি কল করতে ক্লিক করুন"
                >
                  <i className="fa-solid fa-phone-volume text-amber-300 animate-bounce"></i>
                  <span>{settings.call_cta_text || 'সরাসরি কল করুন'}</span>
                  <span className="font-num font-extrabold text-white text-xs bg-emerald-950/70 px-2 py-0.5 rounded-lg border border-emerald-400/30">
                    {settings.call_cta_phone || settings.contact_phone_1}
                  </span>
                </a>
              )}
            </div>
            
            {/* Direct Call Timing Banner */}
            {settings?.call_cta_timing && (
              <p className="text-xs text-slate-400 font-bengali">
                <i className="fa-regular fa-clock text-amber-400 mr-1.5"></i>
                হটলাইন সহায়তার সময়: <span className="text-slate-200 font-medium">{settings.call_cta_timing}</span>
              </p>
            )}
          </div>

          {/* DYNAMIC REAL-TIME TOTAL CAPITAL COUNTER CARD */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800/80 to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-w-4xl mx-auto backdrop-blur-md">
            {/* Top Seal Tag */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <i className="fa-solid fa-vault text-lg"></i>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    রিয়েল-টাইম যৌথ বিনিয়োগ মূলধন কাউন্টার
                  </h3>
                  <span className="text-xs text-emerald-400 font-medium">
                    স্বয়ংক্রিয় যোগফল: অনুমোদিত মাসিক কিস্তি + এককালীন বিনিয়োগ
                  </span>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-700 text-xs text-slate-300 font-num">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Verified System Ledger</span>
              </div>
            </div>

            {/* Counter Numbers Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-7 space-y-2">
                <span className="text-xs sm:text-sm text-slate-400 block font-medium">
                  সদস্যদের সর্বমোট সংগৃহীত ও অনুমোদিত মূলধন:
                </span>
                <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-amber-300 font-num tracking-tight">
                  {formatTaka(stats?.total_capital || 0)}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 font-bengali">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    মাসিক কিস্তি: <strong className="text-slate-200 font-num">{formatTaka(stats?.total_monthly_capital || 0)}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    এককালীন জমা: <strong className="text-slate-200 font-num">{formatTaka(stats?.total_lumpsum_capital || 0)}</strong>
                  </span>
                </div>
              </div>

              {/* Goal Progress Ring / Bar */}
              <div className="md:col-span-5 bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-400 font-bengali">লক্ষ্যমাত্রা অর্জন অগ্রগতি</span>
                  <span className="text-amber-400 font-num font-bold text-sm">
                    {toBengaliDigits(stats?.capital_percentage || 0)}%
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400 rounded-full transition-all duration-1000"
                    style={{ width: `${stats?.capital_percentage || 0}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 font-bengali">
                  <span>তহবিল লক্ষ্যমাত্রা:</span>
                  <span className="font-bold text-white font-num">
                    {formatTaka(settings?.target_amount || stats?.target_amount || 10000000)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. LAND INVESTMENTS CAROUSEL & CARDS SECTION */}
      {/* ========================================================================= */}
      <section id="projects-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider mb-2 font-english">
              <i className="fa-solid fa-map"></i>
              <span>Active Real Estate Portfolio</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              আমাদের বর্তমান ভূমি প্রকল্পসমূহ
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              সম্পূর্ণ নিষ্কণ্টক, জরিপকৃত এবং দ্রুত বর্ধনশীল প্রাইম লোকেশনে নির্বাচিত প্রকল্প যেখানে আপনি শেয়ারের মাধ্যমে যৌথ মালিকানা লাভ করবেন
            </p>
          </div>

          <div className="text-xs text-slate-400 font-bengali">
            মোট প্রকল্প: <strong className="text-white font-num">{toBengaliDigits(lands.length)}</strong> টি
          </div>
        </div>

        {/* Land Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {lands.map((land) => {
            const currentImgIndex = carouselIndices[land.land_id] || 0;
            const images = land.images.length > 0 ? land.images : ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800'];
            const availableShares = land.total_shares - land.sold_shares;
            const progressPercent = Math.min(100, Math.round((land.sold_shares / land.total_shares) * 100));

            return (
              <div
                key={land.land_id}
                className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col group hover:border-slate-700 transition duration-300"
              >
                {/* Image Carousel Container */}
                <div className="relative h-60 overflow-hidden bg-slate-950">
                  <img
                    src={images[currentImgIndex]}
                    alt={land.land_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Gradient shadow for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80"></div>

                  {/* Carousel Left / Right Buttons */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrevImage(land.land_id, images.length);
                        }}
                        className="cursor-pointer absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/70 text-white hover:bg-slate-900 flex items-center justify-center text-xs backdrop-blur-sm transition"
                        aria-label="Previous Image"
                      >
                        <i className="fa-solid fa-chevron-left"></i>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNextImage(land.land_id, images.length);
                        }}
                        className="cursor-pointer absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/70 text-white hover:bg-slate-900 flex items-center justify-center text-xs backdrop-blur-sm transition"
                        aria-label="Next Image"
                      >
                        <i className="fa-solid fa-chevron-right"></i>
                      </button>
                    </>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-xs font-bold text-amber-300 border border-amber-400/30">
                    {land.land_id}
                  </div>

                  <div className="absolute top-3.5 right-3.5 px-3 py-1 rounded-full bg-emerald-600 text-xs font-bold text-white shadow-md">
                    {land.status === 'Active' ? 'সক্রিয় বুকিং' : land.status}
                  </div>

                  {/* Area Size on Bottom Overlay */}
                  <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between text-xs text-white">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur-md font-semibold text-emerald-300 border border-slate-700/60">
                      <i className="fa-solid fa-ruler-combined mr-1 text-emerald-400"></i>
                      {land.area_size}
                    </span>

                    {images.length > 1 && (
                      <span className="px-2 py-0.5 rounded bg-slate-950/70 font-num text-[11px] text-slate-300">
                        {currentImgIndex + 1}/{images.length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Box */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-white leading-snug">{land.land_name}</h3>
                    
                    <p className="text-xs text-slate-300 flex items-start gap-2">
                      <i className="fa-solid fa-location-dot text-red-400 text-sm mt-0.5"></i>
                      <span>{land.location}</span>
                    </p>

                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {land.description}
                    </p>

                    {/* Features list */}
                    {land.features && land.features.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        {land.features.slice(0, 2).map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                            <i className="fa-solid fa-circle-check text-emerald-400 text-[11px]"></i>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pricing & Shares Stats - Comprehensive Breakdown */}
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* প্রতি শেয়ার মূল্য */}
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-400 block text-[11px]">প্রতি শেয়ার মূল্য</span>
                        <span className="text-sm font-bold text-emerald-400 font-num">
                          {formatTaka(land.share_price)}
                        </span>
                      </div>

                      {/* মাসিক কিস্তি পরিমাণ */}
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-slate-400 block text-[11px]">মাসিক কিস্তি পরিমাণ</span>
                        <span className="text-sm font-bold text-blue-400 font-num">
                          {formatTaka(land.monthly_installment || 5000)}
                          <span className="text-[10px] font-normal text-slate-400 ml-1">/মাস</span>
                        </span>
                      </div>

                      {/* অবশিষ্ট শেয়ার */}
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span>অবশিষ্ট শেয়ার</span>
                          <span className="text-[10px] text-slate-500 font-num">মোট {toBengaliDigits(land.total_shares)} টি</span>
                        </div>
                        <span className={`text-sm font-bold font-num ${availableShares > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                          {toBengaliDigits(availableShares)} টি খালি
                        </span>
                      </div>

                      {/* অবশিষ্ট শেয়ারের মোট দাম */}
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-950/40 to-slate-950 border border-amber-500/30">
                        <span className="text-amber-300 block text-[11px] font-medium">অবশিষ্ট শেয়ারের মোট দাম</span>
                        <span className="text-sm font-black text-amber-300 font-num">
                          {formatTaka(availableShares * land.share_price)}
                        </span>
                      </div>
                    </div>

                    {/* প্রকল্পের মোট মূল্য */}
                    <div className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bengali">প্রকল্পের মোট শেয়ার মূলধন:</span>
                      <span className="font-extrabold text-white font-num text-sm">
                        {formatTaka(land.total_shares * land.share_price)}
                      </span>
                    </div>

                    {/* Shares Progress */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-slate-400">
                        <span>বিক্রিত শেয়ার: {toBengaliDigits(land.sold_shares)} টি ({toBengaliDigits(progressPercent)}%)</span>
                        <span className="font-num text-emerald-400">{formatTaka(land.sold_shares * land.share_price)} সংগ্রহ</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-amber-400"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Shareholders Modal Trigger */}
                        <button
                          onClick={() => setSelectedLandForShareholders(land)}
                          className="cursor-pointer py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <i className="fa-solid fa-users text-blue-400"></i>
                          <span>শেয়ারহোল্ডার তালিকা</span>
                        </button>

                        {/* Invest Action */}
                        <button
                          onClick={() => {
                            if (currentUser) {
                              onNavigateTab('dashboard');
                            } else {
                              onOpenAuth();
                            }
                          }}
                          className="cursor-pointer py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition flex items-center justify-center gap-1.5"
                        >
                          <i className="fa-solid fa-handshake"></i>
                          <span>শেয়ার বুক করুন</span>
                        </button>
                      </div>

                      {/* PUBLIC MARKETPLACE BUY BUTTON: "I Want to Buy" */}
                      <button
                        onClick={() => {
                          setSelectedLandForBuy(land);
                          setIsBuyModalOpen(true);
                        }}
                        className="cursor-pointer w-full py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center justify-center gap-2 group-hover:border-emerald-500"
                      >
                        <i className="fa-solid fa-cart-shopping text-emerald-400"></i>
                        <span>আমি এই জমিটি সম্পূর্ণ/খন্ডকালীন কিনতে চাই (I Want to Buy)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2.5 PUBLIC LAND MARKETPLACE & "WANT TO SELL YOUR LAND?" BANNER */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-blue-950/60 border border-emerald-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Subtle background glow */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
            <div className="space-y-3 text-center lg:text-left max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold uppercase tracking-wider font-english">
                <i className="fa-solid fa-arrows-rotate"></i>
                <span>Public Land Marketplace & Buy-Sell Portal</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white font-bengali">
                আপনার কি কোনো নির্ভেজাল জমি আছে যা বিক্রি করতে চান?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-bengali leading-relaxed">
                BoB প্ল্যাটফর্মে সরাসরি জমি বিক্রির আবেদন দাখিল করুন। আমাদের শত শত বিনিয়োগকারী সদস্য এবং যৌথ মূলধনের মাধ্যমে আপনার জমির সর্বোচ্চ সঠিক মূল্য ও নিরাপদ বিক্রয় নিশ্চিত করুন।
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setIsSellModalOpen(true)}
                className="cursor-pointer px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-700/30 transition-all flex items-center gap-2 font-bengali hover:scale-105"
              >
                <i className="fa-solid fa-hand-holding-dollar text-amber-300 text-base"></i>
                <span>জমি বিক্রির আবেদন দিন (Want to Sell Land?)</span>
              </button>

              <button
                onClick={() => {
                  setSelectedLandForBuy(null);
                  setIsBuyModalOpen(true);
                }}
                className="cursor-pointer px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold transition-all flex items-center gap-2 font-bengali"
              >
                <i className="fa-solid fa-magnifying-glass-location text-blue-400"></i>
                <span>জমি কেনার প্রস্তাব দাখিল</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE ROI & APPRECIATION CALCULATOR */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RoiCalculator
          lands={lands}
          onBookShare={() => {
            if (currentUser) {
              onNavigateTab('dashboard');
            } else {
              onOpenAuth();
            }
          }}
        />
      </section>

      {/* ========================================================================= */}
      {/* 4. LEADERSHIP & DIRECTORS SECTION */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold uppercase tracking-wider font-english">
            <i className="fa-solid fa-user-shield"></i>
            <span>Trust & Governance</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            পরিচালনা পর্ষদ ও নেতৃত্ব
          </h2>
          <p className="text-sm text-slate-400">
            অভিজ্ঞ উদ্যোক্তা, আইন উপদেষ্টা ও পেশাজীবীদের সমন্বয়ে গঠিত আমাদের ব্যবস্থাপনা পর্ষদ
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {directors.map((dir) => (
            <div
              key={dir.director_id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
            >
              <div>
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <img
                    src={dir.photo_url}
                    alt={dir.name}
                    className="w-full h-full rounded-2xl object-cover border-2 border-emerald-500/60 shadow-lg"
                  />
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-slate-950 border border-emerald-400 flex items-center justify-center text-[10px] text-emerald-400">
                    <i className="fa-solid fa-shield-check"></i>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-1">{dir.name}</h3>
                <p className="text-xs text-emerald-400 font-semibold mb-3">{dir.designation}</p>

                <p className="text-xs text-slate-400 italic leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  "{dir.message}"
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-center gap-3 text-xs text-slate-400">
                <a
                  href={`tel:${dir.phone.replace(/\s+/g, '')}`}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white transition"
                  title="সরাসরি কল করুন"
                >
                  <i className="fa-solid fa-phone"></i>
                </a>
                <a
                  href={`mailto:${dir.email}`}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white transition"
                  title="ইমেইল পাঠান"
                >
                  <i className="fa-solid fa-envelope"></i>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. PROJECT GALLERY & ON-SITE INSPECTIONS */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold uppercase tracking-wider mb-2 font-english">
              <i className="fa-solid fa-camera"></i>
              <span>Ground Reality & Verification</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              কার্যক্রম ও সরেজমিন ফটো গ্যালারি
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              মৌজা ম্যাপ পরীক্ষা, দলিল সম্পাদন, সীমানা পিলার স্থাপন ও সদস্যদের নিয়ে সাইট ভিজিট
            </p>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-2 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedGalleryCat(cat)}
                className={`cursor-pointer px-3.5 py-1.5 rounded-full font-semibold transition ${
                  selectedGalleryCat === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'All' ? 'সকল ছবি' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGallery.map((item) => (
            <div
              key={item.id}
              onClick={() => setPreviewImage(item)}
              className="group cursor-pointer bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-blue-500/50 transition-all duration-300"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-90 transition"></div>

                <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-amber-300 border border-amber-400/30">
                  {item.category}
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h4 className="text-sm font-bold leading-snug line-clamp-2">{item.title}</h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 mt-1">
                    <span>
                      <i className="fa-solid fa-location-dot text-red-400 mr-1"></i>
                      {item.location}
                    </span>
                    <span className="font-num">{toBengaliDigits(item.date)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. TRUST PLEDGE BANNER */}
      {/* ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-3xl mx-auto shadow-lg">
            <i className="fa-solid fa-handshake-simple"></i>
          </div>

          <div className="space-y-2 max-w-2xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              শতভাগ সততা ও সমবায়ের শক্তিতে গড়ুন আপনার ভবিষ্যৎ
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              বন্ধন ও বিনিয়োগে কোনো জটিলতা বা অদৃশ্য শর্ত নেই। আপনার প্রতিটি টাকার হিসাব অনলাইন ড্যাশবোর্ডে সংরক্ষিত থাকে এবং স্বয়ংক্রিয় ভাউচার জেনারেট হয়।
            </p>
          </div>

          <div className="pt-2">
            {currentUser ? (
              <button
                onClick={() => onNavigateTab('dashboard')}
                className="cursor-pointer px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-emerald-700/30 transition-all inline-flex items-center gap-2"
              >
                <i className="fa-solid fa-wallet"></i>
                <span>মাসিক কিস্তি জমা দিন</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="cursor-pointer px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-sm sm:text-base shadow-xl shadow-blue-600/40 transition-all inline-flex items-center gap-2 border border-blue-400/30"
              >
                <i className="fa-solid fa-right-to-bracket"></i>
                <span>আজই সদস্য হিসেবে আবেদন করুন</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Shareholder Modal */}
      {selectedLandForShareholders && (
        <ShareholdersModal
          land={selectedLandForShareholders}
          onClose={() => setSelectedLandForShareholders(null)}
        />
      )}

      {/* Gallery Image Preview Lightbox */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center text-xs">
              <span className="font-bold text-white">{previewImage.title}</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div className="p-2 bg-slate-950 flex items-center justify-center">
              <img
                src={previewImage.image_url}
                alt={previewImage.title}
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
            </div>
            <div className="p-4 text-xs text-slate-400 flex justify-between items-center">
              <span>{previewImage.location}</span>
              <span className="font-num">{toBengaliDigits(previewImage.date)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Public Marketplace: Land Buy Modal */}
      <LandBuyModal
        isOpen={isBuyModalOpen}
        onClose={() => {
          setIsBuyModalOpen(false);
          setSelectedLandForBuy(null);
        }}
        selectedLand={selectedLandForBuy}
        onOfferSubmitted={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

      {/* Public Marketplace: Land Sell Modal */}
      <LandSellModal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        onSubmissionSuccess={() => {
          if (onRefreshData) onRefreshData();
        }}
      />
    </div>
  );
};
