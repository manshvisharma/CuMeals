import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { fetchNotices, saveNotice, deleteNotice } from '../../firebase/firestore';
import { NoticeItem } from '../../types';
import { getTodayString } from '../../utils/dateUtils';

export const NoticesManager: React.FC = () => {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Notice Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');

  const loadNotices = async () => {
    setLoading(true);
    const data = await fetchNotices();
    setNotices(data);
    setLoading(false);
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const handleAddNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    const newNotice: NoticeItem = {
      id: `notice_${Date.now()}`,
      title,
      content,
      date: getTodayString(),
      priority,
      active: true
    };

    await saveNotice(newNotice);
    setTitle('');
    setContent('');
    loadNotices();
  };

  const handleDelete = async (id: string) => {
    await deleteNotice(id);
    loadNotices();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Create Notice Form */}
      <div className="p-5 rounded-[28px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-slate-800 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
          <Bell size={16} />
          <span>Post New Notice</span>
        </h3>

        <form onSubmit={handleAddNotice} className="space-y-3">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notice Title (e.g. Special Sunday Feast)"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
          />

          <textarea
            rows={3}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Notice Announcement details..."
            className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          />

          <div className="flex items-center justify-between">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="normal">Normal Priority</option>
              <option value="high">High Priority (Highlighted)</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Plus size={14} />
              <span>Publish Notice</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Notices List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Active Notices
        </h3>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs">Loading notices...</div>
        ) : notices.length > 0 ? (
          notices.map((n) => (
            <div
              key={n.id}
              className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-white dark:border-slate-800 flex items-start justify-between gap-3 shadow-sm"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{n.title}</span>
                  {n.priority === 'high' && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                      HIGH
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">{n.content}</p>

                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Calendar size={10} />
                  Posted: {n.date}
                </span>
              </div>

              <button
                onClick={() => handleDelete(n.id)}
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Delete Notice"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400 italic px-1">No active notices.</p>
        )}
      </div>

    </div>
  );
};
