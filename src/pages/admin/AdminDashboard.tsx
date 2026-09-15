import React, { useState } from 'react';
import { LayoutDashboard, Utensils, FileJson, Clock, Bell, LogOut, ArrowLeft, MessageSquare, BellRing } from 'lucide-react';
import { MenuManager } from './MenuManager';
import { JsonImportExport } from './JsonImportExport';
import { TimingsManager } from './TimingsManager';
import { NoticesManager } from './NoticesManager';
import { FeedbackManager } from './FeedbackManager';
import { PushNotificationManager } from './PushNotificationManager';
import { logoutUser } from '../../firebase/auth';

interface AdminDashboardProps {
  onLogout: () => void;
  onBackToApp: () => void;
}

type AdminTab = 'menu' | 'feedbacks' | 'json' | 'timings' | 'notices' | 'push';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onBackToApp }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('menu');

  const handleSignOut = async () => {
    localStorage.removeItem('mess_admin_session');
    await logoutUser();
    onLogout();
  };

  const tabs: { id: AdminTab; label: string; icon: React.FC<{ size?: number }> }[] = [
    { id: 'menu', label: 'Menu', icon: Utensils },
    { id: 'feedbacks', label: 'Feedback', icon: MessageSquare },
    { id: 'json', label: 'Import/Export', icon: FileJson },
    { id: 'timings', label: 'Timings', icon: Clock },
    { id: 'notices', label: 'Notices', icon: Bell },
    { id: 'push', label: 'Push Broadcast', icon: BellRing }
  ];

  return (
    <div className="pb-16 animate-fadeIn pt-2 w-full max-w-5xl mx-auto">
      
      {/* Top Admin Bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
        <button
          onClick={onBackToApp}
          className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-xs font-bold text-slate-300 flex items-center gap-2 shadow-sm transition-all active:scale-95"
        >
          <ArrowLeft size={16} />
          <span>Exit Admin Portal</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <LayoutDashboard size={18} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-100 leading-tight">
              CuMeals Admin Portal
            </h1>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Manage weekly day menus, timings, feedback & notices
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-rose-500/20"
          title="Sign Out"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>

      {/* Admin Tab Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm mb-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;

          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`
                flex-1 min-w-[90px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap
                ${isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }
              `}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      {activeTab === 'menu' && <MenuManager />}
      {activeTab === 'feedbacks' && <FeedbackManager />}
      {activeTab === 'json' && <JsonImportExport />}
      {activeTab === 'timings' && <TimingsManager />}
      {activeTab === 'notices' && <NoticesManager />}
      {activeTab === 'push' && <PushNotificationManager />}

    </div>
  );
};
