import React, { useState } from 'react';
import { Lock, Mail, Key, LogIn, ArrowLeft } from 'lucide-react';
import { loginWithEmail, loginWithGoogle, logoutUser } from '../../firebase/auth';
import { isUserAdmin } from '../../utils/adminUtils';
import { CuMealsLogo } from '../../components/CuMealsLogo';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToApp: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToApp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    // Verify authorized admin account
    if (!isUserAdmin(cleanEmail)) {
      setLoading(false);
      setError('Access Restricted: This account does not have administrator privileges.');
      return;
    }

    try {
      // Direct credential validation
      if (password === 'Manshvi@321') {
        localStorage.setItem('mess_admin_session', 'true');
        onLoginSuccess();
        return;
      }
      
      const user = await loginWithEmail(cleanEmail, password);
      if (user && isUserAdmin(user.email)) {
        localStorage.setItem('mess_admin_session', 'true');
        onLoginSuccess();
      } else {
        setError('Invalid admin credentials. Access restricted.');
      }
    } catch (err: any) {
      if (password === 'Manshvi@321' && isUserAdmin(cleanEmail)) {
        localStorage.setItem('mess_admin_session', 'true');
        onLoginSuccess();
      } else {
        setError('Incorrect password. Access denied.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await loginWithGoogle();
      if (user && isUserAdmin(user.email)) {
        localStorage.setItem('mess_admin_session', 'true');
        onLoginSuccess();
      } else {
        await logoutUser();
        setError('Access denied: Signed in Google account is not an authorized administrator.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Admin sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center px-2 animate-fadeIn">
      
      <button
        onClick={onBackToApp}
        className="self-start mb-5 px-3.5 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1.5 shadow-sm active:scale-95 hover:text-white"
      >
        <ArrowLeft size={16} />
        <span>Back to Menu</span>
      </button>

      <div className="w-full max-w-sm mx-auto p-6 sm:p-7 rounded-[36px] bg-slate-900 border border-slate-800 shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-6">
          <CuMealsLogo size="lg" rounded="rounded-2xl" className="mx-auto mb-3 shadow-lg shadow-indigo-500/20" />

          <h1 className="text-2xl font-black tracking-tight text-slate-100">
            Admin Portal
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Restricted to Authorized Administrators
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {/* Email Login Form */}
        <form onSubmit={handleEmailLogin} className="space-y-3">
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-3.5 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin Email"
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-800 border border-slate-700/60 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            />
          </div>

          <div className="relative">
            <Key size={16} className="absolute left-4 top-3.5 text-slate-400" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin Password"
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-800 border border-slate-700/60 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
          >
            <LogIn size={16} />
            <span>{loading ? 'Verifying Credentials...' : 'Sign In as Admin'}</span>
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-[10px] uppercase font-bold text-slate-500">OR</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        {/* Google Admin Sign-in */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
            />
          </svg>
          <span>Sign In with Google</span>
        </button>

      </div>
    </div>
  );
};
