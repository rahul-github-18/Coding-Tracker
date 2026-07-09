"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { todoService } from '@/lib/api';

function DashboardContent({ searchQuery }) {
  const [todos, setTodos] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');

  // Verify authorization on mount
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      router.replace('/login');
    } else {
      setAuthorized(true);
      fetchTodos();
    }
  }, [router]);

  const fetchTodos = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await todoService.getTodos();
      setTodos(data);
    } catch (err) {
      console.error(err);
      setError('Database connection failed. Please ensure the database is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setError('');

    try {
      const created = await todoService.createTodo(newTitle);
      // Initialize with empty questions array for client-side search matching
      setTodos([{ ...created, questions: [] }, ...todos]);
      setNewTitle('');
    } catch (err) {
      console.error(err);
      setError('Save failed. Could not create todo item.');
    }
  };

  const handleToggleComplete = async (id, currentStatus) => {
    setError('');
    try {
      const updated = await todoService.updateTodo(id, { completed: !currentStatus });
      setTodos(todos.map(todo => (todo.id === id ? { ...todo, completed: updated.completed } : todo)));
    } catch (err) {
      console.error(err);
      setError('Save failed. Could not update task status.');
    }
  };

  const handleStartEdit = (todo) => {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
  };

  const handleSaveTitle = async (id) => {
    if (!editingTitle.trim()) return;
    setError('');
    try {
      const updated = await todoService.updateTodo(id, { title: editingTitle.trim() });
      setTodos(todos.map(todo => (todo.id === id ? { ...todo, title: updated.title } : todo)));
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setError('Save failed. Could not update todo title.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this todo and all of its questions?')) {
      return;
    }
    setError('');
    try {
      await todoService.deleteTodo(id);
      setTodos(todos.filter(todo => todo.id !== id));
    } catch (err) {
      console.error(err);
      setError('Delete failed. Could not remove todo item.');
    }
  };

  // Date check helpers
  const getTodayStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Filter and search logic
  const filteredTodos = todos.filter(todo => {
    // 1. Date Filter
    if (filter === 'today') {
      const todayStr = getTodayStr();
      if (todo.created_date !== todayStr) {
        return false;
      }
    }

    // 2. Search Filter (Todo title OR Question title)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchTodoTitle = todo.title.toLowerCase().includes(query);
      const matchQuestionTitle = todo.questions && todo.questions.some(q => 
        q.title.toLowerCase().includes(query)
      );
      return matchTodoTitle || matchQuestionTitle;
    }

    return true;
  });

  if (!authorized) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Checking authorization...</div>;
  }

  // If no filter is active, show only the Welcome Banner on the Dashboard
  if (!filter) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
        <div style={{ maxWidth: '800px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--link-color)', margin: 0, letterSpacing: '-0.5px' }}>
            Welcome to CodeDiary!
          </h1>
          
          <p style={{ fontSize: '1.05rem', color: 'var(--text-color)', lineHeight: '1.8', margin: 0, textAlign: 'justify' }}>
            CodeDiary is a clean, responsive full-stack web application built to organize your daily coding journey. Create study topics, add multiple programming questions, write detailed notes, and save complete Java solutions using the Monaco Editor with syntax highlighting. Instantly search your study material, share temporary code snippets with a 15-minute expiration, and export your entire coding diary—including notes and source code—as professionally formatted PDF documents. Designed with a simple, distraction-free interface, CodeDiary serves as a personal coding notebook to help you learn, practice, and revisit your programming progress efficiently.
          </p>

          <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '16px', marginTop: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Built with ❤️ by Rahul Ranjan
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--text-heading)' }}>
        {filter === 'today' ? "Today's Tasks" : 'All Coding Tasks'}
      </h2>

      {error && <div className="login-error" style={{ marginBottom: '20px' }}>{error}</div>}

      {/* Todo creation form */}
      <form onSubmit={handleAddTodo} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Add a new topic/language (e.g. Java, React, SQL)..."
          className="form-input"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={{ maxWidth: '400px' }}
          required
        />
        <button type="submit" className="btn btn-primary">Add Todo</button>
      </form>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading coding tasks...</div>
      ) : filteredTodos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No todos found</div>
          <p>
            {searchQuery 
              ? 'No todos or questions match your search.' 
              : filter === 'today' 
                ? "No tasks created today. Click above to add today's study topic!" 
                : 'Your notebook is empty. Create your first topic above.'}
          </p>
        </div>
      ) : (
        <div className="todos-grid">
          {filteredTodos.map((todo) => (
            <div key={todo.id} className="card">
              <div className="card-header">
                {editingId === todo.id ? (
                  <div style={{ width: '100%' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      style={{ marginBottom: '8px' }}
                      required
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleSaveTitle(todo.id)}>
                        Save
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 
                      className={`card-title ${todo.completed ? 'completed' : ''}`}
                      onClick={() => router.push(`/todo/${todo.id}`)}
                    >
                      {todo.title}
                    </h3>
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => handleToggleComplete(todo.id, todo.completed)}
                      />
                      Done
                    </label>
                  </>
                )}
              </div>
              <div className="card-footer">
                <span className="card-date">Date: {todo.created_date ? todo.created_date.split('T')[0] : ''}</span>
                {editingId !== todo.id && (
                  <div className="card-actions">
                    <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={() => router.push(`/todo/${todo.id}`)}>
                      Questions
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={() => handleStartEdit(todo)}>
                      Edit
                    </button>
                    <button className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={() => handleDelete(todo.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <Layout searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
        <DashboardContent searchQuery={searchQuery} />
      </Layout>
    </Suspense>
  );
}
