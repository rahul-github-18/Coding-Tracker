"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Editor from '@monaco-editor/react';
import Layout from '@/components/Layout';
import { todoService, questionService, codeService, noteService, taskService } from '@/lib/api';

function NotesCodeModal({ activeModal, activeQuestion, closeModal, onSave, readOnly }) {
  const [notes, setNotes] = useState(activeQuestion.notes || '');
  const [code, setCode] = useState(activeQuestion.code || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    if (readOnly) return;
    setSaving(true);
    setError('');
    setSavedSuccess(false);
    try {
      await onSave(notes, code);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError('Save failed. Could not save notes and code.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    alert('Code copied to clipboard!');
  };

  return (
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
          {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}
          
          <div className="modal-editor-grid split" style={{ flex: 1 }}>
            {/* Notes Column */}
            <div className="editor-pane">
              <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px' }}>Explanation & Notes</label>
              <textarea
                className="notes-textarea"
                placeholder={readOnly ? "No notes available." : "Write notes here... (e.g. approach, time complexity, tips)"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ height: '100%' }}
                disabled={readOnly}
              />
            </div>

            {/* Code Column */}
            <div className="editor-pane">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ fontWeight: '600', margin: 0 }}>Working Code</label>
                <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={handleCopyCode}>
                  Copy Code
                </button>
              </div>
              <div className="monaco-wrapper" style={{ height: '100%', minHeight: '300px' }}>
                <Editor
                  height="100%"
                  defaultLanguage="java"
                  theme="vs-dark"
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  options={{
                    selectOnLineNumbers: true,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    autoClosingBrackets: 'always',
                    minimap: { enabled: false },
                    fontSize: 14,
                    automaticLayout: true,
                    readOnly: readOnly
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="modal-footer-left">
            {savedSuccess && (
              <div className="save-indicator">
                Saved Successfully
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={closeModal}>
              Close
            </button>
            {!readOnly && (
              <button 
                className="btn btn-primary" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Notes & Code'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TodoDetailContent({ searchQuery }) {
  const { id: topicId } = useParams();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [topic, setTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [codeExamples, setCodeExamples] = useState([]);
  const [notes, setNotes] = useState([]);
  
  // Tab State
  const [activeTab, setActiveTab] = useState('questions'); // 'questions', 'examples', 'notes'

  // Input states
  const [newQTitle, setNewQTitle] = useState('');
  const [newQDifficulty, setNewQDifficulty] = useState('Beginner');
  const [newQTags, setNewQTags] = useState('');
  const [newQDesc, setNewQDesc] = useState('');
  
  const [newExTitle, setNewExTitle] = useState('');
  const [newExLang, setNewExLang] = useState('Java');
  const [newExCode, setNewExCode] = useState('');
  const [newExExplanation, setNewExExplanation] = useState('');

  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal States
  const [activeQuestion, setActiveQuestion] = useState(null);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      router.replace('/login');
    } else {
      try {
        const u = JSON.parse(localStorage.getItem('currentUser'));
        setUser(u);
        fetchData();
      } catch (e) {
        localStorage.clear();
        router.replace('/login');
      }
    }
  }, [topicId, router]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetching topic detail via api
      const res = await fetch(`/api/topics/${topicId}`, {
        headers: { 'x-user-id': localStorage.getItem('userId') }
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Topic not found');
      }
      
      setTopic(data);
      setQuestions(data.questions || []);
      setCodeExamples(data.codeExamples || []);
      setNotes(data.notes || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to retrieve topic details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    if (!newQTitle.trim()) return;
    setError('');
    setSuccess('');

    try {
      const created = await questionService.createQuestion(topicId, {
        title: newQTitle.trim(),
        description: newQDesc,
        difficulty: newQDifficulty,
        tags: newQTags,
        answer: '',
        code: '',
        explanation: ''
      });
      setQuestions([...questions, { ...created, status: 'Pending', saved_for_later: false }]);
      setNewQTitle('');
      setNewQDesc('');
      setNewQTags('');
      setSuccess('Question added successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Could not add question. Insufficient permissions.');
    }
  };

  const handleAddExample = async (e) => {
    e.preventDefault();
    if (!newExCode.trim()) return;
    setError('');
    setSuccess('');

    try {
      const created = await codeService.createExample(topicId, {
        title: newExTitle.trim(),
        language: newExLang,
        code: newExCode,
        explanation: newExExplanation
      });
      setCodeExamples([...codeExamples, { ...created, status: 'Pending', saved_for_later: false }]);
      setNewExTitle('');
      setNewExCode('');
      setNewExExplanation('');
      setSuccess('Code example added successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Could not add example. Insufficient permissions.');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    setError('');
    setSuccess('');

    try {
      const created = await noteService.createNote(topicId, {
        title: newNoteTitle.trim(),
        content: newNoteContent
      });
      setNotes([...notes, { ...created, status: 'Pending', saved_for_later: false }]);
      setNewNoteTitle('');
      setNewNoteContent('');
      setSuccess('Note added successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Could not add note. Insufficient permissions.');
    }
  };

  const handleDeleteItem = async (itemId, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    setError('');
    setSuccess('');

    try {
      if (type === 'question') {
        await questionService.deleteQuestion(itemId);
        setQuestions(questions.filter(q => q.id !== itemId));
      } else if (type === 'code_example') {
        await codeService.deleteExample(itemId);
        setCodeExamples(codeExamples.filter(e => e.id !== itemId));
      } else if (type === 'note') {
        await noteService.deleteNote(itemId);
        setNotes(notes.filter(n => n.id !== itemId));
      }
      setSuccess(`${type} deleted successfully.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(`Failed to delete ${type}. Insufficient permissions.`);
    }
  };

  const handleTaskAction = async (itemId, type, action) => {
    if (user && !user.approved && user.role !== 'admin') {
      setError('Your account is pending admin approval. You cannot add or modify tasks.');
      return;
    }
    setError('');
    setSuccess('');
    try {
      let status = 'Pending';
      let saved = false;

      if (action === 'today') {
        status = 'Pending';
      } else if (action === 'later') {
        saved = true;
      } else if (action === 'complete') {
        status = 'Completed';
      }

      await taskService.addTask(type, itemId, status, saved);
      setSuccess('Added to your dashboard productivity list.');
      fetchData(); // Reload status indicator
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update task.');
    }
  };

  const handleSaveModalData = async (notes, code) => {
    const updated = await questionService.updateQuestion(activeQuestion.id, {
      notes,
      code
    });
    setQuestions(questions.map(q => q.id === activeQuestion.id ? { ...q, notes: updated.notes, code: updated.code } : q));
    setActiveQuestion(updated);
  };

  // Filters
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => q.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [questions, searchQuery]);

  const filteredExamples = useMemo(() => {
    return codeExamples.filter(e => (e.title || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [codeExamples, searchQuery]);

  const filteredNotes = useMemo(() => {
    return notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [notes, searchQuery]);

  if (!user || loading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading topic details...</div>;
  }

  const canEdit = user.role === 'admin' || user.can_edit;
  const canDelete = user.role === 'admin' || user.can_delete;

  return (
    <div className="detail-layout" style={{ flex: 1 }}>
      {user && !user.approved && user.role !== 'admin' && (
        <div style={{ padding: '16px', backgroundColor: '#fef7e0', border: '1px solid #feebc8', borderRadius: '8px', color: '#c05621', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span>⚠️</span>
          <span>Your account is pending admin approval. You can view study notes and questions but cannot add tasks or mark completions.</span>
        </div>
      )}
      {/* Back button and title */}
      <div className="detail-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div>
          <button className="btn btn-secondary" style={{ marginBottom: '12px', padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => router.push('/')}>
            &larr; Back to Dashboard
          </button>
          {topic && (
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-heading)', margin: 0 }}>{topic.title}</h2>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', padding: '2px 8px', backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-muted)', borderRadius: '4px' }}>
                  {topic.category}
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: '500', color: topic.difficulty === 'Advanced' ? '#d93025' : topic.difficulty === 'Intermediate' ? '#b06000' : '#137333' }}>
                  {topic.difficulty} Difficulty
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Est. Completion: {topic.estimated_time}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}
      {success && <div className="save-indicator">{success}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--card-border)', gap: '16px', marginTop: '12px' }}>
        {[
          { key: 'questions', label: `Questions (${questions.length})` },
          { key: 'examples', label: `Code Examples (${codeExamples.length})` },
          { key: 'notes', label: `Study Notes (${notes.length})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 16px',
              fontWeight: '700',
              fontSize: '0.95rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid var(--link-color)' : '3px solid transparent',
              color: activeTab === tab.key ? 'var(--link-color)' : 'var(--text-muted)',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div style={{ marginTop: '20px' }}>
        
        {/* QUESTIONS TAB */}
        {activeTab === 'questions' && (
          <div style={{ display: 'grid', gridTemplateColumns: canEdit ? '3fr 2fr' : '1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* List */}
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', color: 'var(--text-heading)' }}>Curriculum Questions</h3>
              {filteredQuestions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-title">No questions found</div>
                  <p>Create questions or modify the search term.</p>
                </div>
              ) : (
                <div className="list-section">
                  {filteredQuestions.map((q) => (
                    <div key={q.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span 
                            className="list-item-title" 
                            onClick={() => setActiveQuestion(q)}
                            style={{ fontSize: '1.1rem', fontWeight: '700' }}
                          >
                            {q.title}
                          </span>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '500', color: q.difficulty === 'Advanced' ? '#d93025' : q.difficulty === 'Intermediate' ? '#b06000' : '#137333' }}>
                              {q.difficulty}
                            </span>
                            {q.tags && q.tags.split(',').map((tag, idx) => (
                              <span key={idx} style={{ fontSize: '0.7rem', padding: '1px 6px', backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-muted)', borderRadius: '4px' }}>
                                #{tag.trim()}
                              </span>
                            ))}
                          </div>
                          {q.description && (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px', margin: 0 }}>
                              {q.description}
                            </p>
                          )}
                        </div>

                        {/* Completion state badge */}
                        {q.status === 'Completed' && (
                          <span style={{ fontSize: '0.8rem', padding: '2px 8px', backgroundColor: '#e6f4ea', color: '#137333', borderRadius: '4px', fontWeight: '600' }}>
                            ✓ Done
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '10px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleTaskAction(q.id, 'question', 'today')}>
                            Add to Today
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleTaskAction(q.id, 'question', 'later')}>
                            Save for Later
                          </button>
                          <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleTaskAction(q.id, 'question', 'complete')}>
                            Mark Completed
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setActiveQuestion(q)}>
                            Open Code & Explanation
                          </button>
                          {canDelete && (
                            <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleDeleteItem(q.id, 'question')}>
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create form (admin only) */}
            {canEdit && (
              <div className="card" style={{ padding: '20px', minHeight: 'auto' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-heading)' }}>
                  Add Learning Question
                </h3>
                <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input type="text" placeholder="Title (e.g. Find target element)" className="form-input" value={newQTitle} onChange={e => setNewQTitle(e.target.value)} required />
                  <textarea placeholder="Description or question prompt..." className="form-input" style={{ height: '80px' }} value={newQDesc} onChange={e => setNewQDesc(e.target.value)} />
                  <select className="form-input" value={newQDifficulty} onChange={e => setNewQDifficulty(e.target.value)}>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                  <input type="text" placeholder="Tags (e.g. binary-search, array)" className="form-input" value={newQTags} onChange={e => setNewQTags(e.target.value)} />
                  <button type="submit" className="btn btn-success">Save Question</button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* CODE EXAMPLES TAB */}
        {activeTab === 'examples' && (
          <div style={{ display: 'grid', gridTemplateColumns: canEdit ? '3fr 2fr' : '1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-heading)', margin: 0 }}>Syntax-Highlighted Examples</h3>
              {filteredExamples.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-title">No examples found</div>
                  <p>Create code examples or adjust searching filter.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {filteredExamples.map((ex) => (
                    <div key={ex.id} className="card" style={{ minHeight: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-heading)', margin: 0 }}>
                          {ex.title || 'Code Snippet'}
                        </h4>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 8px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                            {ex.language}
                          </span>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }} 
                            onClick={() => {
                              navigator.clipboard.writeText(ex.code);
                              alert('Code copied!');
                            }}
                          >
                            Copy Code
                          </button>
                        </div>
                      </div>

                      <pre style={{ padding: '16px', backgroundColor: '#1e1e1e', color: '#d4d4d4', borderRadius: '8px', fontSize: '0.85rem', overflowX: 'auto', fontFamily: 'monospace', margin: 0, maxHeight: '250px' }}>
                        <code>{ex.code}</code>
                      </pre>

                      {ex.explanation && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-color)', margin: 0 }}>
                          <strong>Explanation:</strong> {ex.explanation}
                        </p>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '12px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleTaskAction(ex.id, 'code_example', 'today')}>
                            Add to Today
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleTaskAction(ex.id, 'code_example', 'later')}>
                            Save for Later
                          </button>
                          <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleTaskAction(ex.id, 'code_example', 'complete')}>
                            Mark Completed
                          </button>
                        </div>
                        {canDelete && (
                          <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleDeleteItem(ex.id, 'code_example')}>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create form (admin only) */}
            {canEdit && (
              <div className="card" style={{ padding: '20px', minHeight: 'auto' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-heading)' }}>
                  Add Code Example
                </h3>
                <form onSubmit={handleAddExample} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input type="text" placeholder="Title (e.g. Stream grouping)" className="form-input" value={newExTitle} onChange={e => setNewExTitle(e.target.value)} required />
                  <input type="text" placeholder="Programming Language (e.g. Java)" className="form-input" value={newExLang} onChange={e => setNewExLang(e.target.value)} />
                  <textarea placeholder="Paste source code here..." className="form-input" style={{ height: '180px', fontFamily: 'monospace' }} value={newExCode} onChange={e => setNewExCode(e.target.value)} required />
                  <textarea placeholder="Explanation..." className="form-input" style={{ height: '60px' }} value={newExExplanation} onChange={e => setNewExExplanation(e.target.value)} />
                  <button type="submit" className="btn btn-success">Save Example</button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div style={{ display: 'grid', gridTemplateColumns: canEdit ? '3fr 2fr' : '1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* List */}
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', color: 'var(--text-heading)' }}>Topic Explanation Notes</h3>
              {filteredNotes.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-title">No notes found</div>
                  <p>Create explanation notes for study.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {filteredNotes.map((note) => (
                    <div key={note.id} className="card" style={{ minHeight: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-heading)', margin: 0 }}>
                        {note.title}
                      </h4>
                      <p style={{ fontSize: '0.95rem', color: 'var(--text-color)', lineHeight: '1.7', whiteSpace: 'pre-wrap', margin: 0 }}>
                        {note.content}
                      </p>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '12px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleTaskAction(note.id, 'note', 'today')}>
                            Add to Today
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleTaskAction(note.id, 'note', 'later')}>
                            Save for Later
                          </button>
                          <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleTaskAction(note.id, 'note', 'complete')}>
                            Mark Completed
                          </button>
                        </div>
                        {canDelete && (
                          <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleDeleteItem(note.id, 'note')}>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create form (admin only) */}
            {canEdit && (
              <div className="card" style={{ padding: '20px', minHeight: 'auto' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-heading)' }}>
                  Add Study Note
                </h3>
                <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input type="text" placeholder="Title (e.g. Space complexity review)" className="form-input" value={newNoteTitle} onChange={e => setNewNoteTitle(e.target.value)} required />
                  <textarea placeholder="Write explanation or content notes here..." className="form-input" style={{ height: '220px' }} value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)} required />
                  <button type="submit" className="btn btn-success">Save Note</button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Modal Editor Popup */}
      {activeQuestion && (
        <NotesCodeModal
          activeModal="both"
          activeQuestion={activeQuestion}
          closeModal={() => setActiveQuestion(null)}
          onSave={handleSaveModalData}
          readOnly={!canEdit}
        />
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
