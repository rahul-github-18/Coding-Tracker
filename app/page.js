"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { todoService, userService, taskService } from '@/lib/api';

function DashboardContent({ searchQuery }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Admin states
  const [adminStats, setAdminStats] = useState({
    topicsCount: 0,
    questionsCount: 0,
    notesCount: 0,
    examplesCount: 0,
    usersCount: 0
  });
  const [usersList, setUsersList] = useState([]);
  
  // User states
  const [userTasks, setUserTasks] = useState([]);
  const [userStats, setUserStats] = useState({
    streak: 0,
    completedTasksCount: 0,
    completedTopicsCount: 0,
    totalTopicsCount: 0,
    learningPercentage: 0,
    weeklyActivity: [],
    recommendations: []
  });

  // Common listing
  const [topics, setTopics] = useState([]);

  // Forms / Modals States
  const [activeForm, setActiveForm] = useState(null); // 'topic', 'question', 'code', 'note'
  const [newTopic, setNewTopic] = useState({ title: '', category: 'General', difficulty: 'Beginner', estimatedTime: '1 hour' });
  const [newQuestion, setNewQuestion] = useState({ topicId: '', title: '', description: '', difficulty: 'Beginner', tags: '', answer: '', code: '', explanation: '' });
  const [newExample, setNewExample] = useState({ topicId: '', title: '', language: 'Java', code: '', explanation: '', notes: '' });
  const [newNote, setNewNote] = useState({ topicId: '', title: '', content: '' });

  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');

  // Load user from localStorage
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      router.replace('/login');
    } else {
      try {
        const u = JSON.parse(localStorage.getItem('currentUser'));
        setUser(u);
        loadDashboardData(u);
      } catch (e) {
        localStorage.clear();
        router.replace('/login');
      }
    }
  }, [router, filter]);

  const loadDashboardData = async (u) => {
    setLoading(true);
    setError('');
    try {
      if (u.role === 'admin') {
        // Load admin data
        const [allTopics, allUsers] = await Promise.all([
          todoService.getTodos(),
          userService.getUsers()
        ]);
        setTopics(allTopics);
        setUsersList(allUsers);

        // Compute counts
        let qCount = 0;
        let eCount = 0;
        let nCount = 0;
        allTopics.forEach(t => {
          qCount += parseInt(t.total_questions || 0, 10);
          eCount += parseInt(t.total_examples || 0, 10);
          nCount += parseInt(t.total_notes || 0, 10);
        });

        setAdminStats({
          topicsCount: allTopics.length,
          questionsCount: qCount,
          examplesCount: eCount,
          notesCount: nCount,
          usersCount: allUsers.length
        });
      } else {
        // Load user data
        const [tasks, stats, allTopics] = await Promise.all([
          taskService.getUserTasks(),
          taskService.getUserStats(),
          todoService.getTodos()
        ]);
        setUserTasks(tasks);
        setUserStats(stats);
        setTopics(allTopics);
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to database. Please make sure the local PostgreSQL database is running.');
    } finally {
      setLoading(false);
    }
  };

  // Admin actions
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopic.title.trim()) return;
    setError('');
    setSuccess('');
    try {
      await todoService.createTopic || todoService.createTodo(
        newTopic.title,
        newTopic.category,
        newTopic.difficulty,
        newTopic.estimatedTime
      );
      setSuccess('Topic created successfully!');
      setNewTopic({ title: '', category: 'General', difficulty: 'Beginner', estimatedTime: '1 hour' });
      setActiveForm(null);
      loadDashboardData(user);
    } catch (err) {
      setError(err.message || 'Failed to create topic.');
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.topicId || !newQuestion.title.trim()) return;
    setError('');
    setSuccess('');
    try {
      const { questionService } = await import('@/lib/api');
      await questionService.createQuestion(newQuestion.topicId, {
        title: newQuestion.title,
        description: newQuestion.description,
        difficulty: newQuestion.difficulty,
        tags: newQuestion.tags,
        answer: newQuestion.answer,
        code: newQuestion.code,
        explanation: newQuestion.explanation
      });
      setSuccess('Question added successfully!');
      setNewQuestion({ topicId: '', title: '', description: '', difficulty: 'Beginner', tags: '', answer: '', code: '', explanation: '' });
      setActiveForm(null);
      loadDashboardData(user);
    } catch (err) {
      setError(err.message || 'Failed to create question.');
    }
  };

  const handleCreateExample = async (e) => {
    e.preventDefault();
    if (!newExample.topicId || !newExample.code.trim()) return;
    setError('');
    setSuccess('');
    try {
      const { codeService } = await import('@/lib/api');
      await codeService.createExample(newExample.topicId, {
        title: newExample.title,
        language: newExample.language,
        code: newExample.code,
        explanation: newExample.explanation,
        notes: newExample.notes
      });
      setSuccess('Code example added successfully!');
      setNewExample({ topicId: '', title: '', language: 'Java', code: '', explanation: '', notes: '' });
      setActiveForm(null);
      loadDashboardData(user);
    } catch (err) {
      setError(err.message || 'Failed to create code example.');
    }
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!newNote.topicId || !newNote.title.trim() || !newNote.content.trim()) return;
    setError('');
    setSuccess('');
    try {
      const { noteService } = await import('@/lib/api');
      await noteService.createNote(newNote.topicId, {
        title: newNote.title,
        content: newNote.content
      });
      setSuccess('Note added successfully!');
      setNewNote({ topicId: '', title: '', content: '' });
      setActiveForm(null);
      loadDashboardData(user);
    } catch (err) {
      setError(err.message || 'Failed to create note.');
    }
  };

  const handleApproveUser = async (uId) => {
    setError('');
    try {
      await userService.approveUser(uId);
      setSuccess('User enrollment approved!');
      loadDashboardData(user);
    } catch (err) {
      setError(err.message || 'Failed to approve user.');
    }
  };

  const handleTogglePermission = async (uId, field, currentValue) => {
    setError('');
    try {
      const updateData = { [field]: !currentValue };
      await userService.updatePermissions(uId, updateData);
      setSuccess('User permissions updated successfully.');
      loadDashboardData(user);
    } catch (err) {
      setError(err.message || 'Failed to update permissions.');
    }
  };

  const handleRoleChange = async (uId, newRole) => {
    setError('');
    try {
      await userService.updatePermissions(uId, { role: newRole });
      setSuccess('User role updated.');
      loadDashboardData(user);
    } catch (err) {
      setError(err.message || 'Failed to update role.');
    }
  };

  // User Actions
  const handleUpdateTaskStatus = async (taskId, currentStatus) => {
    setError('');
    try {
      let nextStatus = 'Pending';
      if (currentStatus === 'Pending') nextStatus = 'In Progress';
      else if (currentStatus === 'In Progress') nextStatus = 'Completed';
      
      await taskService.updateTask(taskId, { status: nextStatus });
      loadDashboardData(user);
    } catch (err) {
      setError('Failed to update task status.');
    }
  };

  const handleRemoveTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to remove this task from Today\'s Tasks?')) return;
    setError('');
    try {
      await taskService.removeTask(taskId);
      loadDashboardData(user);
    } catch (err) {
      setError('Failed to remove task.');
    }
  };

  const handleQuickAdd = async (itemId, type) => {
    setError('');
    setSuccess('');
    try {
      await taskService.addTask(type, itemId, 'Pending');
      setSuccess('Item added to your daily tasks!');
      loadDashboardData(user);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Item is already in your tasks list.');
    }
  };

  // Memoized filter lists
  const filteredTopics = useMemo(() => {
    return topics.filter(topic => {
      if (searchQuery) {
        return topic.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
               topic.category.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [topics, searchQuery]);

  if (!user) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  // RENDER ADMIN DASHBOARD
  if (user.role === 'admin') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-heading)', margin: 0 }}>
              Admin Management Console
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
              Manage curriculum topics, review enrollments, and configure security permissions.
            </p>
          </div>
        </div>

        {error && <div className="login-error">{error}</div>}
        {success && <div className="save-indicator" style={{ marginBottom: '12px' }}>{success}</div>}

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
          {[
            { title: 'Total Topics', count: adminStats.topicsCount, color: 'from-blue-500 to-indigo-500' },
            { title: 'Total Questions', count: adminStats.questionsCount, color: 'from-sky-400 to-blue-500' },
            { title: 'Total Notes', count: adminStats.notesCount, color: 'from-violet-500 to-purple-500' },
            { title: 'Code Examples', count: adminStats.examplesCount, color: 'from-emerald-500 to-teal-500' },
            { title: 'Total Users', count: adminStats.usersCount, color: 'from-pink-500 to-rose-500' }
          ].map((card, idx) => (
            <div key={idx} className="card" style={{ minHeight: '120px', padding: '16px', position: 'relative', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {card.title}
              </span>
              <h3 style={{ fontSize: '2.25rem', fontWeight: '800', color: 'var(--text-heading)', marginTop: '8px', margin: 0 }}>
                {card.count}
              </h3>
            </div>
          ))}
        </div>

        {/* Quick Actions Panel */}
        <div className="card" style={{ minHeight: 'auto', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-heading)' }}>
            Quick Actions
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setActiveForm(activeForm === 'topic' ? null : 'topic')}>
              + Add Topic
            </button>
            <button className="btn btn-primary" onClick={() => setActiveForm(activeForm === 'question' ? null : 'question')}>
              + Add Question
            </button>
            <button className="btn btn-primary" onClick={() => setActiveForm(activeForm === 'code' ? null : 'code')}>
              + Add Code
            </button>
            <button className="btn btn-primary" onClick={() => setActiveForm(activeForm === 'note' ? null : 'note')}>
              + Add Note
            </button>
          </div>

          {/* Quick Action Forms */}
          {activeForm === 'topic' && (
            <form onSubmit={handleCreateTopic} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px', padding: '16px', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <h4 style={{ fontWeight: '600', color: 'var(--text-heading)' }}>Create New Topic</h4>
              <input type="text" placeholder="Topic Title (e.g. React Hooks)" className="form-input" value={newTopic.title} onChange={e => setNewTopic({ ...newTopic, title: e.target.value })} required />
              <input type="text" placeholder="Category (e.g. React)" className="form-input" value={newTopic.category} onChange={e => setNewTopic({ ...newTopic, category: e.target.value })} />
              <div style={{ display: 'flex', gap: '12px' }}>
                <select className="form-input" value={newTopic.difficulty} onChange={e => setNewTopic({ ...newTopic, difficulty: e.target.value })}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <input type="text" placeholder="Est. Time (e.g. 2 hours)" className="form-input" value={newTopic.estimatedTime} onChange={e => setNewTopic({ ...newTopic, estimatedTime: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-success">Save Topic</button>
            </form>
          )}

          {activeForm === 'question' && (
            <form onSubmit={handleCreateQuestion} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px', padding: '16px', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <h4 style={{ fontWeight: '600', color: 'var(--text-heading)' }}>Add Question</h4>
              <select className="form-input" value={newQuestion.topicId} onChange={e => setNewQuestion({ ...newQuestion, topicId: e.target.value })} required>
                <option value="">-- Select Topic --</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              <input type="text" placeholder="Question Title (e.g. What is useEffect?)" className="form-input" value={newQuestion.title} onChange={e => setNewQuestion({ ...newQuestion, title: e.target.value })} required />
              <textarea placeholder="Description / Prompt" className="form-input" style={{ height: '80px' }} value={newQuestion.description} onChange={e => setNewQuestion({ ...newQuestion, description: e.target.value })} />
              <div style={{ display: 'flex', gap: '12px' }}>
                <select className="form-input" value={newQuestion.difficulty} onChange={e => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <input type="text" placeholder="Tags (comma separated)" className="form-input" value={newQuestion.tags} onChange={e => setNewQuestion({ ...newQuestion, tags: e.target.value })} />
              </div>
              <textarea placeholder="Answer explanation" className="form-input" style={{ height: '80px' }} value={newQuestion.answer} onChange={e => setNewQuestion({ ...newQuestion, answer: e.target.value })} />
              <textarea placeholder="Optional initial Java code example" className="form-input" style={{ height: '100px', fontFamily: 'monospace' }} value={newQuestion.code} onChange={e => setNewQuestion({ ...newQuestion, code: e.target.value })} />
              <textarea placeholder="Explanation" className="form-input" style={{ height: '60px' }} value={newQuestion.explanation} onChange={e => setNewQuestion({ ...newQuestion, explanation: e.target.value })} />
              <button type="submit" className="btn btn-success">Save Question</button>
            </form>
          )}

          {activeForm === 'code' && (
            <form onSubmit={handleCreateExample} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px', padding: '16px', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <h4 style={{ fontWeight: '600', color: 'var(--text-heading)' }}>Add Code Example</h4>
              <select className="form-input" value={newExample.topicId} onChange={e => setNewExample({ ...newExample, topicId: e.target.value })} required>
                <option value="">-- Select Topic --</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              <input type="text" placeholder="Example Title (e.g. Lambda sorting)" className="form-input" value={newExample.title} onChange={e => setNewExample({ ...newExample, title: e.target.value })} />
              <input type="text" placeholder="Programming Language (e.g. Java)" className="form-input" value={newExample.language} onChange={e => setNewExample({ ...newExample, language: e.target.value })} />
              <textarea placeholder="Code block content..." className="form-input" style={{ height: '140px', fontFamily: 'monospace' }} value={newExample.code} onChange={e => setNewExample({ ...newExample, code: e.target.value })} required />
              <textarea placeholder="Explanation" className="form-input" style={{ height: '60px' }} value={newExample.explanation} onChange={e => setNewExample({ ...newExample, explanation: e.target.value })} />
              <textarea placeholder="Additional Notes" className="form-input" style={{ height: '60px' }} value={newExample.notes} onChange={e => setNewExample({ ...newExample, notes: e.target.value })} />
              <button type="submit" className="btn btn-success">Save Code Example</button>
            </form>
          )}

          {activeForm === 'note' && (
            <form onSubmit={handleCreateNote} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px', padding: '16px', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <h4 style={{ fontWeight: '600', color: 'var(--text-heading)' }}>Add Note</h4>
              <select className="form-input" value={newNote.topicId} onChange={e => setNewNote({ ...newNote, topicId: e.target.value })} required>
                <option value="">-- Select Topic --</option>
                {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              <input type="text" placeholder="Note Title (e.g. Time Complexity overview)" className="form-input" value={newNote.title} onChange={e => setNewNote({ ...newNote, title: e.target.value })} required />
              <textarea placeholder="Note rich-text/markdown content..." className="form-input" style={{ height: '160px' }} value={newNote.content} onChange={e => setNewNote({ ...newNote, content: e.target.value })} required />
              <button type="submit" className="btn btn-success">Save Note</button>
            </form>
          )}
        </div>

        {/* User Management & Security Controls */}
        <div className="card" style={{ minHeight: 'auto', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-heading)' }}>
            User Access & Permissions Control
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--card-border)', paddingBottom: '12px' }}>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Username</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Role</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Status</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>Can View</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>Can Edit</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>Can Delete</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((usr) => (
                  <tr key={usr.id} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: '600', color: 'var(--text-heading)' }}>{usr.username}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <select 
                        value={usr.role} 
                        onChange={(e) => handleRoleChange(usr.id, e.target.value)}
                        className="form-input" 
                        style={{ padding: '4px 8px', width: '90px', fontSize: '0.8rem' }}
                        disabled={usr.username === 'admin'}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      {usr.approved ? (
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', backgroundColor: '#e6f4ea', color: '#137333', borderRadius: '4px', fontWeight: '500' }}>
                          Approved
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', backgroundColor: '#fef7e0', color: '#b06000', borderRadius: '4px', fontWeight: '500' }}>
                          Pending Approval
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={usr.can_view} 
                        onChange={() => handleTogglePermission(usr.id, 'can_view', usr.can_view)}
                        disabled={usr.username === 'admin'}
                      />
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={usr.can_edit} 
                        onChange={() => handleTogglePermission(usr.id, 'can_edit', usr.can_edit)}
                        disabled={usr.username === 'admin'}
                      />
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={usr.can_delete} 
                        onChange={() => handleTogglePermission(usr.id, 'can_delete', usr.can_delete)}
                        disabled={usr.username === 'admin'}
                      />
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      {!usr.approved && (
                        <button 
                          className="btn btn-success" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }} 
                          onClick={() => handleApproveUser(usr.id)}
                        >
                          Approve Enrollment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Topics List */}
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-heading)' }}>
            Curriculum Topics
          </h3>
          <div className="todos-grid">
            {filteredTopics.map((topic) => (
              <div key={topic.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 6px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                      {topic.category}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500', color: topic.difficulty === 'Advanced' ? '#d93025' : topic.difficulty === 'Intermediate' ? '#b06000' : '#137333' }}>
                      {topic.difficulty}
                    </span>
                  </div>
                  <h4 className="card-title" onClick={() => router.push(`/todo/${topic.id}`)}>
                    {topic.title}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
                    Est. Time: {topic.estimated_time}
                  </p>
                </div>
                <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '12px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Questions: {topic.total_questions || 0}
                  </span>
                  <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => router.push(`/todo/${topic.id}`)}>
                    Manage Content
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // RENDER USER DASHBOARD
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Welcome Banner */}
      <div className="card" style={{ minHeight: 'auto', padding: '24px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: 'none', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#ffffff' }}>
            Welcome, {user.username}!
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
            Ready to tackle your coding tasks today? Keep up the good work!
          </p>
        </div>
        
        {/* Streak details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: 'rgba(255,255,255,0.07)', padding: '12px 18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '1.75rem' }}>🔥</span>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffedd5', lineHeight: '1.2' }}>
              {userStats.streak} Days
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Learning Streak
            </div>
          </div>
        </div>
      </div>

      {error && <div className="login-error">{error}</div>}
      {success && <div className="save-indicator" style={{ marginBottom: '12px' }}>{success}</div>}

      {/* Grid: Tasks Board & Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Today's Tasks board */}
        <div className="card" style={{ minHeight: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-heading)', margin: 0 }}>
              Today's Tasks
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Completed: {userTasks.filter(t => t.status === 'Completed').length} / {userTasks.length}
            </span>
          </div>

          {userTasks.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', border: '1.5px dashed var(--card-border)', borderRadius: '8px', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0 }}>Your tasks list is empty.</p>
              <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>Browse curriculum topics below to add learning tasks.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {userTasks.map((task) => (
                <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--list-item-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.7rem', padding: '1px 4px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '4px', textTransform: 'uppercase', fontWeight: '600', color: 'var(--text-muted)' }}>
                        {task.item_type}
                      </span>
                      <span 
                        style={{ 
                          fontWeight: '600', 
                          color: 'var(--text-heading)',
                          textDecoration: task.status === 'Completed' ? 'line-through' : 'none',
                          opacity: task.status === 'Completed' ? 0.6 : 1
                        }}
                      >
                        {task.details?.title || 'Coding task'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Status badge and update */}
                    <button 
                      onClick={() => handleUpdateTaskStatus(task.id, task.status)}
                      className="btn" 
                      style={{ 
                        padding: '4px 10px', 
                        fontSize: '0.75rem',
                        backgroundColor: task.status === 'Completed' ? '#e6f4ea' : task.status === 'In Progress' ? '#e8f0fe' : 'var(--btn-secondary-bg)',
                        color: task.status === 'Completed' ? '#137333' : task.status === 'In Progress' ? '#1a73e8' : 'var(--text-color)',
                        border: '1px solid ' + (task.status === 'Completed' ? '#ceead6' : task.status === 'In Progress' ? '#d2e3fc' : 'var(--card-border)')
                      }}
                    >
                      {task.status}
                    </button>
                    <button 
                      onClick={() => handleRemoveTask(task.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', padding: '4px' }}
                      title="Remove from board"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Learning Statistics & Recommendations Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Stats Card */}
          <div className="card" style={{ minHeight: 'auto', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-heading)' }}>
              Overall Progress
            </h3>
            
            {/* Circle Progress Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${userStats.learningPercentage}%`, height: '100%', backgroundColor: '#1a73e8', borderRadius: '4px', transition: 'width 0.5s ease-in-out' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Learning Progress</span>
                <span style={{ fontWeight: '700', color: 'var(--link-color)' }}>{userStats.learningPercentage}%</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Completed Topics:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-heading)' }}>
                  {userStats.completedTopicsCount} / {userStats.totalTopicsCount}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Completed Tasks:</span>
                <span style={{ fontWeight: '600', color: 'var(--text-heading)' }}>{userStats.completedTasksCount}</span>
              </div>
            </div>
          </div>

          {/* Recommendations Card */}
          <div className="card" style={{ minHeight: 'auto', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '12px', color: 'var(--text-heading)' }}>
              Recommended for You
            </h3>
            {userStats.recommendations && userStats.recommendations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {userStats.recommendations.map(rec => (
                  <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--list-item-bg)', border: '1px solid var(--card-border)', borderRadius: '6px' }}>
                    <div style={{ flex: 1, marginRight: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                        {rec.topic_title}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-heading)' }}>
                        {rec.title}
                      </div>
                    </div>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                      onClick={() => handleQuickAdd(rec.id, 'question')}
                    >
                      + Quick Add
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Awesome job! No unfinished tasks left to recommend.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Curriculum Browse Grid */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-heading)' }}>
          Explore Curriculum Topics
        </h3>
        <div className="todos-grid">
          {filteredTopics.map((topic) => (
            <div key={topic.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 6px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                    {topic.category}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: '500', color: topic.difficulty === 'Advanced' ? '#d93025' : topic.difficulty === 'Intermediate' ? '#b06000' : '#137333' }}>
                    {topic.difficulty}
                  </span>
                </div>
                <h4 className="card-title" onClick={() => router.push(`/todo/${topic.id}`)}>
                  {topic.title}
                </h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Est. Time: {topic.estimated_time}</span>
                </div>
                
                {/* Topic progress indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                  <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${topic.progress_percentage || 0}%`, height: '100%', backgroundColor: '#137333' }}></div>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)' }}>{topic.progress_percentage || 0}%</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '12px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }} 
                  onClick={() => handleQuickAdd(topic.id, 'topic')}
                >
                  + Add to Today
                </button>
                <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => router.push(`/todo/${topic.id}`)}>
                  Study Topic &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
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
