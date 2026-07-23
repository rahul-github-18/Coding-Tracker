"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/api';

const Login = () => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if already logged in
    if (localStorage.getItem('isLoggedIn') === 'true') {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isRegisterMode) {
        // Register (Enrollment request)
        const response = await authService.register(username, password);
        setSuccess(response.message || 'Registration successful! Wait for admin approval.');
        setIsRegisterMode(false);
        setUsername('');
        setPassword('');
      } else {
        // Login
        const user = await authService.login(username, password);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userId', user.id.toString());
        localStorage.setItem('userRole', user.role);
        localStorage.setItem('currentUser', JSON.stringify(user));

        router.replace('/');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-slate-950 p-4 font-sans select-none text-slate-200">
      {/* Main Content Row */}
      <div className="flex-1 flex items-center justify-center w-full z-10">
        {/* Outer Container */}
        <div className="flex flex-col lg:flex-row items-center justify-between w-full max-w-[960px] gap-12 px-4 my-10">
          
          {/* Left Side: Welcome branding */}
          <div className="flex-1 flex flex-col justify-center text-left max-w-[480px]">
            
            {/* Share Code Link */}
            <div className="mb-6">
              <button
                onClick={() => router.push('/share-code')}
                className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-slate-800 bg-slate-900/80 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition duration-150 cursor-pointer"
              >
                <svg className="h-4 w-4 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6" />
                  <path d="M10 14L21 3" />
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                </svg>
                <span>Share Code</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 font-normal">No Login Required</span>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <img
                src="/logo.png"
                alt="CodeDiary Logo"
                className="h-9 w-9 rounded-lg object-contain bg-slate-900 p-1 border border-slate-800"
              />
              <span className="text-slate-400 font-medium text-sm">Code Diary</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
              Your developer learning & productivity workspace
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Structure curriculum topics, save code snippets, practice questions, and track your daily coding progress in one structured dashboard.
            </p>
            
            {/* Feature bullets */}
            <div className="flex flex-col gap-3.5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-sky-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-slate-200 font-medium text-xs sm:text-sm">Curriculum & Topic Management</h4>
                  <p className="text-slate-400 text-xs">Organize topics, set difficulty levels, and maintain learning questions.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-sky-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-slate-200 font-medium text-xs sm:text-sm">Code Snippets & Templates</h4>
                  <p className="text-slate-400 text-xs">Store re-usable starter code, solution notes, and reference implementations.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-sky-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-slate-200 font-medium text-xs sm:text-sm">Daily Activity Metrics</h4>
                  <p className="text-slate-400 text-xs">Monitor streaks, review progress logs, and track learning momentum.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: The Login Card */}
          <div className="w-full max-w-[400px] rounded-xl border border-slate-800 bg-slate-900/90 p-7 shadow-xl">
            {/* Card Header */}
            <div className="text-left mb-6">
              <h2 className="text-xl font-semibold text-white">
                {isRegisterMode ? 'Create Account' : 'Welcome back'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isRegisterMode ? 'Submit account request for enrollment' : 'Enter your credentials to access your workspace'}
              </p>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex rounded-lg bg-slate-950 p-1 mb-6 border border-slate-800/80 text-xs font-medium">
              <button
                type="button"
                className={`flex-1 rounded-md py-1.5 text-center transition cursor-pointer ${!isRegisterMode ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                onClick={() => {
                  setIsRegisterMode(false);
                  setError('');
                  setSuccess('');
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md py-1.5 text-center transition cursor-pointer ${isRegisterMode ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                onClick={() => {
                  setIsRegisterMode(true);
                  setError('');
                  setSuccess('');
                }}
              >
                Enroll User
              </button>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="flex items-center gap-2.5 rounded-lg border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300 mb-5">
                <svg className="h-4 w-4 shrink-0 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Success Alert Box */}
            {success && (
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-900/50 bg-emerald-950/40 p-3 text-xs text-emerald-300 mb-5">
                <svg className="h-4 w-4 shrink-0 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            {/* Login/Register Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-300" htmlFor="username">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 px-3.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20"
                  placeholder={isRegisterMode ? "Choose a username" : "Enter username"}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  disabled={loading}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-300" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 pl-3.5 pr-10 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20"
                    placeholder={isRegisterMode ? "Choose a password" : "Enter password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs mt-0.5">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-0 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Password reset is managed by the administrator. Please contact the administrator to reset your password.');
                  }}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="w-full mt-2 rounded-lg bg-sky-600 hover:bg-sky-500 py-2.5 font-medium text-sm text-white transition duration-150 cursor-pointer disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{isRegisterMode ? 'Submitting...' : 'Signing in...'}</span>
                  </div>
                ) : (
                  <span>{isRegisterMode ? 'Submit Enrollment' : 'Sign In'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-[960px] border-t border-slate-800/80 pt-5 pb-3 flex items-center justify-between text-xs text-slate-400">
        <span>Copyright © 2026 All Rights Reserved</span>
        <a 
          href="https://www.linkedin.com/in/rahul-ranjan-6b2ab424a/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition"
        >
          <svg className="h-3.5 w-3.5 text-[#0a66c2]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
          </svg>
          <span>LinkedIn</span>
        </a>
      </footer>
    </div>
  );
};

export default Login;

