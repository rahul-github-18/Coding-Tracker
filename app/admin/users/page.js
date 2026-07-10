"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { userService } from '@/lib/api';

function UserManagementContent() {
  const [user, setUser] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      router.replace('/login');
    } else {
      try {
        const u = JSON.parse(localStorage.getItem('currentUser'));
        if (u.role !== 'admin') {
          router.replace('/'); // Redirect non-admins to home
        } else {
          setUser(u);
          fetchUsers();
        }
      } catch (e) {
        localStorage.clear();
        router.replace('/login');
      }
    }
  }, [router]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      console.time('API: Fetch Users (Admin Panel)');
      const allUsers = await userService.getUsers();
      console.timeEnd('API: Fetch Users (Admin Panel)');
      setUsersList(allUsers);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve users list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usersList.length > 0 && !selectedUserId) {
      const firstNonAdmin = usersList.find(u => u.username !== 'admin') || usersList[0];
      setSelectedUserId(firstNonAdmin.id);
    }
  }, [usersList, selectedUserId]);

  const selectedUser = usersList.find(u => u.id === selectedUserId);

  const handleApproveUser = async (uId) => {
    setError('');
    setSuccess('');
    try {
      await userService.approveUser(uId);
      setSuccess('User enrollment approved!');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to approve user.');
    }
  };

  const handleDisapproveUser = async (uId) => {
    setError('');
    setSuccess('');
    try {
      await userService.disapproveUser(uId);
      setSuccess('User approval revoked.');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to revoke user approval.');
    }
  };

  const handleDeleteUser = async (uId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await userService.deleteUser(uId);
      setSuccess('User deleted successfully.');
      
      // Auto select another user
      const remainingUsers = usersList.filter(u => u.id !== uId);
      if (remainingUsers.length > 0) {
        const nextUser = remainingUsers.find(u => u.username !== 'admin') || remainingUsers[0];
        setSelectedUserId(nextUser.id);
      } else {
        setSelectedUserId(null);
      }
      
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete user.');
    }
  };

  const handleToggleSelectedUserPermission = async (field, currentValue) => {
    if (!selectedUser) return;
    setError('');
    setSuccess('');
    try {
      // Optimistic UI update
      setUsersList(prev => prev.map(usr => usr.id === selectedUserId ? { ...usr, [field]: !currentValue } : usr));
      
      const updateData = { [field]: !currentValue };
      await userService.updatePermissions(selectedUserId, updateData);
      setSuccess('User permissions updated successfully.');
    } catch (err) {
      fetchUsers();
      setError(err.message || 'Failed to update permissions.');
    }
  };

  const handleRoleChange = async (uId, newRole) => {
    setError('');
    setSuccess('');
    try {
      // Optimistic UI update
      setUsersList(prev => prev.map(usr => usr.id === uId ? { ...usr, role: newRole } : usr));
      
      await userService.updatePermissions(uId, { role: newRole });
      setSuccess('User role updated.');
    } catch (err) {
      fetchUsers();
      setError(err.message || 'Failed to update role.');
    }
  };

  if (loading && !user) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Checking authorization...</div>;
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button 
            className="btn btn-secondary" 
            style={{ marginBottom: '12px', padding: '6px 12px', fontSize: '0.85rem' }} 
            onClick={() => router.push('/')}
          >
            &larr; Back to Dashboard
          </button>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-heading)', margin: 0 }}>
            Role Permissions Configurator
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
            Configure client permissions, manage approvals, and allocate roles.
          </p>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}
      {success && <div className="save-indicator" style={{ marginBottom: '12px' }}>{success}</div>}

      {/* Operator Details & Quick Action Panel */}
      <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: '700', color: 'var(--text-heading)', fontSize: '0.95rem' }}>Operator:</span>
            <select
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(Number(e.target.value))}
              className="form-input"
              style={{ width: '220px', padding: '6px 12px', fontSize: '0.9rem', margin: 0 }}
            >
              <option value="" disabled>-- Choose User --</option>
              {usersList.map(u => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>

          {selectedUser && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Role:</span>
                <select
                  value={selectedUser.role}
                  onChange={(e) => handleRoleChange(selectedUser.id, e.target.value)}
                  className="form-input"
                  style={{ width: '110px', padding: '6px 10px', fontSize: '0.8rem', margin: 0 }}
                  disabled={selectedUser.username === 'admin'}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status:</span>
                {selectedUser.approved ? (
                  <span style={{ fontSize: '0.72rem', padding: '4px 10px', backgroundColor: '#e6f4ea', color: '#137333', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }}>
                    Approved
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', padding: '4px 10px', backgroundColor: '#fef7e0', color: '#b06000', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase' }}>
                    Pending
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedUser.username !== 'admin' && (
                  <>
                    {selectedUser.approved ? (
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600', backgroundColor: '#fde8e8', color: '#d93025', border: '1px solid #f8b4b4' }} 
                        onClick={() => handleDisapproveUser(selectedUser.id)}
                      >
                        Revoke Approval
                      </button>
                    ) : (
                      <button 
                        className="btn btn-success" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600' }} 
                        onClick={() => handleApproveUser(selectedUser.id)}
                      >
                        Approve User
                      </button>
                    )}
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600' }} 
                      onClick={() => handleDeleteUser(selectedUser.id)}
                    >
                      Delete User
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permissions Configurator Table (Module Wise) */}
      <div className="card" style={{ minHeight: 'auto', padding: 0, overflow: 'hidden', border: '1px solid var(--card-border)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Loading...</div>
        ) : !selectedUser ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Select a user above to configure permissions.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1a73e8', color: '#ffffff' }}>
                  <th style={{ padding: '14px 16px', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Module</th>
                  <th style={{ padding: '14px 16px', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Menu Name</th>
                  <th style={{ padding: '14px 16px', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Can Add</th>
                  <th style={{ padding: '14px 16px', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Can Edit</th>
                  <th style={{ padding: '14px 16px', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Can Delete</th>
                  <th style={{ padding: '14px 16px', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Can View</th>
                </tr>
              </thead>
              <tbody>
                {/* Module Group 1 */}
                <tr style={{ backgroundColor: 'var(--btn-secondary-bg)' }}>
                  <td colSpan={6} style={{ padding: '10px 16px', fontWeight: '700', color: '#1a73e8', fontSize: '0.9rem' }}>
                    System Administration
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>System Administration</td>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--text-heading)' }}>Main Dashboard</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={!!selectedUser.can_view} 
                      onChange={() => handleToggleSelectedUserPermission('can_view', selectedUser.can_view)}
                      disabled={selectedUser.username === 'admin'}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>System Administration</td>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--text-heading)' }}>Role Permissions Config</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={!!selectedUser.can_edit} 
                      onChange={() => handleToggleSelectedUserPermission('can_edit', selectedUser.can_edit)}
                      disabled={selectedUser.username === 'admin'}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={!!selectedUser.can_view} 
                      onChange={() => handleToggleSelectedUserPermission('can_view', selectedUser.can_view)}
                      disabled={selectedUser.username === 'admin'}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </td>
                </tr>

                {/* Module Group 2 */}
                <tr style={{ backgroundColor: 'var(--btn-secondary-bg)' }}>
                  <td colSpan={6} style={{ padding: '10px 16px', fontWeight: '700', color: '#1a73e8', fontSize: '0.9rem' }}>
                    Curriculum Management
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>Curriculum Management</td>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--text-heading)' }}>Curriculum Topics & Questions</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={!!selectedUser.can_edit} 
                      onChange={() => handleToggleSelectedUserPermission('can_edit', selectedUser.can_edit)}
                      disabled={selectedUser.username === 'admin'}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={!!selectedUser.can_edit} 
                      onChange={() => handleToggleSelectedUserPermission('can_edit', selectedUser.can_edit)}
                      disabled={selectedUser.username === 'admin'}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={!!selectedUser.can_delete} 
                      onChange={() => handleToggleSelectedUserPermission('can_delete', selectedUser.can_delete)}
                      disabled={selectedUser.username === 'admin'}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={!!selectedUser.can_view} 
                      onChange={() => handleToggleSelectedUserPermission('can_view', selectedUser.can_view)}
                      disabled={selectedUser.username === 'admin'}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </td>
                </tr>

                {/* Module Group 3 */}
                <tr style={{ backgroundColor: 'var(--btn-secondary-bg)' }}>
                  <td colSpan={6} style={{ padding: '10px 16px', fontWeight: '700', color: '#1a73e8', fontSize: '0.9rem' }}>
                    Code Sharing
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>Code Sharing</td>
                  <td style={{ padding: '14px 16px', fontWeight: '700', color: 'var(--text-heading)' }}>Share Code Master</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={!!selectedUser.can_edit} 
                      onChange={() => handleToggleSelectedUserPermission('can_edit', selectedUser.can_edit)}
                      disabled={selectedUser.username === 'admin'}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={!!selectedUser.can_edit} 
                      onChange={() => handleToggleSelectedUserPermission('can_edit', selectedUser.can_edit)}
                      disabled={selectedUser.username === 'admin'}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>-</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={!!selectedUser.can_view} 
                      onChange={() => handleToggleSelectedUserPermission('can_view', selectedUser.can_view)}
                      disabled={selectedUser.username === 'admin'}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <Layout searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
        <UserManagementContent />
      </Layout>
    </Suspense>
  );
}
