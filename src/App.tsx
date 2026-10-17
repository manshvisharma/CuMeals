import React, { useState, useEffect } from 'react';
import { MenuPage } from './pages/MenuPage';
import { TimingsPage } from './pages/TimingsPage';
import { TimepassPage } from './pages/TimepassPage';
import { MorePage } from './pages/MorePage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLogin } from './pages/admin/AdminLogin';
import { GlassNav } from './components/GlassNav';
import { Toast } from './components/bento/Toast';
import { MandatoryAuthScreen } from './components/MandatoryAuthScreen';
import { GlobalMultiplayer } from './components/GlobalMultiplayer';
import { ActiveTab } from './types';
import { getTodayString } from './utils/dateUtils';
import { subscribeToAuth } from './firebase/auth';
import { useTheme } from './hooks/useTheme';
import { isUserAdmin } from './utils/adminUtils';
import { User } from 'firebase/auth';
import { prefetchLeaderboard } from './utils/leaderboard';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('menu');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [isAdminView, setIsAdminView] = useState<boolean>(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('mess_admin_session') === 'true';
  });

  const changeTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const handleNav = (e: any) => changeTab(e.detail);
    window.addEventListener('navigate-tab', handleNav);
    return () => window.removeEventListener('navigate-tab', handleNav);
  }, []);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);

  // Initialize Theme hook to ensure document.documentElement dark mode class
  useTheme();

  useEffect(() => {
    // Background prefetch global leaderboard scores for instant load
    prefetchLeaderboard();
    // Remove splash screen after initial load (with slight delay for smooth UX)
    const splash = document.getElementById('splash-screen');
    if (splash) {
      setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 400);
      }, 800); // Wait 800ms to show the logo
    }


    // Subscribe to Firebase Auth
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setAuthInitialized(true);
    });

    // Simple path detection for /admin URL
    if (window.location.pathname.startsWith('/admin')) {
      setIsAdminView(true);
    }

    return () => unsubscribe();
  }, []);

  const pageCls = (tab: ActiveTab) => `cm-page p-${tab}`;

  return (
    <div className="cm-root">
      {/* Mandatory Auth Lock Screen if not signed in */}
      {authInitialized && !user && !isAdminView && (
        <MandatoryAuthScreen onSuccess={() => {}} />
      )}

      <GlobalMultiplayer currentUser={user} onNavigateToGame={() => {}} />

      {isAdminView ? (
        /* Admin portal keeps its own dark control-panel look */
        <div className="dark relative z-[1] min-h-screen bg-[#0B0F19] text-slate-100 px-4 sm:px-8 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-12">
          <div className="mx-auto max-w-6xl">
            {isAdminLoggedIn ? (
              <AdminDashboard
                onLogout={() => {
                  localStorage.removeItem('mess_admin_session');
                  setIsAdminLoggedIn(false);
                  setIsAdminView(false);
                }}
                onBackToApp={() => setIsAdminView(false)}
              />
            ) : (
              <AdminLogin
                onLoginSuccess={() => {
                  setIsAdminLoggedIn(true);
                }}
                onBackToApp={() => setIsAdminView(false)}
              />
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="cm-dots" aria-hidden="true" />
          <main className="cm-view">
            {/* All pages stay mounted (state & games are kept); only the active one is visible.
                Switching pages happens ONLY through the navigation bar – no swiping. */}
            <section className={`${pageCls('menu')} ${activeTab === 'menu' ? 'enter' : ''}`} hidden={activeTab !== 'menu'}>
              <MenuPage selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            </section>
            <section className={`${pageCls('timings')} ${activeTab === 'timings' ? 'enter' : ''}`} hidden={activeTab !== 'timings'}>
              <TimingsPage />
            </section>
            <section className={`${pageCls('timepass')} ${activeTab === 'timepass' ? 'enter' : ''}`} hidden={activeTab !== 'timepass'}>
              <TimepassPage currentUser={user} />
            </section>
            <section className={`${pageCls('more')} ${activeTab === 'more' ? 'enter' : ''}`} hidden={activeTab !== 'more'}>
              <MorePage onOpenAdmin={() => setIsAdminView(true)} />
            </section>
          </main>
          <GlassNav activeTab={activeTab} onChangeTab={changeTab} />
          <Toast />
        </>
      )}
    </div>
  );
}
