"use client";

import React, { memo, useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const Sidebar = memo(({ onExportPDF, isDarkMode, toggleTheme }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Read logged-in user from localStorage on mount
    try {
      const u = JSON.parse(localStorage.getItem('currentUser'));
      setCurrentUser(u);
    } catch (e) {
      console.error('Error reading currentUser from localStorage:', e);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userId');
    router.push('/login');
  };

  const handleNavigate = (path, filterVal = null) => {
    if (filterVal) {
      router.push(`${path}?filter=${filterVal}`);
    } else {
      router.push(path);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-title">CodeDiary</div>
      <ul className="sidebar-menu">
        <li>
          <div
            className={`sidebar-link ${pathname === '/' && !filter ? 'active' : ''}`}
            onClick={() => handleNavigate('/')}
          >
            Dashboard
          </div>
        </li>

        {/* Dedicated Admin User Management Option */}
        {currentUser?.role === 'admin' && (
          <li>
            <div
              className={`sidebar-link ${pathname === '/admin/users' ? 'active' : ''}`}
              onClick={() => handleNavigate('/admin/users')}
            >
              User Management
            </div>
          </li>
        )}

        <li>
          <div
            className={`sidebar-link ${pathname === '/' && filter === 'all' ? 'active' : ''}`}
            onClick={() => handleNavigate('/', 'all')}
          >
            Coding Tasks
          </div>
        </li>
        <li>
          <div
            className={`sidebar-link ${pathname === '/' && filter === 'today' ? 'active' : ''}`}
            onClick={() => handleNavigate('/', 'today')}
          >
            Today's Todos
          </div>
        </li>
        <li>
          <div
            className={`sidebar-link ${pathname === '/share-code' ? 'active' : ''}`}
            onClick={() => handleNavigate('/share-code')}
          >
            Share Code
          </div>
        </li>
        <li>
          <div className="sidebar-link" onClick={onExportPDF}>
            Export PDF
          </div>
        </li>
        <li>
          <div className="sidebar-link" onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center' }}>
            {isDarkMode ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
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
                Light Mode
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
                Dark Mode
              </>
            )}
          </div>
        </li>
        <li style={{ marginTop: 'auto' }}>
          <div className="sidebar-link" style={{ color: '#d93025' }} onClick={handleLogout}>
            Logout
          </div>
        </li>
      </ul>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
