import React, { useState, useEffect, useCallback } from 'react';
import type {
  SystemSettings,
  Member,
  MonthlyDeposit,
  LumpsumDeposit,
  LandInvestment,
  Director,
  GalleryItem,
  DashboardStats,
  AppNotification,
} from './types';
import { SplashScreen } from './components/SplashScreen';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { NoticeTicker } from './components/NoticeTicker';
import { HomePage } from './components/HomePage';
import { UserDashboard } from './components/UserDashboard';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { TermsModal } from './components/TermsModal';
import { RoiCalculator } from './components/RoiCalculator';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { CloudflareR2ExplorerModal } from './components/CloudflareR2ExplorerModal';
import {
  initialSystemSettings,
  initialMembers,
  initialMonthlyDeposits,
  initialLumpsumDeposits,
  initialLandInvestments,
} from './services/initialData';
import { useCloudflareRealtime } from './services/realtimeClient';

export default function App() {
  // Splash Screen control (shown initially)
  const [showSplash, setShowSplash] = useState(true);

  // Active Navigation Tab
  // Options: 'home', 'projects', 'calculator', 'directors', 'gallery', 'dashboard', 'admin'
  const [currentTab, setCurrentTab] = useState<string>('home');

  // Authentication State
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // App Data State (pre-populated with initial settings for instantaneous render)
  const [settings, setSettings] = useState<SystemSettings>(initialSystemSettings);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [monthlyDeposits, setMonthlyDeposits] = useState<MonthlyDeposit[]>([]);
  const [lumpsumDeposits, setLumpsumDeposits] = useState<LumpsumDeposit[]>([]);
  const [lands, setLands] = useState<LandInvestment[]>([]);
  const [directors, setDirectors] = useState<Director[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showGlobalR2Modal, setShowGlobalR2Modal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check URL pathname for /admin on initial load
  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setCurrentTab('admin');
    }
  }, []);

  // Safe fetch helper for network & CDN resilience
  const safeFetch = async (url: string) => {
    try {
      const res = await fetch(url);
      return await res.json();
    } catch (e) {
      return { success: false };
    }
  };

  // Fetch all core application data from backend REST API (or local storage fallback)
  const fetchAppData = useCallback(async () => {
    try {
      const [
        settingsRes,
        statsRes,
        membersRes,
        monthlyRes,
        lumpsumRes,
        landsRes,
        directorsRes,
        galleryRes,
        notifRes,
      ] = await Promise.all([
        safeFetch('/api/settings'),
        safeFetch('/api/stats'),
        safeFetch('/api/members'),
        safeFetch('/api/deposits/monthly'),
        safeFetch('/api/deposits/lumpsum'),
        safeFetch('/api/lands'),
        safeFetch('/api/directors'),
        safeFetch('/api/gallery'),
        safeFetch(`/api/notifications${currentUser ? `?member_id=${currentUser.member_id}` : ''}`),
      ]);

      if (settingsRes?.success && settingsRes.settings) setSettings(settingsRes.settings);
      if (statsRes?.success && statsRes.stats) setStats(statsRes.stats);
      if (membersRes?.success && membersRes.members) {
        setMembers(membersRes.members);
        // Sync current logged in user with fresh data
        if (currentUser) {
          const freshUser = membersRes.members.find(
            (m: Member) => m.member_id === currentUser.member_id
          );
          if (freshUser) {
            setCurrentUser(freshUser);
            localStorage.setItem('bob_logged_user', JSON.stringify(freshUser));
          }
        }
      }
      if (monthlyRes?.success && monthlyRes.deposits) setMonthlyDeposits(monthlyRes.deposits);
      if (lumpsumRes?.success && lumpsumRes.deposits) setLumpsumDeposits(lumpsumRes.deposits);
      if (landsRes?.success && landsRes.lands) setLands(landsRes.lands);
      if (directorsRes?.success && directorsRes.directors) setDirectors(directorsRes.directors);
      if (galleryRes?.success && galleryRes.gallery) setGallery(galleryRes.gallery);
      if (notifRes?.success && notifRes.notifications) setNotifications(notifRes.notifications);
    } catch (err) {
      console.error('Error fetching app data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Load cached user session on startup, setup Cloudflare Durable Objects Realtime WebSocket listener
  useEffect(() => {
    const cached = localStorage.getItem('bob_logged_user');
    if (cached) {
      try {
        const user = JSON.parse(cached);
        setCurrentUser(user);
        if (!user.has_accepted_terms) {
          setShowTermsModal(true);
        }
      } catch (e) {
        localStorage.removeItem('bob_logged_user');
      }
    }

    // Initial fetch from Cloudflare D1 / API
    fetchAppData();

    // Cloudflare Realtime: WebSocket listener via Durable Objects
    // When any mutation happens on D1 (add member, add kisti, change logo, change notice),
    // it instantly broadcasts to all connected mobiles & desktops without refresh!
    const unsubscribeRealtime = useCloudflareRealtime((event) => {
      console.log('⚡ Cloudflare Realtime Broadcast Event:', event.type);
      fetchAppData();
    });

    return () => {
      unsubscribeRealtime();
    };
  }, [fetchAppData]);

  // Login handler
  const handleLoginSuccess = (member: Member) => {
    setCurrentUser(member);
    localStorage.setItem('bob_logged_user', JSON.stringify(member));

    // Check terms
    if (!member.has_accepted_terms) {
      setShowTermsModal(true);
    }

    // Role-based routing
    if (member.role === 'Admin') {
      setCurrentTab('admin');
    } else {
      setCurrentTab('dashboard');
    }

    fetchAppData();
  };

  // Logout handler
  const handleLogout = async () => {
    setCurrentUser(null);
    localStorage.removeItem('bob_logged_user');
    setCurrentTab('home');
  };

  // Terms accepted handler
  const handleTermsAccepted = () => {
    if (currentUser) {
      const updated = { ...currentUser, has_accepted_terms: true };
      setCurrentUser(updated);
      localStorage.setItem('bob_logged_user', JSON.stringify(updated));
    }
    setShowTermsModal(false);
  };

  // Navigation tab switcher
  const handleNavigateTab = (tab: string) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate pending deposits count for header badge
  const pendingCount = (stats?.pending_monthly_deposits || 0) + (stats?.pending_lumpsum_deposits || 0);

  // Unread notifications calculation
  const unreadNotificationsCount = notifications.filter(
    (n) => currentUser && (!n.read_by || !n.read_by.includes(currentUser.member_id))
  ).length;

  const handleMarkNotificationRead = async (id: string) => {
    if (!currentUser) return;
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: id, member_id: currentUser.member_id }),
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, read_by: [...(n.read_by || []), currentUser.member_id] }
            : n
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Splash Screen with 5-second animated logo & tagline */}
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} settings={settings} />
      )}

      {/* 2. Global Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={handleNavigateTab}
        currentUser={currentUser}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        settings={settings}
        pendingApprovalsCount={pendingCount}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setShowNotificationCenter(true)}
        onOpenR2Storage={() => setShowGlobalR2Modal(true)}
      />

      {/* 3. Notice Ticker (Dynamic Bengali CMS updates from System Settings) */}
      <NoticeTicker notice={settings?.notice_bengali || ''} />

      {/* 4. Main Body Content Based on Active Tab */}
      <main className="flex-1">
        {/* HOME PAGE */}
        {currentTab === 'home' && (
          <HomePage
            settings={settings}
            stats={stats}
            lands={lands}
            directors={directors}
            gallery={gallery}
            currentUser={currentUser}
            onOpenAuth={() => setShowAuthModal(true)}
            onNavigateTab={handleNavigateTab}
            onRefreshData={fetchAppData}
          />
        )}

        {/* PROJECTS TAB */}
        {currentTab === 'projects' && (
          <div className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center font-bengali">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider mb-2 inline-block">
                Investment Portfolio
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white">আমাদের চলমান ভূমি প্রকল্পসমূহ</h1>
              <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
                ১০ কাঠা থেকে ৩ বিঘা পর্যন্ত বিভিন্ন আকর্ষণীয় লোকেশনে যৌথ মালিকানা ভিত্তিক ভূমি প্রকল্প
              </p>
            </div>
            <HomePage
              settings={settings}
              stats={stats}
              lands={lands}
              directors={directors}
              gallery={gallery}
              currentUser={currentUser}
              onOpenAuth={() => setShowAuthModal(true)}
              onNavigateTab={handleNavigateTab}
            />
          </div>
        )}

        {/* ROI CALCULATOR TAB */}
        {currentTab === 'calculator' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <RoiCalculator
              lands={lands}
              onBookShare={(land) => {
                if (currentUser) {
                  handleNavigateTab('dashboard');
                } else {
                  setShowAuthModal(true);
                }
              }}
            />
          </div>
        )}

        {/* DIRECTORS TAB */}
        {currentTab === 'directors' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-bengali">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
              <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold uppercase tracking-wider inline-block">
                পরিচালনা পর্ষদ
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white">দায়িত্বপ্রাপ্ত পরিচালনা কমিটি</h1>
              <p className="text-sm text-slate-400">
                সততা, স্বচ্ছতা ও যৌথ কল্যাণে নিবেদিত আমাদের পরিচালনা পর্ষদ
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {directors.map((dir) => (
                <div
                  key={dir.director_id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-xl flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="relative w-28 h-28 mx-auto mb-4">
                      <img
                        src={dir.photo_url}
                        alt={dir.name}
                        className="w-full h-full rounded-2xl object-cover border-2 border-emerald-500/60 shadow-lg"
                      />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{dir.name}</h3>
                    <p className="text-xs text-emerald-400 font-semibold mb-3">{dir.designation}</p>
                    <p className="text-xs text-slate-400 italic bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      "{dir.message}"
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex justify-center gap-3 text-xs text-slate-400">
                    <a
                      href={`tel:${dir.phone.replace(/\s+/g, '')}`}
                      className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white transition"
                    >
                      <i className="fa-solid fa-phone"></i>
                    </a>
                    <a
                      href={`mailto:${dir.email}`}
                      className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white transition"
                    >
                      <i className="fa-solid fa-envelope"></i>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GALLERY TAB */}
        {currentTab === 'gallery' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-bengali">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold uppercase tracking-wider inline-block">
                কার্যক্রম গ্যালারি
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white">সরেজমিন পরিদর্শন ও কার্যক্রমের আলোকচিত্র</h1>
              <p className="text-sm text-slate-400">
                ভূমি নির্বাচন, সীমানা পিলার স্থাপন ও আইনি দলিল সম্পাদন প্রক্রিয়া
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gallery.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg"
                >
                  <div className="relative h-60 overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80"></div>
                    <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-amber-300 border border-amber-400/30">
                      {item.category}
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h4 className="text-sm font-bold leading-snug">{item.title}</h4>
                      <div className="flex items-center justify-between text-[11px] text-slate-300 mt-1">
                        <span>
                          <i className="fa-solid fa-location-dot text-red-400 mr-1"></i>
                          {item.location}
                        </span>
                        <span className="font-num">{item.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USER DASHBOARD TAB */}
        {currentTab === 'dashboard' && (
          currentUser ? (
            <UserDashboard
              currentUser={currentUser}
              monthlyDeposits={monthlyDeposits}
              lumpsumDeposits={lumpsumDeposits}
              lands={lands}
              settings={settings}
              notifications={notifications}
              onOpenNotifications={() => setShowNotificationCenter(true)}
              onRefreshData={fetchAppData}
              onUpdateUser={setCurrentUser}
            />
          ) : (
            <div className="max-w-md mx-auto px-4 py-20 text-center font-bengali">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto mb-4 text-2xl">
                <i className="fa-solid fa-user-lock"></i>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">ড্যাশবোর্ডে প্রবেশের জন্য লগইন করুন</h2>
              <p className="text-slate-400 text-sm mb-6">
                আপনার মাসিক কিস্তি জমা, এককালীন বিনিয়োগের হিসাব এবং ডিজিটাল রসিদ দেখতে অনুগ্রহ করে সদস্য অ্যাকাউন্টে লগইন করুন।
              </p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="cursor-pointer px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition inline-flex items-center gap-2"
              >
                <i className="fa-solid fa-right-to-bracket"></i>
                <span>লগইন করুন</span>
              </button>
            </div>
          )
        )}

        {/* WEB ADMIN PANEL TAB (/admin) */}
        {currentTab === 'admin' && (
          <AdminPanel
            currentUser={currentUser}
            stats={stats}
            settings={settings}
            members={members}
            monthlyDeposits={monthlyDeposits}
            lumpsumDeposits={lumpsumDeposits}
            lands={lands}
            directors={directors}
            onRefreshData={fetchAppData}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        )}
      </main>

      {/* 5. Global Footer */}
      <Footer settings={settings} onNavigate={handleNavigateTab} />

      {/* 6. Auth Modal (Login & Register with Universal Logo) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
        settings={settings}
      />

      {/* 7. Enforced Scrolling Terms Approval Modal */}
      {showTermsModal && currentUser && (
        <TermsModal
          member={currentUser}
          onAccept={handleTermsAccepted}
          onClose={() => setShowTermsModal(false)}
        />
      )}

      {/* 8. Notification Center Modal */}
      <NotificationCenterModal
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
        notifications={notifications}
        currentMemberId={currentUser?.member_id}
        onMarkRead={handleMarkNotificationRead}
        onNavigateTab={handleNavigateTab}
      />

      {/* 9. Global Cloudflare R2 Object Storage Modal */}
      <CloudflareR2ExplorerModal
        isOpen={showGlobalR2Modal}
        onClose={() => setShowGlobalR2Modal(false)}
        isAdmin={currentUser?.role === 'Admin'}
      />
    </div>
  );
}
