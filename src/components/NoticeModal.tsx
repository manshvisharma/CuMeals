import React from 'react';
import { X, Bell, AlertCircle, Info, Calendar } from 'lucide-react';
import { NoticeItem } from '../types';

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  notices: NoticeItem[];
}

export const NoticeModal: React.FC<NoticeModalProps> = ({
  isOpen,
  onClose,
  notices
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm rounded-[32px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white dark:border-slate-800 shadow-2xl p-6 text-slate-900 dark:text-slate-100 animate-scaleUp max-h-[80vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Notice Board</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Announcements & Updates</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Notices List */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-3.5">
          {notices.length > 0 ? (
            notices.map((notice) => (
              <div
                key={notice.id}
                className={`p-4 rounded-[20px] border transition-all ${
                  notice.priority === 'high' || notice.priority === 'urgent'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100'
                    : 'bg-white/60 dark:bg-slate-800/40 border-white/80 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {notice.priority === 'high' ? (
                      <AlertCircle size={15} className="text-amber-500 shrink-0" />
                    ) : (
                      <Info size={15} className="text-indigo-500 shrink-0" />
                    )}
                    <h3 className="text-sm font-bold tracking-tight">{notice.title}</h3>
                  </div>

                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                    <Calendar size={10} />
                    {notice.date}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {notice.content}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              No active notices at this time.
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full mt-2 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
        >
          Close
        </button>

      </div>
    </div>
  );
};
