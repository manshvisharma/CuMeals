import React, { useState, useEffect } from 'react';
import { MenuPage } from './pages/MenuPage';
import { TimingsPage } from './pages/TimingsPage';
import { TimepassPage } from './pages/TimepassPage';
import { MorePage } from './pages/MorePage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLogin } from './pages/admin/AdminLogin';
import { BottomNav } from './components/BottomNav';
import { SwipeableViews } from './components/SwipeableViews';
import { MandatoryAuthScreen } from './components/MandatoryAuthScreen';
import { ActiveTab } from './types';
import { getTodayString } from './utils/dateUtils';
import { subscribeToAuth } from './firebase/auth';
import { useTheme } from './hooks/useTheme';
import { isUserAdmin } from './utils/adminUtils';
import { User } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('menu');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [isAdminView, setIsAdminView] = useState<boolean>(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('mess_admin_session') === 'true';
  });

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);

  // Initialize Theme hook to ensure document.documentElement dark mode class
  useTheme();

  useEffect(() => {
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

  return (
    <div className="min-h-screen flex justify-center items-start sm:py-6 sm:px-4 bg-[#07090E] text-slate-100">
      {/* Mandatory Auth Lock Screen if not signed in */}
      {authInitialized && !user && !isAdminView && (
        <MandatoryAuthScreen onSuccess={() => {}} />
      )}

      {/* Responsive Container - Wide Desktop/Laptop for Admin, Compact Mobile for Student App */}
      <div className={`w-full ${
        isAdminView
          ? 'max-w-6xl min-h-screen sm:min-h-[880px] sm:rounded-[32px] px-4 sm:px-8 pt-6 pb-12'
          : 'max-w-md min-h-screen sm:min-h-[844px] sm:max-h-[92vh] sm:rounded-[40px] px-5 pt-6 pb-24'
      } bg-[#0B0F19] text-slate-100 sm:border sm:border-slate-800/80 sm:shadow-2xl relative flex flex-col justify-between overflow-y-auto no-scrollbar transition-all duration-300`}>
        
        {/* Main Application Body */}
        <main className="flex-1 w-full overflow-hidden">
          {isAdminView ? (
            isAdminLoggedIn ? (
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
            )
          ) : (
            <SwipeableViews
              activeTab={activeTab}
              onChangeTab={setActiveTab}
            >
              {{
                menu: (
                  <MenuPage
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                  />
                ),
                timings: <TimingsPage />,
                timepass: <TimepassPage currentUser={user} />,
                more: (
                  <MorePage
                    onOpenAdmin={() => setIsAdminView(true)}
                  />
                )
              }}
            </SwipeableViews>
          )}
        </main>

        {/* Floating Bottom Navigation Bar (Hidden when in Admin Portal) */}
        {!isAdminView && (
          <BottomNav
            activeTab={activeTab}
            onChangeTab={setActiveTab}
          />
        )}

      </div>
    </div>
  );
}
