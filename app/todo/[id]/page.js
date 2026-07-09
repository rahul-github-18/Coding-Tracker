"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Editor from '@monaco-editor/react';
import Layout from '@/components/Layout';
import { todoService, questionService } from '@/lib/api';

function TodoDetailContent({ searchQuery }) {
  const { id: todoId } = useParams();
  const router = useRouter();

  const [todo, setTodo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Modal States
  const [activeModal, setActiveModal] = useState(null); // 'notes', 'code', or 'both'
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [modalNotes, setModalNotes] = useState('');
  const [modalCode, setModalCode] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  const [modalSavedSuccess, setModalSavedSuccess] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      router.replace('/login');
    } else {
      setAuthorized(true);
      fetchData();
    }
  }, [todoId, router]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const todosData = await todoService.getTodos();
      const currentTodo = todosData.find(t => t.id === parseInt(todoId));
      if (!currentTodo) {
        setError('Todo item not found.');
        setLoading(false);
        return;
      }
      setTodo(currentTodo);

      const questionsData = await questionService.getQuestions(todoId);
      setQuestions(questionsData);
    } catch (err) {
      console.error(err);
      setError('Database connection failed. Could not retrieve todo details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setError('');

    try {
      const created = await questionService.createQuestion(todoId, {
        title: newTitle.trim(),
        notes: '',
        code: ''
      });
      setQuestions([...questions, created]);
      setNewTitle('');
    } catch (err) {
      console.error(err);
      setError('Save failed. Could not add question.');
    }
  };

  const handleStartEdit = (q) => {
    setEditingId(q.id);
    setEditingTitle(q.title);
  };

  const handleSaveTitle = async (qId) => {
    if (!editingTitle.trim()) return;
    setError('');

    try {
      const updated = await questionService.updateQuestion(qId, { title: editingTitle.trim() });
      setQuestions(questions.map(q => (q.id === qId ? { ...q, title: updated.title } : q)));
      setEditingId(null);
      // Keep active question model in sync if edited
      if (activeQuestion && activeQuestion.id === qId) {
        setActiveQuestion({ ...activeQuestion, title: updated.title });
      }
    } catch (err) {
      console.error(err);
      setError('Save failed. Could not update question title.');
    }
  };

  const handleDelete = async (qId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }
    setError('');

    try {
      await questionService.deleteQuestion(qId);
      setQuestions(questions.filter(q => q.id !== qId));
      if (activeQuestion && activeQuestion.id === qId) {
        closeModal();
      }
    } catch (err) {
      console.error(err);
      setError('Delete failed. Could not remove question.');
    }
  };

  // Modal Open Handlers
  const openNotesModal = (q) => {
    setActiveQuestion(q);
    setModalNotes(q.notes || '');
    setModalCode(q.code || '');
    setModalError('');
    setModalSavedSuccess(false);
    setActiveModal('notes');
  };

  const openCodeModal = (q) => {
    setActiveQuestion(q);
    setModalNotes(q.notes || '');
    setModalCode(q.code || '');
    setModalError('');
    setModalSavedSuccess(false);
    setActiveModal('code');
  };

  const openCombinedModal = (q) => {
    setActiveQuestion(q);
    setModalNotes(q.notes || '');
    setModalCode(q.code || '');
    setModalError('');
    setModalSavedSuccess(false);
    setActiveModal('both');
  };

  const closeModal = () => {
    setActiveModal(null);
    setActiveQuestion(null);
    setModalNotes('');
    setModalCode('');
    setModalError('');
    setModalSavedSuccess(false);
  };

  const handleSaveModalData = async () => {
    setModalSaving(true);
    setModalError('');
    setModalSavedSuccess(false);

    try {
      const updated = await questionService.updateQuestion(activeQuestion.id, {
        notes: modalNotes,
        code: modalCode
      });

      // Update question in local list state
      setQuestions(questions.map(q => q.id === activeQuestion.id ? updated : q));
      setActiveQuestion(updated);
      setModalSavedSuccess(true);

      setTimeout(() => {
        setModalSavedSuccess(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setModalError('Save failed. Could not save notes and code.');
    } finally {
      setModalSaving(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Instant filter search logic
  const filteredQuestions = questions.filter(q =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!authorized) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Checking authorization...</div>;
  }

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading todo details...</div>;
  }

  return (
    <div className="detail-layout" style={{ flex: 1 }}>
      {/* Back button and title */}
      <div className="detail-header">
        <div>
          <button className="btn btn-secondary" style={{ marginBottom: '12px', padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => router.back()}>
            &larr; Back to Dashboard
          </button>
          {todo && <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-heading)' }}>{todo.title}</h2>}
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      {/* Add question form */}
      <div>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '12px', color: 'var(--text-heading)' }}>Add Coding Question</h3>
        <form onSubmit={handleAddQuestion} style={{ display: 'flex', gap: '12px', maxWidth: '600px' }}>
          <input
            type="text"
            placeholder="Question title (e.g. Reverse a String, Binary Search)..."
            className="form-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>Add Question</button>
        </form>
      </div>

      {/* Questions list */}
      <div>
        <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', color: 'var(--text-heading)' }}>Questions</h3>
        {filteredQuestions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No questions found</div>
            <p>
              {searchQuery 
                ? 'No questions match your search query.' 
                : 'No questions added yet. Create your first coding question above.'}
            </p>
          </div>
        ) : (
          <div className="list-section">
            {filteredQuestions.map((q) => (
              <div key={q.id} className="list-item">
                <div style={{ flex: 1, marginRight: '16px' }}>
                  {editingId === q.id ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        required
                      />
                      <button className="btn btn-success" style={{ padding: '8px 12px', fontSize: '0.8rem' }} onClick={() => handleSaveTitle(q.id)}>
                        Save
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem' }} onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span 
                      className="list-item-title" 
                      onClick={() => openCombinedModal(q)}
                      style={{ cursor: 'pointer', fontWeight: '600', color: 'var(--text-heading)' }}
                    >
                      {q.title}
                    </span>
                  )}
                </div>
                {editingId !== q.id && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }} 
                      onClick={() => openNotesModal(q)}
                    >
                      {q.notes && q.notes.trim() !== '' ? 'Notes' : 'Add Notes'}
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }} 
                      onClick={() => openCodeModal(q)}
                    >
                      {q.code && q.code.trim() !== '' ? 'Code' : 'Add Code'}
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleStartEdit(q)}>
                      Edit
                    </button>
                    <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleDelete(q.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Modal Editor Popup */}
      {activeModal && activeQuestion && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <span className="modal-title">{activeQuestion.title}</span>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={closeModal}
              >
                Close &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {modalError && <div className="login-error" style={{ marginBottom: '16px' }}>{modalError}</div>}
              
              <div className={`modal-editor-grid ${activeModal === 'both' ? 'split' : ''}`} style={{ flex: 1 }}>
                {/* Notes Column */}
                {(activeModal === 'notes' || activeModal === 'both') && (
                  <div className="editor-pane">
                    <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px' }}>Notes</label>
                    <textarea
                      className="notes-textarea"
                      placeholder="Write notes here... (e.g. approach, time complexity, tips)"
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      style={{ height: '100%' }}
                    />
                  </div>
                )}

                {/* Code Column */}
                {(activeModal === 'code' || activeModal === 'both') && (
                  <div className="editor-pane">
                    <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px' }}>Java Code Editor</label>
                    <div className="monaco-wrapper" style={{ height: '100%', minHeight: '300px' }}>
                      <Editor
                        height="100%"
                        defaultLanguage="java"
                        theme="vs-dark"
                        value={modalCode}
                        onChange={(value) => setModalCode(value || '')}
                        options={{
                          selectOnLineNumbers: true,
                          lineNumbers: 'on',
                          wordWrap: 'on',
                          autoClosingBrackets: 'always',
                          minimap: { enabled: false },
                          fontSize: 14,
                          automaticLayout: true
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <div className="modal-footer-left">
                {modalSavedSuccess && (
                  <div className="save-indicator">
                    Saved Successfully
                  </div>
                )}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Last Updated: {formatTimestamp(activeQuestion.updated_at)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-secondary" onClick={closeModal}>
                  Close
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSaveModalData}
                  disabled={modalSaving}
                >
                  {modalSaving ? 'Saving...' : 'Save Notes & Code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TodoDetailPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <Layout searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
        <TodoDetailContent searchQuery={searchQuery} />
      </Layout>
    </Suspense>
  );
}
