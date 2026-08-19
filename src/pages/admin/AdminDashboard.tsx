import React, { useState } from 'react';
import { LayoutDashboard, Utensils, FileJson, Clock, Bell, LogOut, ArrowLeft, MessageSquare } from 'lucide-react';
import { MenuManager } from './MenuManager';
import { JsonImportExport } from './JsonImportExport';
import { TimingsManager } from './TimingsManager';
import { NoticesManager } from './NoticesManager';
import { FeedbackManager } from './FeedbackManager';
import { logoutUser } from '../../firebase/auth';

interface AdminDashboardProps {
  onLogout: () => void;
  onBackToApp: () => void;
}

type AdminTab = 'menu' | 'feedbacks' | 'json' | 'timings' | 'notices';

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
    { id: 'notices', label: 'Notices', icon: Bell }
  ];

  return (
    <div className="pb-28 animate-fadeIn pt-2 max-w-lg mx-auto">
      
      {/* Top Admin Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBackToApp}
          className="px-3.5 py-2 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 shadow-sm active:scale-95"
        >
          <ArrowLeft size={16} />
          <span>Exit Admin</span>
        </button>

        <div className="text-center">
          <h1 className="text-lg font-bold tracking-tight text-slate-100 flex items-center justify-center gap-1.5">
            <LayoutDashboard size={18} className="text-indigo-400" />
            <span>Admin Portal</span>
          </h1>
        </div>

        <button
          onClick={handleSignOut}
          className="p-2.5 rounded-full bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
          title="Sign Out"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Admin Tab Navigation Pills */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm mb-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;

          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`
                flex-1 min-w-[72px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap
                ${isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
                }
              `}
            >
              <Icon size={14} />
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

    </div>
  );
};
