"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { generateNotesPDF } from '@/lib/pdfExport';

const Layout = ({ children, searchQuery, setSearchQuery }) => {
  const router = useRouter();
  const [error, setError] = useState('');

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(true);

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

      <Sidebar 
        onExportPDF={handleExportPDF} 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
      />

      <div className="main-content">
        <header className="header">
          <div className="header-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img 
                src="/logo.png" 
                alt="CodeDiary Logo" 
                style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }} 
              />
              <h1 className="header-title" style={{ fontSize: '1.5rem', margin: 0 }}>CodeDiary</h1>
            </div>
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
            <button className="btn btn-danger" onClick={handleLogout}>
              Logout
            </button>
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
