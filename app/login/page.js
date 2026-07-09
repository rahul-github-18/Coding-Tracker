"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if already logged in
    if (localStorage.getItem('isLoggedIn') === 'true') {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate a tiny loading delay for a more premium/secure authentication feel
    setTimeout(() => {
      if (username === 'admin' && password === 'admin@123') {
        localStorage.setItem('isLoggedIn', 'true');
        router.replace('/');
      } else {
        setError('Invalid username or password. Please verify credentials.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e1e38] to-[#0b0f19] p-4 font-sans select-none">
      {/* Decorative background glow circles */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-sky-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-[100px] pointer-events-none" />

      {/* Main Glass Login Card */}
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all">

        {/* Glowing top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />

        {/* Card Header & Brand Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg shadow-sky-500/20 mb-4">
            <svg
              className="h-6 w-6 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            CodeDiary
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Secure developer notebook & notes portal
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 mb-6 animate-pulse">
            <svg className="h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase" htmlFor="username">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                id="username"
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-3 pl-4 pr-4 text-slate-100 placeholder-slate-500 outline-none transition duration-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:shadow-[0_0_15px_rgba(56,189,248,0.08)]"
                placeholder="Enter admin username"
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
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase" htmlFor="password">
                Password
              </label>
              <span className="text-xs text-sky-400 hover:text-sky-300 cursor-pointer transition">
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <input
                type="password"
                id="password"
                className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-3 pl-4 pr-4 text-slate-100 placeholder-slate-500 outline-none transition duration-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 focus:shadow-[0_0_15px_rgba(56,189,248,0.08)]"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                disabled={loading}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 py-3 font-semibold text-white transition duration-200 active:scale-[0.98] shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Authorizing...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Demo Access Tips Banner
        <div className="mt-8 rounded-lg bg-slate-950/40 p-3 border border-slate-800/60 text-xs text-slate-500 text-center flex flex-col gap-1">
          <div>
            <span className="font-semibold text-slate-400">Demo Access Credentials:</span>
          </div>
          <div className="font-mono text-slate-400 tracking-wider">
            admin <span className="text-slate-600">/</span> admin@123
          </div>
        </div> */}

      </div>
    </div>
  );
};

export default Login;
