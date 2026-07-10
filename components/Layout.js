"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Sidebar from './Sidebar';
import { generateNotesPDF } from '@/lib/pdfExport';

const Layout = ({ children, searchQuery, setSearchQuery }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');
  
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // PDF Preview States
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);

  // Sync theme class to document body
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme !== 'light';
    setIsDarkMode(isDark);
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, []);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser'));
      setCurrentUser(u);
    } catch (e) {
      console.error('Error reading currentUser from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    const isStandalone = 
      (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) || 
      (typeof window !== 'undefined' && window.navigator.standalone === true);

    if (isStandalone) {
      setShowInstallBtn(false);
      return;
    }

    if (typeof window !== 'undefined' && window.deferredPrompt) {
      setShowInstallBtn(true);
    }

    const handlePromptAvailable = () => setShowInstallBtn(true);
    const handlePromptInstalled = () => setShowInstallBtn(false);

    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('pwa-prompt-installed', handlePromptInstalled);

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('pwa-prompt-installed', handlePromptInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) return;

    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    window.deferredPrompt = null;
    setShowInstallBtn(false);
  };

  const handleNavigate = (path, filterVal = null) => {
    if (filterVal) {
      router.push(`${path}?filter=${filterVal}`);
    } else {
      router.push(path);
    }
  };

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => {
      const nextTheme = !prev;
      localStorage.setItem('theme', nextTheme ? 'dark' : 'light');
      if (nextTheme) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
      return nextTheme;
    });
  }, []);

  const handleExportPDF = useCallback(async () => {
    setError('');
    try {
      const doc = await generateNotesPDF(setError);
      if (doc) {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl(url);
        setPdfDoc(doc);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to generate PDF preview.');
    }
  }, []);

  const handleDownloadPDF = () => {
    if (pdfDoc) {
      pdfDoc.save('Coding_Notes.pdf');
    }
  };

  const handleClosePDFPreview = () => {
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    setPdfPreviewUrl(null);
    setPdfDoc(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    router.push('/login');
  };

  const getFormattedDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  return (
    <div className="app-container">
      {error && (
        <div 
          className="login-error" 
          style={{ 
            position: 'fixed', 
            top: '20px', 
            right: '20px', 
            zIndex: 1100, 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            margin: 0
          }}
        >
          {error}
          <button 
            onClick={() => setError('')} 
            style={{ 
              background: 'none', 
              border: 'none', 
              marginLeft: '12px', 
              color: 'inherit', 
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            x
          </button>
        </div>
      )}

      {isSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 990,
            display: 'none' // Shown only on mobile in CSS
          }}
        />
      )}

      <Sidebar 
        onExportPDF={handleExportPDF} 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="main-content">
        <header className="header">
          <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              className="hamburger-btn" 
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation menu"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-heading)',
                cursor: 'pointer',
                display: 'none',
                padding: '4px',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img 
                src="/logo.png" 
                alt="CodeDiary Logo" 
                style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }} 
              />
              <h1 className="header-title" style={{ fontSize: '1.5rem', margin: 0 }}>CodeDiary</h1>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '18px', marginLeft: '24px' }}>
              <span
                className={`desktop-nav-link ${pathname === '/' && !filter ? 'active' : ''}`}
                onClick={() => handleNavigate('/')}
                style={{
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: pathname === '/' && !filter ? 'var(--link-color)' : 'var(--text-color)',
                  transition: 'color 0.15s ease'
                }}
              >
                Dashboard
              </span>

              {currentUser?.role === 'admin' && (
                <span
                  className={`desktop-nav-link ${pathname === '/admin/users' ? 'active' : ''}`}
                  onClick={() => handleNavigate('/admin/users')}
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: pathname === '/admin/users' ? 'var(--link-color)' : 'var(--text-color)',
                    transition: 'color 0.15s ease'
                  }}
                >
                  User Management
                </span>
              )}

              <span
                className={`desktop-nav-link ${pathname === '/' && filter === 'all' ? 'active' : ''}`}
                onClick={() => handleNavigate('/', 'all')}
                style={{
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: pathname === '/' && filter === 'all' ? 'var(--link-color)' : 'var(--text-color)',
                  transition: 'color 0.15s ease'
                }}
              >
                Curriculum
              </span>

              <span
                className={`desktop-nav-link ${pathname === '/share-code' ? 'active' : ''}`}
                onClick={() => handleNavigate('/share-code')}
                style={{
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: pathname === '/share-code' ? 'var(--link-color)' : 'var(--text-color)',
                  transition: 'color 0.15s ease'
                }}
              >
                Share Code
              </span>
            </nav>

            <div className="header-date">{getFormattedDate()}</div>
          </div>
          <div className="header-right">
            <input
              type="text"
              placeholder="Search todos or questions..."
              className="search-bar"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Desktop Actions */}
            <div className="desktop-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {showInstallBtn && (
                <button 
                  className="btn btn-secondary" 
                  onClick={handleInstallClick}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: '600'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Install
                </button>
              )}

              <button 
                className="btn btn-secondary" 
                onClick={toggleTheme}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}
              >
                {isDarkMode ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="5"></circle>
                      <line x1="12" y1="1" x2="12" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="23"></line>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                      <line x1="1" y1="12" x2="3" y2="12"></line>
                      <line x1="21" y1="12" x2="23" y2="12"></line>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                    Light
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                    Dark
                  </>
                )}
              </button>

              <button className="btn btn-danger" onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600' }}>
                Logout
              </button>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>

      {/* PDF Export Preview Modal */}
      {pdfPreviewUrl && (
        <div className="modal-overlay" onClick={handleClosePDFPreview}>
          <div 
            className="modal-box" 
            style={{ maxWidth: '850px', height: '85vh' }} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <span className="modal-title">PDF Export Preview</span>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={handleClosePDFPreview}
              >
                Close &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ padding: 0 }}>
              <iframe 
                src={pdfPreviewUrl} 
                width="100%" 
                height="100%" 
                title="PDF Preview" 
                style={{ border: 'none' }}
              />
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <div className="modal-footer-left">
                <span style={{ fontSize: '0.85rem' }}>Verify notebook page structure before downloading.</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={handleClosePDFPreview}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleDownloadPDF}>
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
