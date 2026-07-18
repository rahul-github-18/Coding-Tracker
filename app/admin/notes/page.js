"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { noteService } from '@/lib/api';

function AdminNotesContent() {
  const [user, setUser] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form / Modal states
  const [modalOpen, setModalOpen] = useState(false); // 'create' | 'edit' | null
  const [selectedNote, setSelectedNote] = useState(null);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      router.replace('/login');
    } else {
      try {
        const u = JSON.parse(localStorage.getItem('currentUser'));
        if (u.role !== 'admin') {
          router.replace('/'); // Redirect non-admins to dashboard
        } else {
          setUser(u);
          fetchNotes();
        }
      } catch (e) {
        localStorage.clear();
        router.replace('/login');
      }
    }
  }, [router]);

  const fetchNotes = async () => {
    setLoading(true);
    setError('');
    try {
      // Calls noteService.getNotes() with no arguments to get notes where topic_id is NULL
      const data = await noteService.getNotes();
      setNotes(data || []);
    } catch (err) {
      console.error('Failed to fetch admin notes:', err);
      setError('Failed to retrieve private notes.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setNoteForm({ title: '', content: '' });
    setSelectedNote(null);
    setModalOpen('create');
    setError('');
    setSuccess('');
  };

  const handleOpenEditModal = (note) => {
    setNoteForm({ title: note.title, content: note.content });
    setSelectedNote(note);
    setModalOpen('edit');
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!noteForm.title.trim() || !noteForm.content.trim()) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (modalOpen === 'create') {
        await noteService.createNote(null, {
          title: noteForm.title.trim(),
          content: noteForm.content
        });
        setSuccess('Private note created successfully!');
      } else if (modalOpen === 'edit' && selectedNote) {
        await noteService.updateNote(selectedNote.id, {
          title: noteForm.title.trim(),
          content: noteForm.content
        });
        setSuccess('Private note updated successfully!');
      }
      setModalOpen(null);
      await fetchNotes();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this private note? This action cannot be undone.')) return;
    setError('');
    setSuccess('');

    try {
      await noteService.deleteNote(noteId);
      setSuccess('Private note deleted successfully!');
      await fetchNotes();
    } catch (err) {
      console.error(err);
      setError('Failed to delete note.');
    }
  };

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-heading)', margin: 0 }}>
            Private Admin Notes
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Manage private topics, quick reminders, and developer logs visible only to administrators.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleOpenCreateModal}
          style={{ padding: '10px 20px', fontWeight: '600' }}
        >
          + Add Private Note
        </button>
      </div>

      {error && <div className="login-error">{error}</div>}
      {success && <div className="save-indicator" style={{ marginBottom: '12px' }}>{success}</div>}

      {/* Search Bar */}
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type="text"
          className="search-bar"
          placeholder="Search private notes by title or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', paddingLeft: '40px' }}
        />
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading private notes...
        </div>
      ) : filteredNotes.length === 0 ? (
        <div style={{ padding: '60px 24px', textAlign: 'center', border: '1.5px dashed var(--card-border)', borderRadius: '8px', color: 'var(--text-muted)' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>
            {searchQuery ? 'No notes match your search.' : 'No private admin notes created yet.'}
          </p>
          {!searchQuery && (
            <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem' }}>
              Click "+ Add Private Note" above to write down your first note.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {filteredNotes.map((note) => (
            <div 
              key={note.id} 
              className="card" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                minHeight: '220px',
                padding: '20px'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-heading)', margin: '0 0 10px 0', borderBottom: '1px solid var(--card-border)', paddingBottom: '8px' }}>
                  {note.title}
                </h3>
                <p style={{ 
                  fontSize: '0.85rem', 
                  color: 'var(--text-muted)', 
                  margin: 0, 
                  whiteSpace: 'pre-wrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 6,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: '1.5'
                }}>
                  {note.content}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleOpenEditModal(note)}
                  style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: '600' }}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleDeleteNote(note.id)}
                  style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: '600', color: '#ff4d4f', borderColor: 'rgba(255, 77, 79, 0.2)' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Note Modal */}
      {modalOpen && (
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
              maxWidth: '600px',
              padding: '24px',
              boxShadow: 'var(--card-shadow)',
              position: 'relative',
              textAlign: 'left'
            }}
          >
            <button 
              onClick={() => setModalOpen(null)}
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-heading)', margin: '0 0 16px 0' }}>
              {modalOpen === 'create' ? 'Create Private Note' : 'Edit Private Note'}
            </h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Note Title / Topic</label>
                <input 
                  type="text" 
                  placeholder="e.g. Server Maintenance Instructions" 
                  className="form-input" 
                  value={noteForm.title} 
                  onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} 
                  required 
                  style={{ marginTop: '4px', width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Note Content</label>
                <textarea
                  required
                  rows={8}
                  className="search-bar"
                  placeholder="Write your notes here..."
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  style={{ width: '100%', marginTop: '4px', resize: 'vertical', minHeight: '150px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setModalOpen(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={saving || !noteForm.title.trim() || !noteForm.content.trim()}
                >
                  {saving ? 'Saving...' : modalOpen === 'create' ? 'Create Note' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminNotesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <Layout searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
        <AdminNotesContent />
      </Layout>
    </Suspense>
  );
}
