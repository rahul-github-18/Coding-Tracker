"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Editor from '@monaco-editor/react';
import Layout from '@/components/Layout';
import { shareService } from '@/lib/api';

function ExpiryCountdown({ createdAtStr }) {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      if (!createdAtStr) return;
      const createdTime = new Date(createdAtStr).getTime();
      const expiryTime = createdTime + (15 * 60 * 1000); // 15 minutes
      const remainingMs = expiryTime - Date.now();

      if (remainingMs <= 0) {
        setCountdown('Expired');
      } else {
        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);
        setCountdown(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [createdAtStr]);

  return (
    <span style={{ fontSize: '0.8rem', color: '#d93025', fontWeight: '600' }}>
      Expires in: {countdown}
    </span>
  );
}

function ShareCodeContent({ isLoggedIn }) {
  const [activeTab, setActiveTab] = useState('share'); // 'share' or 'get'
  const [newCode, setNewCode] = useState('');
  const [snippetLanguage, setSnippetLanguage] = useState('javascript');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Share result
  const [generatedShareCode, setGeneratedShareCode] = useState('');
  
  // Retrieval states
  const [retrievalKey, setRetrievalKey] = useState('');
  const [retrievedSnippet, setRetrievedSnippet] = useState(null);
  const [retrievalLoading, setRetrievalLoading] = useState(false);
  const [retrievalError, setRetrievalError] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code');

  // Auto-retrieve if code query param is present
  useEffect(() => {
    if (codeParam && codeParam.length === 4) {
      setRetrievalKey(codeParam);
      setActiveTab('get');
      handleRetrieveCode(codeParam);
    }
  }, [codeParam]);

  const handleShare = async (e) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setSaving(true);
    setError('');
    setGeneratedShareCode('');

    try {
      // Generate unique 4-digit code
      const shareCode = Math.floor(1000 + Math.random() * 9000).toString();
      
      // We prepend the language to the code content so we can parse it upon retrieval!
      const payloadCode = `[lang:${snippetLanguage}]\n${newCode}`;

      await shareService.createSharedCode(shareCode, payloadCode);
      setGeneratedShareCode(shareCode);
      setNewCode('');
    } catch (err) {
      console.error(err);
      setError('Failed to share code snippet.');
    } finally {
      setSaving(false);
    }
  };

  const handleRetrieveCode = async (keyToRetrieve) => {
    const key = (keyToRetrieve || retrievalKey).trim();
    if (key.length !== 4) {
      setRetrievalError('Please enter a valid 4-digit code.');
      return;
    }

    setRetrievalLoading(true);
    setRetrievalError('');
    setRetrievedSnippet(null);

    try {
      const data = await shareService.getSharedCodeByKey(key);
      if (data && data.length > 0) {
        const snippet = data[0];
        
        // Parse language and actual code from payload
        let parsedLanguage = 'javascript';
        let parsedCode = snippet.code;
        
        if (snippet.code.startsWith('[lang:')) {
          const match = snippet.code.match(/^\[lang:([^\]]+)\]\n([\s\S]*)$/);
          if (match) {
            parsedLanguage = match[1];
            parsedCode = match[2];
          }
        }

        setRetrievedSnippet({
          ...snippet,
          language: parsedLanguage,
          code: parsedCode
        });
      } else {
        setRetrievalError('No active snippet found for this code. It may have expired.');
      }
    } catch (err) {
      console.error(err);
      setRetrievalError('Failed to retrieve code snippet.');
    } finally {
      setRetrievalLoading(false);
    }
  };

  const copyToClipboard = (text, message = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text);
    alert(message);
  };

  const cardClassName = isLoggedIn 
    ? "card" 
    : "border border-slate-300/80 bg-white shadow-xl shadow-slate-300/40 rounded-2xl";

  const labelClassName = isLoggedIn
    ? "form-label"
    : "text-xs font-bold text-slate-700 tracking-wider uppercase";

  const inputClassName = isLoggedIn
    ? "form-input"
    : "w-full rounded-xl border border-slate-300 bg-slate-100/80 py-3 px-4 text-slate-900 placeholder-slate-500 outline-none transition focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 font-medium";

  const selectClassName = isLoggedIn
    ? "form-input"
    : "w-full rounded-xl border border-slate-300 bg-slate-100/80 py-2.5 px-4 text-slate-900 outline-none transition focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20 font-medium";

  const submitBtnClassName = isLoggedIn
    ? "btn btn-primary"
    : "w-full rounded-xl bg-sky-600 hover:bg-sky-700 py-3.5 font-bold text-white shadow-md shadow-sky-600/25 flex items-center justify-center cursor-pointer transition-all disabled:opacity-50 text-sm";

  const innerUI = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Tab Navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', margin: '0 auto 18px auto', maxWidth: '360px', width: '100%', backgroundColor: isLoggedIn ? 'transparent' : '#cbd5e1', padding: isLoggedIn ? '0' : '4px', borderRadius: '14px' }}>
        <button 
          onClick={() => {
            setActiveTab('share');
            setError('');
          }}
          style={{
            flex: 1,
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: '700',
            borderRadius: '10px',
            border: activeTab === 'share' 
              ? (isLoggedIn ? '1px solid var(--link-color)' : '1px solid #94a3b8') 
              : 'none',
            backgroundColor: activeTab === 'share' 
              ? (isLoggedIn ? 'rgba(26, 115, 232, 0.12)' : '#ffffff') 
              : 'transparent',
            color: activeTab === 'share' 
              ? (isLoggedIn ? 'var(--link-color)' : '#0f172a') 
              : (isLoggedIn ? 'var(--text-muted)' : '#475569'),
            boxShadow: activeTab === 'share' && !isLoggedIn ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Share Code
        </button>
        <button 
          onClick={() => {
            setActiveTab('get');
            setRetrievalError('');
          }}
          style={{
            flex: 1,
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: '700',
            borderRadius: '10px',
            border: activeTab === 'get' 
              ? (isLoggedIn ? '1px solid var(--link-color)' : '1px solid #94a3b8') 
              : 'none',
            backgroundColor: activeTab === 'get' 
              ? (isLoggedIn ? 'rgba(26, 115, 232, 0.12)' : '#ffffff') 
              : 'transparent',
            color: activeTab === 'get' 
              ? (isLoggedIn ? 'var(--link-color)' : '#0f172a') 
              : (isLoggedIn ? 'var(--text-muted)' : '#475569'),
            boxShadow: activeTab === 'get' && !isLoggedIn ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Get Code
        </button>
      </div>

      {/* Conditionally Render Share / Get Card */}
      {activeTab === 'share' ? (
        /* Share Snippet Card */
        <div className={cardClassName} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: isLoggedIn ? 'var(--text-heading)' : '#0f172a', margin: '0 0 4px 0' }}>Share a Snippet</h3>
            <p style={{ fontSize: '0.8rem', color: isLoggedIn ? 'var(--text-muted)' : '#64748b', margin: 0 }}>Paste your code below to get a temporary 4-digit code.</p>
          </div>

          {error && <div className="login-error" style={{ margin: 0 }}>{error}</div>}

          <form onSubmit={handleShare} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className={labelClassName} style={{ fontWeight: '700', marginBottom: '6px' }}>Language</label>
              <select 
                value={snippetLanguage} 
                onChange={(e) => setSnippetLanguage(e.target.value)} 
                className={selectClassName}
                style={{ 
                  padding: '10px 14px', 
                  borderRadius: '10px', 
                  backgroundColor: isLoggedIn ? 'var(--list-item-bg)' : '#f1f5f9', 
                  color: isLoggedIn ? 'var(--text-color)' : '#0f172a', 
                  border: isLoggedIn ? '1px solid var(--card-border)' : '1px solid #cbd5e1' 
                }}
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="sql">SQL</option>
                <option value="plaintext">Plain Text</option>
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className={labelClassName} style={{ fontWeight: '700', marginBottom: '8px' }}>Paste Code</label>
              <div className="monaco-wrapper" style={{ height: '280px', flex: 'none', borderRadius: '12px', overflow: 'hidden', border: isLoggedIn ? '1px solid var(--card-border)' : '1px solid #cbd5e1' }}>
                <Editor
                  height="100%"
                  language={snippetLanguage}
                  theme="vs-dark"
                  value={newCode}
                  onChange={(val) => setNewCode(val || '')}
                  options={{
                    selectOnLineNumbers: true,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    autoClosingBrackets: 'always',
                    minimap: { enabled: false },
                    fontSize: 13,
                    automaticLayout: true
                  }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className={submitBtnClassName}
              disabled={saving || !newCode.trim()}
              style={{ padding: '12px 16px', fontWeight: '700', width: '100%', display: 'flex', justifyContent: 'center' }}
            >
              {saving ? 'Generating key...' : 'Share & Generate 4-Digit Code'}
            </button>
          </form>

          {generatedShareCode && (
            <div style={{ marginTop: '12px', padding: '16px', backgroundColor: isLoggedIn ? 'rgba(56, 189, 248, 0.08)' : '#e0f2fe', border: isLoggedIn ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid #7dd3fc', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: isLoggedIn ? 'var(--text-muted)' : '#0369a1', fontWeight: '700' }}>YOUR 4-DIGIT SHARE CODE</span>
              <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0284c7', letterSpacing: '6px' }}>{generatedShareCode}</span>
              <p style={{ fontSize: '0.75rem', color: isLoggedIn ? 'var(--text-muted)' : '#0369a1', margin: 0 }}>Shared code automatically expires in 15 minutes.</p>
              <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '6px' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
                  onClick={() => copyToClipboard(generatedShareCode, 'Share key copied!')}
                >
                  Copy Code
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 2, padding: '8px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
                  onClick={() => {
                    const link = `${window.location.origin}/share-code?code=${generatedShareCode}`;
                    copyToClipboard(link, 'Direct sharing link copied!');
                  }}
                >
                  Copy Link
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Retrieve Code Card */
        <div className={cardClassName} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: isLoggedIn ? 'var(--text-heading)' : '#0f172a', margin: '0 0 4px 0' }}>Retrieve Shared Code</h3>
            <p style={{ fontSize: '0.8rem', color: isLoggedIn ? 'var(--text-muted)' : '#64748b', margin: 0 }}>Enter a 4-digit code to instantly access a shared snippet.</p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="E.g., 5819"
              maxLength={4}
              className={inputClassName}
              value={retrievalKey}
              onChange={(e) => setRetrievalKey(e.target.value.replace(/\D/g, ''))}
              style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '4px', textAlign: 'center', height: '48px', padding: '0 12px', flex: 1 }}
            />
            <button 
              className="btn btn-primary"
              onClick={() => handleRetrieveCode()}
              disabled={retrievalLoading || retrievalKey.length !== 4}
              style={{ height: '48px', padding: '0 20px', fontWeight: '700', borderRadius: '12px' }}
            >
              {retrievalLoading ? 'Fetching...' : 'Retrieve'}
            </button>
          </div>

          {retrievalError && <div className="login-error" style={{ margin: 0 }}>{retrievalError}</div>}

          {retrievedSnippet && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: isLoggedIn ? '1px solid var(--card-border)' : '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', backgroundColor: isLoggedIn ? 'var(--list-item-bg)' : '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '2px 6px', backgroundColor: isLoggedIn ? 'var(--btn-secondary-bg)' : '#e2e8f0', borderRadius: '4px', color: isLoggedIn ? 'var(--text-muted)' : '#475569', textTransform: 'uppercase', marginRight: '8px' }}>
                    {retrievedSnippet.language}
                  </span>
                  <ExpiryCountdown createdAtStr={retrievedSnippet.created_at} />
                </div>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
                  onClick={() => copyToClipboard(retrievedSnippet.code, 'Code snippet copied to clipboard!')}
                >
                  Copy Code
                </button>
              </div>
              
              <div className="monaco-wrapper" style={{ height: '280px', flex: 'none', borderRadius: '12px', overflow: 'hidden', border: isLoggedIn ? '1px solid var(--card-border)' : '1px solid #cbd5e1' }}>
                <Editor
                  height="100%"
                  language={retrievedSnippet.language}
                  theme="vs-dark"
                  value={retrievedSnippet.code}
                  options={{
                    readOnly: true,
                    selectOnLineNumbers: true,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    minimap: { enabled: false },
                    fontSize: 13,
                    automaticLayout: true
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // If logged in, wrap it with standard layout
  if (isLoggedIn) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-heading)', marginBottom: '4px' }}>Share Code Snippet</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Shared snippets are public and auto-expire after 15 minutes.</p>
        </div>
        {innerUI}
      </div>
    );
  }

  // If not logged in, render a customized standalone public page
  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-slate-100 p-4 font-sans select-none relative overflow-hidden text-slate-900">
      {/* Soft Ambient Background Elements */}
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-sky-200/50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl pointer-events-none" />

      {/* Standalone Header Navbar */}
      <div className="w-full max-w-[1200px] flex justify-between items-center z-20 py-4 px-4 border-b border-slate-300/80 mb-6">
        <div 
          onClick={() => router.push('/login')} 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <img 
            src="/light-logo.png" 
            alt="CodeDiary Logo" 
            style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }} 
          />
          <h1 style={{ fontSize: '1.35rem', margin: 0, fontWeight: '800' }} className="text-slate-900">CodeDiary</h1>
        </div>
        <button
          onClick={() => router.push('/login')}
          className="btn btn-primary text-xs px-4 py-2"
          style={{ cursor: 'pointer', fontWeight: 'bold' }}
        >
          Sign In
        </button>
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 w-full max-w-[1200px] z-10 px-4">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '8px' }} className="text-slate-900">Code Share Center</h2>
          <p style={{ fontSize: '0.9rem', margin: 0 }} className="text-slate-600">
            Instantly share snippets with a temporary 4-digit code. Absolutely free, no signup or login required.
          </p>
        </div>
        {innerUI}
      </div>

      {/* Global Footer */}
      <footer className="w-full max-w-[1200px] border-t border-slate-300/80 pt-6 pb-4 mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 z-10">
        <span>Copyright © 2026 All Rights Reserved</span>
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
}

export default function ShareCodePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  if (isLoggedIn) {
    return (
      <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
        <Layout searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
          <ShareCodeContent isLoggedIn={true} />
        </Layout>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <ShareCodeContent isLoggedIn={false} />
    </Suspense>
  );
}
