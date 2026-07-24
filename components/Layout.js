"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Sidebar from './Sidebar';
import { generateNotesPDF } from '@/lib/pdfExport';
import { userQueryService } from '@/lib/api';

const Layout = ({ children, searchQuery, setSearchQuery }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');

  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Ticketing and Notification states
  const [queries, setQueries] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedQueryDetail, setSelectedQueryDetail] = useState(null);
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState(null);

  const fetchUserNotifications = useCallback(async () => {
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!userId) return;
    try {
      const [queriesData, submissionsData] = await Promise.all([
        userQueryService.getQueries().catch(() => []),
        userQueryService.getSubmissions().catch(() => [])
      ]);
      const q = queriesData || [];
      const s = submissionsData || [];
      setQueries(q);
      setSubmissions(s);
      const unreadQ = q.filter(item => item.reply_text && !item.is_read_by_user).length;
      const unreadS = s.filter(item => item.admin_reply && !item.is_read_by_user).length;
      setUnreadCount(unreadQ + unreadS);
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  }, []);

  useEffect(() => {
    fetchUserNotifications();
    const interval = setInterval(fetchUserNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchUserNotifications]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('refresh-notifications', fetchUserNotifications);
      return () => window.removeEventListener('refresh-notifications', fetchUserNotifications);
    }
  }, [fetchUserNotifications]);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // PDF Preview States
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Sync theme class to document body
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark';
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

  const formatUsername = (username) => {
    if (!username) return '';
    return username.charAt(0).toUpperCase() + username.slice(1);
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
                src={isDarkMode ? "/dark-logo.png" : "/light-logo.png"}
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
                className={`desktop-nav-link ${pathname === '/code-editor' ? 'active' : ''}`}
                onClick={() => handleNavigate('/code-editor')}
                style={{
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: pathname === '/code-editor' ? 'var(--link-color)' : 'var(--text-color)',
                  transition: 'color 0.15s ease'
                }}
              >
                Code Editor
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

            {/* Header Actions (Responsive) */}
            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                  <span className="hide-on-mobile">Install</span>
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
                    <span className="hide-on-mobile">Light</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                    <span className="hide-on-mobile">Dark</span>
                  </>
                )}
              </button>

              {currentUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {currentUser.role !== 'admin' && (
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        className="btn btn-secondary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '8px',
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                          position: 'relative',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          border: '1px solid var(--card-border)',
                          backgroundColor: 'var(--card-bg)'
                        }}
                        aria-label="View notifications"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        {unreadCount > 0 && (
                          <span style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            backgroundColor: '#ff4d4f',
                            color: '#fff',
                            borderRadius: '50%',
                            padding: '2px 6px',
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            border: '2px solid var(--body-bg)',
                            lineHeight: '1',
                            minWidth: '16px',
                            height: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {unreadCount}
                          </span>
                        )}
                      </button>

                      {notificationsOpen && (
                        <>
                          <div 
                            onClick={() => setNotificationsOpen(false)}
                            style={{
                              position: 'fixed',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 999
                            }}
                          />
                          <div className="notification-dropdown">
                            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--card-border)', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-heading)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Support Notifications</span>
                              {unreadCount > 0 && <span style={{ fontSize: '0.75rem', color: '#ff4d4f', fontWeight: 'normal' }}>{unreadCount} unread</span>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              {queries.length === 0 && submissions.length === 0 ? (
                                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                  No notifications yet.
                                </div>
                              ) : (
                                <>
                                  {/* Query notifications */}
                                  {queries.map((q) => {
                                    const isUnread = q.reply_text && !q.is_read_by_user;
                                    return (
                                      <div
                                        key={`q-${q.id}`}
                                        onClick={async () => {
                                          setNotificationsOpen(false);
                                          setSelectedQueryDetail(q);
                                          if (isUnread) {
                                            try {
                                              await userQueryService.markQueryAsRead(q.id);
                                              fetchUserNotifications();
                                              window.dispatchEvent(new Event('refresh-queries'));
                                            } catch (err) {
                                              console.error('Error marking query read:', err);
                                            }
                                          }
                                        }}
                                        style={{
                                          padding: '12px 16px',
                                          borderBottom: '1px solid var(--card-border)',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '4px',
                                          backgroundColor: isUnread ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                                          transition: 'background-color 0.15s ease',
                                          textAlign: 'left'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--btn-secondary-bg)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isUnread ? 'rgba(56, 189, 248, 0.08)' : 'transparent'}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: '700', padding: '1px 5px', borderRadius: '3px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', textTransform: 'uppercase' }}>Query</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--link-color)' }}>QRY-#{q.id}</span>
                                          </div>
                                          <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', backgroundColor: q.reply_text ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: q.reply_text ? '#10b981' : '#f59e0b' }}>
                                            {q.reply_text ? 'Replied' : 'Pending'}
                                          </span>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-color)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                          {q.query_text}
                                        </p>
                                        {q.reply_text && (
                                          <p style={{ fontSize: '0.75rem', color: '#10b981', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: '500' }}>
                                            Reply: {q.reply_text}
                                          </p>
                                        )}
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(q.created_at).toLocaleDateString()}</span>
                                      </div>
                                    );
                                  })}

                                  {/* Submission notifications */}
                                  {submissions.map((s) => {
                                    const isUnread = s.admin_reply && !s.is_read_by_user;
                                    return (
                                      <div
                                        key={`s-${s.id}`}
                                        onClick={async () => {
                                          setNotificationsOpen(false);
                                          setSelectedSubmissionDetail(s);
                                          if (isUnread) {
                                            try {
                                              await userQueryService.markSubmissionAsRead(s.id);
                                              fetchUserNotifications();
                                            } catch (err) {
                                              console.error('Error marking submission read:', err);
                                            }
                                          }
                                        }}
                                        style={{
                                          padding: '12px 16px',
                                          borderBottom: '1px solid var(--card-border)',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '4px',
                                          backgroundColor: isUnread ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                                          transition: 'background-color 0.15s ease',
                                          textAlign: 'left'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--btn-secondary-bg)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isUnread ? 'rgba(79, 70, 229, 0.08)' : 'transparent'}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '0.6rem', fontWeight: '700', padding: '1px 5px', borderRadius: '3px', backgroundColor: 'rgba(79,70,229,0.15)', color: '#4f46e5', textTransform: 'uppercase' }}>Code</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--link-color)' }}>SUB-#{s.id}</span>
                                          </div>
                                          <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', backgroundColor: s.admin_reply ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: s.admin_reply ? '#10b981' : '#f59e0b' }}>
                                            {s.admin_reply ? 'Reviewed' : 'Pending'}
                                          </span>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-color)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                          {s.question_title}
                                        </p>
                                        {s.admin_reply && (
                                          <p style={{ fontSize: '0.75rem', color: '#10b981', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: '500' }}>
                                            Feedback: {s.admin_reply}
                                          </p>
                                        )}
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleDateString()}</span>
                                      </div>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div style={{ position: 'relative' }}>
                    <button 
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="btn btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Welcome, {formatUsername(currentUser.username)}
                    <span style={{ fontSize: '0.65rem' }}>{dropdownOpen ? '▲' : '▼'}</span>
                  </button>

                  {dropdownOpen && (
                    <>
                      <div 
                        onClick={() => setDropdownOpen(false)}
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          zIndex: 999
                        }}
                      />
                      <div 
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          right: 0,
                          backgroundColor: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                          borderRadius: '6px',
                          boxShadow: 'var(--card-shadow)',
                          padding: '8px',
                          minWidth: '160px',
                          zIndex: 1000,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <div style={{ padding: '6px 8px', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--card-border)', marginBottom: '4px' }}>
                          Logged in as <strong>{currentUser.username}</strong>
                        </div>
                        <button 
                          className="btn btn-danger" 
                          onClick={() => {
                            setDropdownOpen(false);
                            handleLogout();
                          }}
                          style={{ 
                            width: '100%', 
                            padding: '8px', 
                            fontSize: '0.8rem', 
                            fontWeight: '600',
                            textAlign: 'center',
                            display: 'block'
                          }}
                        >
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </header>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            {children}
          </div>
          <footer style={{
            padding: '24px 16px 16px 16px',
            borderTop: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            textAlign: 'center'
          }}>
            <span>Copyright © 2026 All Rights Reserved</span>
            <a
              href="https://www.linkedin.com/in/rahul-ranjan-6b2ab424a/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#0a66c2',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '4px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.75rem',
                gap: '6px',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              LinkedIn
            </a>
          </footer>
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

      {/* Query Detail Modal */}
      {selectedQueryDetail && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            backdropFilter: 'blur(4px)',
            padding: '20px'
          }}
        >
          <div 
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
              position: 'relative',
              textAlign: 'left'
            }}
          >
            <button 
              onClick={() => setSelectedQueryDetail(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '1.25rem'
              }}
            >
              &times;
            </button>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-heading)', margin: '0 0 16px 0', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
              Query Ticket: QRY-#{selectedQueryDetail.id}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Query</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-color)', margin: '4px 0 0 0', backgroundColor: 'var(--body-bg)', padding: '12px', borderRadius: '6px', border: '1px solid var(--card-border)', whiteSpace: 'pre-wrap' }}>
                  {selectedQueryDetail.query_text}
                </p>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Submitted on {new Date(selectedQueryDetail.created_at).toLocaleString()}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Response</span>
                {selectedQueryDetail.reply_text ? (
                  <>
                    <p style={{ fontSize: '0.9rem', color: '#10b981', margin: '4px 0 0 0', backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)', whiteSpace: 'pre-wrap', fontWeight: '500' }}>
                      {selectedQueryDetail.reply_text}
                    </p>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      Replied on {new Date(selectedQueryDetail.replied_at).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: '#f59e0b', margin: '4px 0 0 0', fontStyle: 'italic', backgroundColor: 'rgba(245, 158, 11, 0.05)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    Pending review by administrator. We will notify you here once answered.
                  </p>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedQueryDetail(null)}>
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Detail Modal */}
      {selectedSubmissionDetail && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1100, backdropFilter: 'blur(4px)', padding: '20px'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '600px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
              position: 'relative',
              textAlign: 'left',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <button
              onClick={() => setSelectedSubmissionDetail(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}
            >
              &times;
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-heading)', margin: '0 0 4px 0' }}>
              Code Submission: SUB-#{selectedSubmissionDetail.id}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 20px 0', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
              {selectedSubmissionDetail.todos?.title} → {selectedSubmissionDetail.question_title}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Code</span>
                <pre style={{
                  margin: '6px 0 0 0',
                  padding: '14px',
                  backgroundColor: '#1e1e2f',
                  color: '#f8f8f2',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  maxHeight: '280px',
                  overflowY: 'auto'
                }}>
                  {selectedSubmissionDetail.code}
                </pre>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Submitted on {new Date(selectedSubmissionDetail.created_at).toLocaleString()}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Feedback</span>
                {selectedSubmissionDetail.admin_reply ? (
                  <>
                    <p style={{ fontSize: '0.9rem', color: '#10b981', margin: '6px 0 0 0', backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)', whiteSpace: 'pre-wrap', fontWeight: '500' }}>
                      {selectedSubmissionDetail.admin_reply}
                    </p>
                    {selectedSubmissionDetail.replied_at && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                        Reviewed on {new Date(selectedSubmissionDetail.replied_at).toLocaleString()}
                      </span>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: '#f59e0b', margin: '6px 0 0 0', fontStyle: 'italic', backgroundColor: 'rgba(245, 158, 11, 0.05)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    Your submission is pending review. We will notify you once the admin adds feedback.
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedSubmissionDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
