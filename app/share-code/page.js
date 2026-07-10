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
    : "border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl";

  const labelClassName = isLoggedIn
    ? "form-label"
    : "text-xs font-semibold text-slate-400 tracking-wider uppercase";

  const inputClassName = isLoggedIn
    ? "form-input"
    : "w-full rounded-lg border border-slate-800 bg-slate-950/60 py-3 px-4 text-slate-100 placeholder-slate-500 outline-none transition duration-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20";

  const selectClassName = isLoggedIn
    ? "form-input"
    : "w-full rounded-lg border border-slate-800 bg-slate-950/60 py-2.5 px-4 text-slate-100 outline-none transition duration-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20";

  const submitBtnClassName = isLoggedIn
    ? "btn btn-primary"
    : "w-full rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 py-3 font-semibold text-white transition duration-200 shadow-lg shadow-sky-500/10 flex items-center justify-center cursor-pointer";

  const innerUI = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Tab Navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', margin: '0 auto 16px auto', maxWidth: '360px', width: '100%' }}>
        <button 
          onClick={() => {
            setActiveTab('share');
            setError('');
          }}
          style={{
            flex: 1,
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: '600',
            borderRadius: '20px',
            border: activeTab === 'share' 
              ? (isLoggedIn ? '1px solid var(--link-color)' : '1px solid #38bdf8') 
              : (isLoggedIn ? '1px solid var(--card-border)' : '1px solid #1e293b'),
            backgroundColor: activeTab === 'share' 
              ? (isLoggedIn ? 'rgba(26, 115, 232, 0.12)' : 'rgba(56, 189, 248, 0.15)') 
              : (isLoggedIn ? 'var(--list-item-bg)' : 'rgba(15, 23, 42, 0.6)'),
            color: activeTab === 'share' 
              ? (isLoggedIn ? 'var(--link-color)' : '#38bdf8') 
              : (isLoggedIn ? 'var(--text-muted)' : '#94a3b8'),
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>📤</span> Share Code
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
            fontWeight: '600',
            borderRadius: '20px',
            border: activeTab === 'get' 
              ? (isLoggedIn ? '1px solid var(--link-color)' : '1px solid #38bdf8') 
              : (isLoggedIn ? '1px solid var(--card-border)' : '1px solid #1e293b'),
            backgroundColor: activeTab === 'get' 
              ? (isLoggedIn ? 'rgba(26, 115, 232, 0.12)' : 'rgba(56, 189, 248, 0.15)') 
              : (isLoggedIn ? 'var(--list-item-bg)' : 'rgba(15, 23, 42, 0.6)'),
            color: activeTab === 'get' 
              ? (isLoggedIn ? 'var(--link-color)' : '#38bdf8') 
              : (isLoggedIn ? 'var(--text-muted)' : '#94a3b8'),
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>📥</span> Get Code
        </button>
      </div>

      {/* Conditionally Render Share / Get Card */}
      {activeTab === 'share' ? (
        /* Share Snippet Card */
        <div className={cardClassName} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: isLoggedIn ? 'var(--text-heading)' : '#f8fafc', margin: '0 0 4px 0' }}>Share a Snippet</h3>
            <p style={{ fontSize: '0.8rem', color: isLoggedIn ? 'var(--text-muted)' : '#94a3b8', margin: 0 }}>Paste your code below to get a temporary 4-digit code.</p>
          </div>

          {error && <div className="login-error" style={{ margin: 0 }}>{error}</div>}

          <form onSubmit={handleShare} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className={labelClassName} style={{ fontWeight: '600', marginBottom: '6px' }}>Language</label>
              <select 
                value={snippetLanguage} 
                onChange={(e) => setSnippetLanguage(e.target.value)} 
                className={selectClassName}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  backgroundColor: isLoggedIn ? 'var(--list-item-bg)' : '#0f172a', 
                  color: isLoggedIn ? 'var(--text-color)' : '#f8fafc', 
                  border: isLoggedIn ? '1px solid var(--card-border)' : '1px solid #1e293b' 
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
              <label className={labelClassName} style={{ fontWeight: '600', marginBottom: '8px' }}>Paste Code</label>
              <div className="monaco-wrapper" style={{ height: '280px', flex: 'none', borderRadius: '8px', overflow: 'hidden', border: isLoggedIn ? '1px solid var(--card-border)' : '1px solid #1e293b' }}>
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
              style={{ padding: '10px 16px', fontWeight: '600', width: '100%', display: 'flex', justifycontent: 'center' }}
            >
              {saving ? 'Generating key...' : '⚡ Share & Generate 4-Digit Code'}
            </button>
          </form>

          {generatedShareCode && (
            <div style={{ marginTop: '12px', padding: '16px', backgroundColor: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: isLoggedIn ? 'var(--text-muted)' : '#94a3b8', fontWeight: '600' }}>YOUR 4-DIGIT SHARE CODE</span>
              <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#38bdf8', letterSpacing: '6px' }}>{generatedShareCode}</span>
              <p style={{ fontSize: '0.75rem', color: isLoggedIn ? 'var(--text-muted)' : '#94a3b8', margin: 0 }}>Shared code automatically expires in 15 minutes.</p>
              <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '6px' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '6px 10px', fontSize: '0.75rem' }}
                  onClick={() => copyToClipboard(generatedShareCode, 'Share key copied!')}
                >
                  Copy Code
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 2, padding: '6px 10px', fontSize: '0.75rem' }}
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: isLoggedIn ? 'var(--text-heading)' : '#f8fafc', margin: '0 0 4px 0' }}>Retrieve Shared Code</h3>
            <p style={{ fontSize: '0.8rem', color: isLoggedIn ? 'var(--text-muted)' : '#94a3b8', margin: 0 }}>Enter a 4-digit code to instantly access a shared snippet.</p>
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
              style={{ height: '48px', padding: '0 20px', fontWeight: '600' }}
            >
              {retrievalLoading ? 'Fetching...' : 'Retrieve'}
            </button>
          </div>

          {retrievalError && <div className="login-error" style={{ margin: 0 }}>{retrievalError}</div>}

          {retrievedSnippet && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: isLoggedIn ? '1px solid var(--card-border)' : '1px solid #1e293b', borderRadius: '8px', padding: '16px', backgroundColor: isLoggedIn ? 'var(--list-item-bg)' : '#0f172a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '2px 6px', backgroundColor: isLoggedIn ? 'var(--btn-secondary-bg)' : '#1e293b', borderRadius: '4px', color: isLoggedIn ? 'var(--text-muted)' : '#94a3b8', textTransform: 'uppercase', marginRight: '8px' }}>
                    {retrievedSnippet.language}
                  </span>
                  <ExpiryCountdown createdAtStr={retrievedSnippet.created_at} />
                </div>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  onClick={() => copyToClipboard(retrievedSnippet.code, 'Code snippet copied to clipboard!')}
                >
                  Copy Code
                </button>
              </div>
              
              <div className="monaco-wrapper" style={{ height: '280px', flex: 'none', borderRadius: '8px', overflow: 'hidden', border: isLoggedIn ? '1px solid var(--card-border)' : '1px solid #1e293b' }}>
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
    <div className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-br from-[#0f172a] via-[#1e1e38] to-[#0b0f19] p-4 font-sans select-none relative overflow-hidden">
      {/* Decorative background glow circles */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-sky-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-[100px] pointer-events-none" />

      {/* Standalone Header Navbar */}
      <div className="w-full max-w-[1200px] flex justify-between items-center z-20 py-4 px-4 border-b border-slate-800/80 mb-6">
        <div 
          onClick={() => router.push('/login')} 
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <img 
            src="/logo.png" 
            alt="CodeDiary Logo" 
            style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }} 
          />
          <h1 style={{ fontSize: '1.35rem', margin: 0, fontWeight: '800', color: 'white' }}>CodeDiary</h1>
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
          <h2 style={{ fontSize: '2rem', fontWeight: '900', color: 'white', marginBottom: '8px' }}>Code Share Center</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
            Instantly share snippets with a temporary 4-digit code. Absolutely free, no signup or login required.
          </p>
        </div>
        {innerUI}
      </div>

      {/* Global Footer */}
      <footer className="w-full max-w-[1200px] border-t border-slate-800/80 pt-6 pb-4 mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 z-10">
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
