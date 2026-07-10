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
    <div className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-br from-[#0f172a] via-[#1e1e38] to-[#0b0f19] p-4 font-sans select-none relative overflow-hidden">
      {/* Decorative background glow circles */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-sky-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-[100px] pointer-events-none" />

      {/* Main Content Row */}
      <div className="flex-1 flex items-center justify-center w-full z-10">
        {/* Outer Row Container */}
        <div className="flex flex-col lg:flex-row items-center justify-between w-full max-w-[1000px] gap-12 px-4 my-8">
          
          {/* Left Side: Welcome branding */}
          <div className="flex-1 flex flex-col justify-center text-left max-w-[500px]">
            
            {/* Integrated Share Code Button Card */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => router.push('/share-code')}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-700/60 bg-slate-900/40 hover:bg-slate-900/80 backdrop-blur-md text-left transition duration-200 hover:border-sky-500/40 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] group"
                style={{ cursor: 'pointer' }}
              >
                <div className="text-sky-400 bg-sky-500/10 p-2 rounded-lg group-hover:scale-105 transition-transform duration-200">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6" />
                    <path d="M10 14L21 3" />
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  </svg>
                </div>
                <div>
                  <div className="text-white font-extrabold text-xs tracking-wider">Share Code</div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">No Login Required</div>
                </div>
                <span className="text-sky-300/40 text-xs ml-1 group-hover:text-sky-300 transition-colors duration-200">✦</span>
              </button>
              <span className="text-amber-300 text-sm animate-pulse ml-1">✦✦</span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <img
                src="/logo.png"
                alt="CodeDiary Logo"
                className="h-10 w-10 rounded-xl object-contain shadow-lg shadow-sky-500/10 bg-slate-950/40 p-1 border border-slate-800"
              />
              <span className="text-sky-400 font-bold tracking-widest text-xs uppercase">Welcome to</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
              Code <span className="bg-gradient-to-r from-sky-400 to-purple-400 bg-clip-text text-transparent">Diary</span>
            </h1>
            <p className="text-slate-300 text-base leading-relaxed mb-8">
              A premium LMS & productivity dashboard for developers. Structure your curriculum topics, build custom learning questions, save template solutions, and compile your notes in a clean workspace.
            </p>
            
            {/* Slogan bullets */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-sky-500/20 text-sky-400 p-1.5 rounded-lg border border-sky-500/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Curriculum & Topics</h4>
                  <p className="text-slate-400 text-xs mt-0.5">Structure topics, track difficulty levels, and add learning questions.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 bg-violet-500/20 text-violet-400 p-1.5 rounded-lg border border-violet-500/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Code Snippets Storage</h4>
                  <p className="text-slate-400 text-xs mt-0.5">Save starter code templates, solutions, and explanations in-app.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 bg-indigo-500/20 text-indigo-400 p-1.5 rounded-lg border border-indigo-500/20">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">Daily Activity Metrics</h4>
                  <p className="text-slate-400 text-xs mt-0.5">Review your progress logs, streak calendars, and learning analytics.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: The Login Card */}
          <div className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all">
            {/* Glowing top line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />

            {/* Card Header & Brand Branding */}
            <div className="flex flex-col items-center text-center mb-6">
              <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                {isRegisterMode ? 'Enroll Account' : 'Sign In'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isRegisterMode ? 'Request student account enrollment' : 'LMS & productivity dashboard for developers'}
              </p>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex rounded-lg bg-slate-950/40 p-1 mb-6 border border-slate-800/60">
              <button
                type="button"
                className={`flex-1 rounded-md py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${!isRegisterMode ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/10' : 'text-slate-400 hover:text-slate-200'}`}
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
                className={`flex-1 rounded-md py-2 text-xs font-semibold tracking-wide transition-all cursor-pointer ${isRegisterMode ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/10' : 'text-slate-400 hover:text-slate-200'}`}
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
              <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 mb-6">
                <svg className="h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Success Alert Box */}
            {success && (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400 mb-6">
                <svg className="h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            {/* Login/Register Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase" htmlFor="username">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="username"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-3 pl-10 pr-4 text-slate-100 placeholder-slate-500 outline-none transition duration-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:shadow-[0_0_15px_rgba(56,189,248,0.08)]"
                    placeholder={isRegisterMode ? "Choose a username" : "Enter username "}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError('');
                    }}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-3 pl-10 pr-10 text-slate-100 placeholder-slate-500 outline-none transition duration-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:shadow-[0_0_15px_rgba(56,189,248,0.08)]"
                    placeholder={isRegisterMode ? "Choose a password" : "Enter password "}
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
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none"
                    style={{ cursor: 'pointer' }}
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
              <div className="flex items-center justify-between text-xs mt-1">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-slate-800 bg-slate-950/60 text-sky-500 focus:ring-0 focus:ring-offset-0 h-4 w-4 transition duration-200"
                    style={{ cursor: 'pointer' }}
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Password reset is managed by the administrator. Please contact Rahul Ranjan to reset your password.');
                  }}
                  className="text-sky-500 hover:text-sky-400 font-semibold transition-colors duration-200"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 py-3 font-semibold text-white transition duration-200 active:scale-[0.98] shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 flex items-center justify-center relative cursor-pointer group"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{isRegisterMode ? 'Submitting request...' : 'Authorizing...'}</span>
                  </div>
                ) : (
                  <>
                    <span>{isRegisterMode ? 'Submit Enrollment' : 'Sign In'}</span>
                    <div className="absolute right-4 bg-white/20 p-1.5 rounded-full group-hover:translate-x-1 transition-transform duration-200">
                      <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </div>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-[1000px] border-t border-slate-800/80 pt-6 pb-4 mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 z-10">
        <span>Made with ❤️ for learners by <strong>Rahul Ranjan</strong></span>
        <a 
          href="https://www.linkedin.com/in/rahul-ranjan-6b2ab424a/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center bg-[#0a66c2] text-white px-2.5 py-1 rounded text-[10px] font-semibold gap-1.5 transition hover:opacity-90"
        >
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
          </svg>
          LinkedIn
        </a>
      </footer>
    </div>
  );
};

export default Login;
