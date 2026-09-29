import React from 'react';
import type { SystemSettings } from '../types';

interface FooterProps {
  settings: SystemSettings | null;
  onNavigate: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onNavigate }) => {
  const phone1 = settings?.contact_phone_1 || '+880 1712-345678';
  const phone2 = settings?.contact_phone_2 || '+880 1890-123456';
  const email = settings?.contact_email || 'bondhon.biniyog@gmail.com';
  const managementLead = settings?.management_lead || 'সজিব মোল্লা';

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800/80 pt-16 pb-12 no-print relative overflow-hidden">
      {/* Background subtle radial gradient */}
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Col 1: About Organization */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white p-0.5 border border-amber-400/40 shadow-md flex items-center justify-center overflow-hidden">
                <img
                  src={settings?.logo_url || '/bob-logo.png'}
                  alt="BoB Official Logo"
                  className="w-full h-full object-contain"
                  onError={(e: any) => {
                    e.target.src = '/logo.png';
                  }}
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-bengali">
                  {settings?.project_title || 'বন্ধন ও বিনিয়োগ'}
                </h3>
                <p className="text-xs text-blue-400 font-english uppercase tracking-wider font-semibold">BONDHON O BINIYOG (BoB)</p>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed font-bengali">
              {settings?.project_vision?.slice(0, 140) ||
                'যৌথ ভূমি বিনিয়োগ, সমবায় সঞ্চয় এবং ক্ষুদ্র ক্ষুদ্র মাসিক জমার মাধ্যমে নির্ভরযোগ্য ও লাভজনক রিয়েল এস্টেট সম্পদ গড়ার আধুনিক প্ল্যাটফর্ম।'}...
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-emerald-400">
              <i className="fa-solid fa-certificate text-amber-400"></i>
              <span>{settings?.slogan_bengali || 'যৌথ স্বপ্ন • নিশ্চিত ভবিষ্যৎ'}</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2 font-bengali">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              প্রয়োজনীয় লিংক
            </h4>
            <ul className="space-y-2.5 text-sm font-bengali">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="cursor-pointer hover:text-white transition flex items-center gap-2 text-slate-400 hover:translate-x-1 duration-200"
                >
                  <i className="fa-solid fa-chevron-right text-[10px] text-blue-400"></i>
                  <span>হোম পেজ ও প্রকল্পের বিবরণ</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('projects')}
                  className="cursor-pointer hover:text-white transition flex items-center gap-2 text-slate-400 hover:translate-x-1 duration-200"
                >
                  <i className="fa-solid fa-chevron-right text-[10px] text-blue-400"></i>
                  <span>বর্তমান চালু ভূমি প্রকল্পসমূহ</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('calculator')}
                  className="cursor-pointer hover:text-white transition flex items-center gap-2 text-slate-400 hover:translate-x-1 duration-200"
                >
                  <i className="fa-solid fa-chevron-right text-[10px] text-blue-400"></i>
                  <span>জমি বৃদ্ধি ও আর.ও.আই ক্যালকুলেটর</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('directors')}
                  className="cursor-pointer hover:text-white transition flex items-center gap-2 text-slate-400 hover:translate-x-1 duration-200"
                >
                  <i className="fa-solid fa-chevron-right text-[10px] text-blue-400"></i>
                  <span>পরিচালনা পর্ষদের তথ্যাবলী</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('gallery')}
                  className="cursor-pointer hover:text-white transition flex items-center gap-2 text-slate-400 hover:translate-x-1 duration-200"
                >
                  <i className="fa-solid fa-chevron-right text-[10px] text-blue-400"></i>
                  <span>ভূমি জরিপ ও কার্যক্রমের গ্যালারি</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Direct Call CTA */}
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2 font-bengali">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              যোগাযোগ ও সরাসরি কল (Call CTA)
            </h4>

            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800/80 border border-slate-700/80 space-y-3">
              <p className="text-xs text-slate-400 font-bengali">
                যেকোনো নতুন প্রকল্প, শেয়ার বুকিং বা মাসিক কিস্তি সংক্রান্ত তথ্যের জন্য সরাসরি কল করুন:
              </p>
              
              <a
                href={`tel:${phone1.replace(/\s+/g, '')}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-md shadow-emerald-700/30 group"
              >
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition">
                  <i className="fa-solid fa-phone text-xs"></i>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-100 font-bengali">হটলাইন ১ (সরাসরি কল)</div>
                  <div className="font-num tracking-wide">{phone1}</div>
                </div>
              </a>

              <a
                href={`tel:${phone2.replace(/\s+/g, '')}`}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold text-sm transition"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <i className="fa-solid fa-phone-volume text-xs"></i>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bengali">হটলাইন ২ (সদস্য সেবা)</div>
                  <div className="font-num tracking-wide">{phone2}</div>
                </div>
              </a>

              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 text-xs text-blue-400 hover:underline pt-1"
              >
                <i className="fa-regular fa-envelope"></i>
                <span className="font-english">{email}</span>
              </a>
            </div>
          </div>

          {/* Col 4: Management & Transparency Pledge */}
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-white mb-4 flex items-center gap-2 font-bengali">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              স্বচ্ছতা ও অঙ্গীকার
            </h4>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 text-xs text-slate-400 font-bengali leading-relaxed">
              <div className="flex items-start gap-2">
                <i className="fa-solid fa-shield-check text-emerald-400 mt-1"></i>
                <span>সরকারি রেজিস্ট্রেশন ও সাব-কবলা দলিলের মাধ্যমে যৌথ মালিকানা প্রদান।</span>
              </div>
              <div className="flex items-start gap-2">
                <i className="fa-solid fa-file-invoice-dollar text-blue-400 mt-1"></i>
                <span>প্রতিটি জমার জন্য তাৎক্ষণিক ডিজিটাল মানি রিসিট ও ভাউচার ইস্যু।</span>
              </div>
              <div className="flex items-start gap-2">
                <i className="fa-solid fa-building-columns text-amber-400 mt-1"></i>
                <span>স্বীকৃত তফসিলি ব্যাংকের মাধ্যমে তহবিল পরিচালনা।</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Footer Bottom Section */}
        <div className="border-t border-slate-800/80 pt-8 flex flex-col items-center justify-center text-center gap-3">
          {/* Centered Management Lead */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/30 text-amber-300 font-medium text-sm font-bengali shadow-sm">
            <i className="fa-solid fa-user-tie text-amber-400"></i>
            <span>ব্যবস্থাপনায়— {managementLead}</span>
          </div>

          {/* Exact Required Copyright Line */}
          <p className="text-sm text-slate-400 font-bengali">
            © 2026 বন্ধন ও বিনিয়োগ (BONDHON O BINIYOG)। সর্বস্বত্ব সংরক্ষিত।
          </p>

          <p className="text-xs text-slate-600 font-english">
            Safe, Transparent & Reliable Joint Land Investment Platform • Bangladesh
          </p>
        </div>
      </div>
    </footer>
  );
};
