import React, { useState, useEffect } from 'react';
import {
  MoreHorizontal,
  Bell,
  Info,
  MessageSquare,
  Share2,
  Lock,
  ChevronRight,
  User,
  Heart,
  LogOut,
  Edit3
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { GlassCard } from '../components/GlassCard';
import { InstallPrompt } from '../components/InstallPrompt';
import { NoticeModal } from '../components/NoticeModal';
import { UserProfileModal } from '../components/UserProfileModal';
import { CuMealsLogo } from '../components/CuMealsLogo';
import { useMessConfig } from '../hooks/useMenu';
import { subscribeToAuth } from '../firebase/auth';
import { submitFeedback } from '../firebase/firestore';
import { isUserAdmin } from '../utils/adminUtils';

interface MorePageProps {
  onOpenAdmin: () => void;
}

export const MorePage: React.FC<MorePageProps> = ({ onOpenAdmin }) => {
  const { notices, settings } = useMessConfig();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  const [isNoticeOpen, setIsNoticeOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<'about' | 'feedback' | null>(null);

  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<'food' | 'hygiene' | 'timing' | 'general'>('food');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Hostel Mess Menu App',
        text: 'Check out today\'s hostel mess menu on Mess Menu PWA!',
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;

    setSubmittingFeedback(true);
    try {
      await submitFeedback({
        message: feedbackText.trim(),
        userName: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Hostel Student',
        userEmail: currentUser?.email || undefined,
        category: feedbackCategory
      });
      setFeedbackSent(true);
      setTimeout(() => {
        setFeedbackSent(false);
        setFeedbackText('');
        setActiveModal(null);
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="pb-32 animate-fadeIn pt-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <CuMealsLogo size="md" rounded="rounded-[18px]" />

        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            CuMeals
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Good food, good mood.
          </p>
        </div>
      </div>

      {/* User Auth & Profile Banner */}
      <button
        onClick={() => setIsProfileModalOpen(true)}
        className="w-full text-left mb-4 p-4 rounded-[26px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-100/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-center justify-between active:scale-98"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base border border-indigo-500/20">
            {currentUser ? (
              currentUser.displayName ? currentUser.displayName[0].toUpperCase() : currentUser.email ? currentUser.email[0].toUpperCase() : 'U'
            ) : (
              <User size={20} />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {currentUser ? (currentUser.displayName || 'Student Account') : 'Sign In / Account'}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              {currentUser ? currentUser.email : 'Google & Email Auth • Set Name & Password'}
            </p>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
          {currentUser ? 'Profile' : 'Sign In'}
        </div>
      </button>

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Glass List Options */}
      <div className="space-y-2.5">
        
        {/* Notice Board */}
        <button
          onClick={() => setIsNoticeOpen(true)}
          className="w-full text-left p-4 rounded-[22px] bg-white/70 dark:bg-slate-800/60 border border-white/80 dark:border-slate-800 shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center justify-between active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Bell size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notice Board</p>
              <p className="text-[11px] text-slate-400">View latest mess announcements</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        {/* Feedback */}
        <button
          onClick={() => setActiveModal('feedback')}
          className="w-full text-left p-4 rounded-[22px] bg-white/70 dark:bg-slate-800/60 border border-white/80 dark:border-slate-800 shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center justify-between active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Feedback & Suggestions</p>
              <p className="text-[11px] text-slate-400">Help us improve mess meals</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        {/* About Us */}
        <button
          onClick={() => setActiveModal('about')}
          className="w-full text-left p-4 rounded-[22px] bg-white/70 dark:bg-slate-800/60 border border-white/80 dark:border-slate-800 shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center justify-between active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Info size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">About Hostel Mess</p>
              <p className="text-[11px] text-slate-400">Hygiene, menu rotation & rules</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        {/* Share App */}
        <button
          onClick={handleShare}
          className="w-full text-left p-4 rounded-[22px] bg-white/70 dark:bg-slate-800/60 border border-white/80 dark:border-slate-800 shadow-sm hover:bg-white dark:hover:bg-slate-800 transition-all flex items-center justify-between active:scale-98"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Share2 size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Share App</p>
              <p className="text-[11px] text-slate-400">Share with hostel roommates</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        {/* Admin Portal Button (Restricted to Authorized Admin: 17monusharma@gmail.com) */}
        {isUserAdmin(currentUser?.email) && (
          <div className="pt-3 animate-fadeIn">
            <button
              onClick={onOpenAdmin}
              className="w-full text-left p-4.5 rounded-[24px] bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-600 dark:to-purple-700 text-white shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-between border border-white/20"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner">
                  <Lock size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight">Admin Portal</p>
                  <p className="text-[11px] text-indigo-100 font-medium mt-0.5">Manage daily menus, JSON import & meal timings</p>
                </div>
              </div>
              <div className="p-1.5 rounded-full bg-white/20 text-white">
                <ChevronRight size={18} strokeWidth={2.5} />
              </div>
            </button>
          </div>
        )}

      </div>

      {/* Footer Branding */}
      <div className="mt-8 text-center text-slate-400 dark:text-slate-500">
        <p className="text-xs font-semibold tracking-tight flex items-center justify-center gap-1">
          Made with <Heart size={12} className="text-rose-500 fill-rose-500" /> for Hostel Students
        </p>
        <p className="text-[11px] mt-1">Version 1.0.0 (PWA)</p>
      </div>

      {/* User Profile Auth Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
      />

      {/* Modals */}
      <NoticeModal
        isOpen={isNoticeOpen}
        onClose={() => setIsNoticeOpen(false)}
        notices={notices}
      />

      {/* About Modal */}
      {activeModal === 'about' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm rounded-[32px] bg-slate-900 p-6 text-slate-100 border border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <CuMealsLogo size="sm" rounded="rounded-lg" />
                <h3 className="text-lg font-bold">About CuMeals</h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400">✕</button>
            </div>
            <p className="text-xs leading-relaxed text-slate-300 space-y-2">
              CuMeals provides daily hostel mess schedules, live timings, and meal updates directly on your device.
              <br /><br />
              • Rotational weekly menu updated regularly.<br />
              • Real-time countdown to ongoing and upcoming meals.<br />
              • Direct feedback & suggestion portal to the mess administration.
            </p>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full mt-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {activeModal === 'feedback' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm rounded-[32px] bg-white dark:bg-slate-900 p-6 text-slate-900 dark:text-slate-100 border border-white dark:border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Submit Feedback</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400">✕</button>
            </div>

            {feedbackSent ? (
              <div className="text-center py-6 text-emerald-400 font-bold text-sm">
                ✓ Thank you! Your feedback has been sent directly to the Admin Portal.
              </div>
            ) : (
              <form onSubmit={handleSendFeedback} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                    Feedback Category
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'food', label: '🍲 Food Quality' },
                      { id: 'hygiene', label: '✨ Cleanliness' },
                      { id: 'timing', label: '⏰ Timings' },
                      { id: 'general', label: '💡 General Suggestion' }
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFeedbackCategory(cat.id as any)}
                        className={`p-2 rounded-xl text-xs font-semibold text-left transition-all ${
                          feedbackCategory === cat.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                    Your Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Share details on meal taste, quantity, hygiene, or requested menu items..."
                    className="w-full p-3.5 rounded-2xl bg-slate-800 border border-slate-700/60 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingFeedback}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {submittingFeedback ? 'Sending...' : 'Submit to Admin Portal'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
