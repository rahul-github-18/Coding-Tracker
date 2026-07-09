"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Editor from '@monaco-editor/react';
import Layout from '@/components/Layout';
import { questionService } from '@/lib/api';

function QuestionDetailContent() {
  const { id: questionId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [question, setQuestion] = useState(null);
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      router.replace('/login');
    } else {
      setAuthorized(true);
      fetchQuestionDetails();
    }
  }, [questionId, router]);

  const fetchQuestionDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const focus = searchParams.get('focus');

      const data = await questionService.getQuestion(questionId);
      setQuestion(data);
      setNotes(data.notes || '');
      setCode(data.code || '');
      // Automatically show sections if they already contain notes or code, OR if specified in focus param
      setShowNotes((!!data.notes && data.notes.trim() !== '') || focus === 'notes');
      setShowCode((!!data.code && data.code.trim() !== '') || focus === 'code');
    } catch (err) {
      console.error(err);
      setError('Database connection failed. Could not retrieve question details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSavedSuccess(false);

    try {
      // Send cleared values if panels are hidden
      const updated = await questionService.updateQuestion(questionId, {
        notes: showNotes ? notes : '',
        code: showCode ? code : ''
      });
      setQuestion(updated);
      setNotes(updated.notes || '');
      setCode(updated.code || '');
      setSavedSuccess(true);
      // Auto-hide indicator after 3 seconds
      setTimeout(() => {
        setSavedSuccess(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setError('Save failed. Could not write data to the database.');
    } finally {
      setSaving(false);
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
      second: '2-digit',
      hour12: true
    });
  };

  if (!authorized) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Checking authorization...</div>;
  }

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading question editor...</div>;
  }

  return (
    <div className="detail-layout" style={{ flex: 1 }}>
      {/* Header and Back navigation */}
      <div className="detail-header">
        <div>
          <button 
            className="btn btn-secondary" 
            style={{ marginBottom: '12px', padding: '6px 12px', fontSize: '0.85rem' }} 
            onClick={() => {
              if (question?.todo_id) {
                router.push(`/todo/${question.todo_id}`);
              } else {
                router.back();
              }
            }}
          >
            &larr; Back to Questions List
          </button>
          {question && <h2 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-heading)' }}>{question.title}</h2>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {savedSuccess && (
            <div className="save-indicator">
              Saved Successfully
            </div>
          )}
          {question && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Last Updated: {formatTimestamp(question.updated_at)}
            </div>
          )}
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Notes & Code'}
          </button>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}

      {/* Action Buttons to Show Hidden Sections */}
      <div style={{ display: 'flex', gap: '12px', margin: '4px 0' }}>
        {!showNotes && (
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowNotes(true)}
            style={{ border: '1px dashed var(--link-color)', color: 'var(--link-color)', padding: '8px 16px' }}
          >
            + Add Notes
          </button>
        )}
        {!showCode && (
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowCode(true)}
            style={{ border: '1px dashed var(--link-color)', color: 'var(--link-color)', padding: '8px 16px' }}
          >
            + Add Code
          </button>
        )}
      </div>

      {/* Editor Layout Grid */}
      {(showNotes || showCode) ? (
        <div 
          style={{ 
            display: 'grid',
            gridTemplateColumns: showNotes && showCode ? '1fr 1fr' : '1fr',
            gap: '24px',
            marginTop: '16px',
            height: '500px'
          }}
        >
          {/* Notes Panel */}
          {showNotes && (
            <div className="editor-pane">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ fontWeight: '600', margin: 0 }}>Notes</label>
                <button 
                  className="btn" 
                  style={{ padding: '2px 8px', fontSize: '0.75rem', backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-muted)' }}
                  onClick={() => setShowNotes(false)}
                >
                  Hide Notes
                </button>
              </div>
              <textarea
                className="notes-textarea"
                placeholder="Write notes here... (e.g. approach, time complexity, tips)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}

          {/* Monaco Editor Panel */}
          {showCode && (
            <div className="editor-pane">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ fontWeight: '600', margin: 0 }}>Java Code Editor</label>
                <button 
                  className="btn" 
                  style={{ padding: '2px 8px', fontSize: '0.75rem', backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-muted)' }}
                  onClick={() => setShowCode(false)}
                >
                  Hide Code
                </button>
              </div>
              <div className="monaco-wrapper">
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
                    automaticLayout: true
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '80px 24px' }}>
          <div className="empty-state-title">No Active Panels</div>
          <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>This question does not have any notes or code active. Use the buttons below or at the top to add them.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => setShowNotes(true)}>+ Add Notes</button>
            <button className="btn btn-primary" onClick={() => setShowCode(true)}>+ Add Code</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuestionDetailPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <Layout searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
        <QuestionDetailContent />
      </Layout>
    </Suspense>
  );
}
