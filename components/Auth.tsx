import React, { useState } from 'react';
import { authService } from '../services/auth';
import { db } from '../services/db';
import { Pill, User, Lock, ArrowRight, HelpCircle, CheckCircle, ArrowLeft } from 'lucide-react';

interface AuthProps {
  onLogin: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Only for signup
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setName('');
    setError('');
    setSuccessMsg('');
  };

  const handleSwitch = (newView: 'login' | 'register' | 'forgot') => {
    resetForm();
    setView(newView);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (view === 'login') {
      const user = authService.login(username, password);
      if (user) {
        onLogin();
      } else {
        setError('Invalid credentials');
      }
    } else if (view === 'register') {
      const success = authService.register({
        username,
        passwordHash: password,
        name,
        role: 'pharmacist' // Default role for self-signup
      });
      if (success) {
        // Log message for admin
        db.addMessage({
          type: 'user',
          title: 'New User Registration',
          content: `User '${username}' (${name}) has registered as a Pharmacist.`,
          relatedUserId: username // loosely coupled via username for now, or fetch user to get ID
        });

        const user = authService.login(username, password);
        if (user) onLogin();
      } else {
        setError('Username already taken');
      }
    } else if (view === 'forgot') {
      const success = authService.requestPasswordReset(username);
      if (success) {
        // Log message for admin
        db.addMessage({
          type: 'security',
          title: 'Password Reset Request',
          content: `User '${username}' has requested a password reset.`,
          relatedUserId: username
        });
        setSuccessMsg('Request sent to Administrator. Please contact them to reset your password.');
      } else {
        setError('Username not found');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        <div className="p-8 w-full">
          <div className="flex items-center gap-2 mb-8 text-blue-600">
            <Pill size={32} />
            <h1 className="text-2xl font-bold tracking-tight">HMWTECH.LTD Pharma</h1>
          </div>

          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {view === 'login' && 'Welcome Back'}
            {view === 'register' && 'Create Account'}
            {view === 'forgot' && 'Reset Password'}
          </h2>
          <p className="text-slate-500 mb-6 text-sm">
            {view === 'login' && 'Enter your credentials to access the terminal.'}
            {view === 'register' && 'Register a new pharmacist account.'}
            {view === 'forgot' && 'Enter your username to notify the administrator.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name - Register Only */}
            {view === 'register' && (
               <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            {/* Username - All Views */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin"
                />
              </div>
            </div>

            {/* Password - Login & Register Only */}
            {view !== 'forgot' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {/* Messages */}
            {error && <p className="text-red-500 text-sm flex items-center gap-1"><ArrowRight size={14}/> {error}</p>}
            {successMsg && <p className="text-emerald-600 text-sm flex items-center gap-1"><CheckCircle size={14}/> {successMsg}</p>}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!!successMsg}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              <span>
                {view === 'login' && 'Sign In'}
                {view === 'register' && 'Register'}
                {view === 'forgot' && 'Request Reset'}
              </span>
              {view !== 'forgot' && <ArrowRight size={18} />}
            </button>
          </form>

          {/* Navigation Links */}
          <div className="mt-6 flex flex-col space-y-2 text-center text-sm">
            {view === 'login' && (
              <>
                <button onClick={() => handleSwitch('register')} className="text-blue-600 hover:underline">
                  Don't have an account? Sign up
                </button>
                <button onClick={() => handleSwitch('forgot')} className="text-slate-400 hover:text-slate-600">
                  Forgot Password?
                </button>
              </>
            )}
            
            {view === 'register' && (
              <button onClick={() => handleSwitch('login')} className="text-blue-600 hover:underline">
                Already have an account? Sign in
              </button>
            )}

            {view === 'forgot' && (
              <button onClick={() => handleSwitch('login')} className="text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1">
                <ArrowLeft size={14} /> Back to Login
              </button>
            )}
          </div>
          
          <div className="mt-8 text-xs text-slate-400 text-center">
            <p>Default Admin: user: <b>admin</b> pass: <b>admin123</b></p>
          </div>
        </div>
      </div>
    </div>
  );
};