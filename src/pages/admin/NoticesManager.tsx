import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Calendar, AlertCircle, BellRing, Send } from 'lucide-react';
import { fetchNotices, saveNotice, deleteNotice } from '../../firebase/firestore';
import { getAllPushSubscribers } from '../../utils/pushNotifications';
import { NoticeItem } from '../../types';
import { getTodayString } from '../../utils/dateUtils';

export const NoticesManager: React.FC = () => {
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Notice Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high'>('normal');
  const [sendPush, setSendPush] = useState(true);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

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

    // Send push notification if checked
    if (sendPush) {
      try {
        const subs = await getAllPushSubscribers();
        if (subs.length > 0) {
          await fetch('/api/send-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscriptions: subs,
              title: `📢 ${title}`,
              body: content.slice(0, 120),
              url: '/'
            })
          });
          setPushStatus(`Sent push alert to ${subs.length} student device(s)`);
          setTimeout(() => setPushStatus(null), 4000);
        }
      } catch (err) {
        console.error('Push notification failed on notice creation', err);
      }
    }

    setTitle('');
    setContent('');
    loadNotices();
  };

  const handleDelete = async (id: string) => {
    await deleteNotice(id);
    loadNotices();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
      
      {/* Create Notice Form */}
      <div className="lg:col-span-5 p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-sm h-fit">
        <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
          <Bell size={16} className="text-indigo-400" />
          <span>Post New Notice</span>
        </h3>

        <form onSubmit={handleAddNotice} className="space-y-3">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notice Title (e.g. Special Sunday Feast)"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
          />

          <textarea
            rows={4}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Notice Announcement details..."
            className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          />

          {/* Push Broadcast Checkbox */}
          <div className="flex items-center gap-2 pt-1 px-1">
            <input
              type="checkbox"
              id="sendPushCheckbox"
              checked={sendPush}
              onChange={(e) => setSendPush(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
            />
            <label htmlFor="sendPushCheckbox" className="text-xs text-slate-300 font-semibold cursor-pointer flex items-center gap-1.5">
              <BellRing size={13} className="text-indigo-400" />
              <span>Broadcast lock-screen push to student devices</span>
            </label>
          </div>

          {pushStatus && (
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 font-medium flex items-center gap-2">
              <Send size={13} />
              <span>{pushStatus}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 outline-none"
            >
              <option value="normal">Normal Priority</option>
              <option value="high">High Priority (Highlighted)</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Plus size={14} />
              <span>Publish Notice</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Notices List */}
      <div className="lg:col-span-7 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Active Notices ({notices.length})
        </h3>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs">Loading notices...</div>
        ) : notices.length > 0 ? (
          notices.map((n) => (
            <div
              key={n.id}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-3 shadow-sm"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-100">{n.title}</span>
                  {n.priority === 'high' && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30">
                      HIGH PRIORITY
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-2 whitespace-pre-wrap">{n.content}</p>

                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Calendar size={10} />
                  Posted: {n.date}
                </span>
              </div>

              <button
                onClick={() => handleDelete(n.id)}
                className="p-2 rounded-xl text-rose-400 hover:bg-rose-950/40 transition-colors"
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
