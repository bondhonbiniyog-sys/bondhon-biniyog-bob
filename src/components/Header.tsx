import React, { useState } from 'react';
import type { Member, SystemSettings } from '../types';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: Member | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  settings?: SystemSettings | null;
  pendingApprovalsCount?: number;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  onOpenR2Storage?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onOpenAuth,
  onLogout,
  settings,
  pendingApprovalsCount = 0,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onOpenR2Storage,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'home', label: 'হোম', icon: 'fa-solid fa-house' },
    { id: 'projects', label: 'ভূমি প্রকল্প', icon: 'fa-solid fa-map-location-dot' },
    { id: 'calculator', label: 'আর.ও.আই ক্যালকুলেটর', icon: 'fa-solid fa-calculator' },
    { id: 'directors', label: 'পরিচালনা পর্ষদ', icon: 'fa-solid fa-users-line' },
    { id: 'gallery', label: 'গ্যালারি', icon: 'fa-solid fa-images' },
  ];

  const handleNavClick = (id: string) => {
    setCurrentTab(id);
    setMobileMenuOpen(false);
  };

  const logoSrc = settings?.logo_url || '/bob-logo.png';
  const projectTitle = settings?.project_title || 'বন্ধন ও বিনিয়োগ';
  const slogan = settings?.slogan_bengali || 'যৌথ স্বপ্ন • নিশ্চিত ভবিষ্যৎ';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-xl no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Title */}
          <div
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="relative">
              <div className="w-13 h-13 rounded-2xl p-0.5 bg-gradient-to-tr from-blue-700 via-emerald-600 to-amber-500 shadow-xl group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center p-0.5 overflow-hidden shadow-inner">
                  <img
                    src={logoSrc}
                    alt="BoB Official Logo"
                    className="w-full h-full object-contain rounded-xl"
                    onError={(e: any) => {
                      e.target.src = '/bob-logo.png';
                    }}
                  />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-slate-900"></span>
              </span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-bengali">
                  {projectTitle}
                </span>
                <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-blue-900/70 border border-blue-500/40 text-blue-300 rounded-md font-english">
                  BoB
                </span>
              </div>
              <span className="text-xs text-emerald-400 font-medium tracking-wide font-bengali flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                {slogan}
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`cursor-pointer px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  currentTab === link.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <i className={`${link.icon} text-xs ${currentTab === link.id ? 'text-white' : 'text-slate-400'}`}></i>
                <span>{link.label}</span>
              </button>
            ))}
          </nav>

          {/* Right Action / Auth Buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            {currentUser ? (
              <div className="flex items-center gap-2.5">
                {/* Admin Portal Button */}
                {currentUser.role === 'Admin' && (
                  <button
                    onClick={() => handleNavClick('admin')}
                    className={`cursor-pointer relative px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all border flex items-center gap-1.5 ${
                      currentTab === 'admin'
                        ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/40 hover:bg-amber-500/20'
                    }`}
                  >
                    <i className="fa-solid fa-shield-halved text-amber-400"></i>
                    <span>অ্যাডমিন প্যানেল</span>
                    {pendingApprovalsCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-bold rounded-full animate-pulse">
                        {pendingApprovalsCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Member Profile & Dashboard Button (Shows Member Name instead of generic 'ড্যাশবোর্ড') */}
                <button
                  onClick={() => handleNavClick('dashboard')}
                  title={`ড্যাশবোর্ড - ${currentUser.full_name}`}
                  className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border flex items-center gap-2 max-w-[200px] lg:max-w-[240px] ${
                    currentTab === 'dashboard'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <img
                    src={currentUser.avatar_url || currentUser.live_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.full_name)}`}
                    alt={currentUser.full_name}
                    className="w-6 h-6 rounded-full object-cover border border-emerald-400 shrink-0"
                  />
                  <span className="truncate font-bengali font-bold text-xs sm:text-sm">
                    {currentUser.full_name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950/80 text-emerald-400 font-num shrink-0 border border-emerald-500/20">
                    {currentUser.member_id}
                  </span>
                </button>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  title="লগআউট"
                  className="cursor-pointer p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket"></i>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="cursor-pointer px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium text-sm shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 transition-all duration-300 flex items-center gap-2 border border-blue-400/30"
              >
                <i className="fa-solid fa-right-to-bracket text-xs text-blue-200"></i>
                <span>লগইন / নিবন্ধন</span>
              </button>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex lg:hidden items-center gap-2">
            {currentUser && (
              <button
                onClick={() => handleNavClick('dashboard')}
                title={currentUser.full_name}
                className="cursor-pointer px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 max-w-[140px]"
              >
                <img
                  src={currentUser.avatar_url || currentUser.live_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.full_name)}`}
                  alt={currentUser.full_name}
                  className="w-5 h-5 rounded-full object-cover border border-emerald-400 shrink-0"
                />
                <span className="truncate font-bengali">{currentUser.full_name}</span>
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="cursor-pointer p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
              aria-label="Toggle Menu"
            >
              <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'} text-lg`}></i>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-800 space-y-2 animate-fadeIn">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`cursor-pointer w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-3 ${
                  currentTab === link.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <i className={`${link.icon} w-5 text-center text-slate-400`}></i>
                <span>{link.label}</span>
              </button>
            ))}

            <div className="pt-3 border-t border-slate-800 space-y-2">
              {currentUser ? (
                <>
                  <button
                    onClick={() => handleNavClick('dashboard')}
                    className={`cursor-pointer w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between ${
                      currentTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'bg-slate-800/80 text-emerald-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={currentUser.avatar_url || currentUser.live_photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.full_name)}`}
                        alt={currentUser.full_name}
                        className="w-7 h-7 rounded-full object-cover border border-emerald-400 shrink-0"
                      />
                      <span className="font-bold font-bengali">{currentUser.full_name}</span>
                    </div>
                    <span className="text-xs bg-slate-900 px-2 py-0.5 rounded font-num text-slate-300">
                      {currentUser.member_id}
                    </span>
                  </button>

                  {currentUser.role === 'Admin' && (
                    <button
                      onClick={() => handleNavClick('admin')}
                      className={`cursor-pointer w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between ${
                        currentTab === 'admin' ? 'bg-amber-600 text-white' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-shield-halved"></i>
                        <span>অ্যাডমিন কন্ট্রোল প্যানেল</span>
                      </div>
                      {pendingApprovalsCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                          {pendingApprovalsCount}
                        </span>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="cursor-pointer w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <i className="fa-solid fa-arrow-right-from-bracket"></i>
                    <span>লগআউট করুন</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    onOpenAuth();
                    setMobileMenuOpen(false);
                  }}
                  className="cursor-pointer w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-center flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-right-to-bracket"></i>
                  <span>লগইন / নিবন্ধন করুন</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
