import React, { useState } from 'react';
import { X, User as UserIcon, Lock, Mail, Key, LogOut, Check, Sparkles, Shield, Edit3 } from 'lucide-react';
import { User } from 'firebase/auth';
import {
  loginWithEmail,
  signUpWithEmail,
  loginWithGoogle,
  logoutUser,
  updateUserDisplayName,
  updateUserPassword
} from '../firebase/auth';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Editing profile states
  const [newDisplayName, setNewDisplayName] = useState(currentUser?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (authMode === 'signup') {
        await signUpWithEmail(email, password, displayName);
        setMessage({ text: 'Account created successfully!', type: 'success' });
      } else {
        await loginWithEmail(email, password);
        setMessage({ text: 'Logged in successfully!', type: 'success' });
      }
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      setMessage({ text: err.message || 'Authentication failed.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await loginWithGoogle();
      setMessage({ text: 'Signed in with Google!', type: 'success' });
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        const currentHost = window.location.hostname;
        setMessage({
          text: `Google Auth requires authorizing "${currentHost}" in Firebase Console → Authentication → Settings → Authorized domains. Please use Email/Password login.`,
          type: 'error'
        });
      } else {
        setMessage({ text: err.message || 'Google sign-in failed.', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!newDisplayName.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      await updateUserDisplayName(newDisplayName);
      setMessage({ text: 'Name updated successfully!', type: 'success' });
      setIsEditingName(false);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update name.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await updateUserPassword(newPassword);
      setMessage({ text: 'Password changed successfully!', type: 'success' });
      setIsChangingPass(false);
      setNewPassword('');
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update password. Re-login required.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    localStorage.removeItem('mess_demo_admin');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm rounded-[36px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white dark:border-slate-800 shadow-2xl p-6 text-slate-900 dark:text-slate-100 animate-scaleUp max-h-[90vh] overflow-y-auto no-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <UserIcon size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                {currentUser ? 'User Profile' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentUser ? currentUser.email : 'Access personalized mess features'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
          }`}>
            <Sparkles size={14} />
            <span>{message.text}</span>
          </div>
        )}

        {/* LOGGED IN VIEW */}
        {currentUser ? (
          <div className="space-y-4">
            
            {/* User Details Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-extrabold flex items-center justify-center text-lg shadow-md">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                    {currentUser.displayName || 'Hostel Student'}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-400 truncate">
                    {currentUser.email}
                  </p>
                </div>
              </div>

              {/* Set/Edit Display Name */}
              {!isEditingName ? (
                <button
                  onClick={() => {
                    setNewDisplayName(currentUser.displayName || '');
                    setIsEditingName(true);
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-between border border-slate-200 dark:border-slate-600 hover:bg-slate-100"
                >
                  <span className="flex items-center gap-1.5">
                    <Edit3 size={14} />
                    <span>Change Display Name</span>
                  </span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400">Edit</span>
                </button>
              ) : (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveName}
                      disabled={loading}
                      className="flex-1 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                    >
                      Save Name
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Change Password */}
              {!isChangingPass ? (
                <button
                  onClick={() => setIsChangingPass(true)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-between border border-slate-200 dark:border-slate-600 hover:bg-slate-100"
                >
                  <span className="flex items-center gap-1.5">
                    <Lock size={14} />
                    <span>Change Password</span>
                  </span>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400">Update</span>
                </button>
              ) : (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password (min 6 chars)"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSavePassword}
                      disabled={loading}
                      className="flex-1 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                    >
                      Update Password
                    </button>
                    <button
                      onClick={() => setIsChangingPass(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="w-full py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-2 border border-rose-500/20 active:scale-98 transition-all"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>

          </div>
        ) : (
          /* NOT LOGGED IN VIEW */
          <div className="space-y-4">
            
            {/* Auth Mode Toggle */}
            <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
              <button
                onClick={() => setAuthMode('signin')}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  authMode === 'signin'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  authMode === 'signup'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Google Login Button */}
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-[10px] uppercase font-bold text-slate-400">OR</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {authMode === 'signup' && (
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Student Email"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="relative">
                <Key size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-98 transition-all"
              >
                {loading ? 'Processing...' : authMode === 'signin' ? 'Sign In' : 'Register Account'}
              </button>
            </form>

          </div>
        )}

      </div>
    </div>
  );
};
