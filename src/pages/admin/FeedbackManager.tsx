import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, Clock, Trash2, Search, Filter, RefreshCw, Mail, User, Sparkles, CheckCheck } from 'lucide-react';
import { FeedbackItem } from '../../types';
import { fetchFeedbacks, updateFeedbackStatus, deleteFeedback } from '../../firebase/firestore';

export const FeedbackManager: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'reviewed' | 'resolved'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const data = await fetchFeedbacks();
      setFeedbacks(data);
    } catch (err) {
      console.error('Error loading feedbacks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const handleStatusChange = async (id: string, newStatus: 'new' | 'reviewed' | 'resolved') => {
    setActionInProgress(id);
    try {
      await updateFeedbackStatus(id, newStatus);
      setFeedbacks(prev => prev.map(fb => fb.id === id ? { ...fb, status: newStatus } : fb));
    } catch (err) {
      console.error(err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this feedback entry?')) return;
    setActionInProgress(id);
    try {
      await deleteFeedback(id);
      setFeedbacks(prev => prev.filter(fb => fb.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setActionInProgress(null);
    }
  };

  const filtered = feedbacks.filter(fb => {
    const matchesFilter = filterStatus === 'all' || (fb.status || 'new') === filterStatus;
    const matchesSearch = searchTerm === '' ||
      fb.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fb.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fb.userEmail && fb.userEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case 'food':
        return <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold">🍲 Food Quality</span>;
      case 'hygiene':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">✨ Hygiene</span>;
      case 'timing':
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">⏰ Timings</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">💡 Suggestion</span>;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'resolved':
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-extrabold text-[10px] flex items-center gap-1">✓ Resolved</span>;
      case 'reviewed':
        return <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-extrabold text-[10px] flex items-center gap-1">👀 Reviewed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-extrabold text-[10px] flex items-center gap-1">● New</span>;
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  const newCount = feedbacks.filter(f => !f.status || f.status === 'new').length;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <MessageSquare size={18} className="text-indigo-400" />
            <span>Student Feedback & Suggestions</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Review student complaints, food feedback & menu requests
          </p>
        </div>

        <button
          onClick={loadFeedbacks}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
          title="Refresh Feedbacks"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: `All (${feedbacks.length})` },
            { id: 'new', label: `New (${newCount})` },
            { id: 'reviewed', label: 'Reviewed' },
            { id: 'resolved', label: 'Resolved' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as any)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterStatus === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[150px]">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search student / feedback..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-800 border-none text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Feedbacks List */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-slate-800/60 animate-pulse border border-slate-700/50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800/80">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center mb-2.5">
            <MessageSquare size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-200 mb-1">
            {searchTerm || filterStatus !== 'all' ? 'No Matching Feedback' : 'No Feedback Received Yet'}
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {searchTerm || filterStatus !== 'all'
              ? 'Try changing your search query or filter criteria.'
              : 'Student feedback and suggestions submitted in the app will appear here instantly.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const isPending = actionInProgress === item.id;
            const currentStatus = item.status || 'new';

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5 shadow-sm"
              >
                {/* Header row: Author + Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                        <User size={13} className="text-indigo-400" />
                        {item.userName}
                      </span>
                      {item.userEmail && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          • {item.userEmail}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                      {formatTimestamp(item.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {getCategoryBadge(item.category)}
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                {/* Message Body */}
                <div className="p-3 rounded-xl bg-slate-800/80 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap border border-slate-700/40">
                  {item.message}
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    {currentStatus !== 'reviewed' && (
                      <button
                        onClick={() => handleStatusChange(item.id, 'reviewed')}
                        disabled={isPending}
                        className="px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/80 border border-indigo-800/50 text-[11px] font-bold transition-all disabled:opacity-50"
                      >
                        Mark Reviewed
                      </button>
                    )}
                    {currentStatus !== 'resolved' && (
                      <button
                        onClick={() => handleStatusChange(item.id, 'resolved')}
                        disabled={isPending}
                        className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/80 border border-emerald-800/50 text-[11px] font-bold transition-all disabled:opacity-50"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {currentStatus !== 'new' && (
                      <button
                        onClick={() => handleStatusChange(item.id, 'new')}
                        disabled={isPending}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-medium transition-all disabled:opacity-50"
                      >
                        Reset to New
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/50 transition-all disabled:opacity-50"
                    title="Delete Feedback"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
