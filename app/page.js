"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { todoService, userService, taskService } from '@/lib/api';

function DashboardContent({ searchQuery }) {
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [usersList, setUsersList] = useState([]);
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

  const [adminStats, setAdminStats] = useState({
    topicsCount: 0,
    questionsCount: 0,
    examplesCount: 0,
    notesCount: 0,
    usersCount: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Forms / Modals States
  const [activeForm, setActiveForm] = useState(null); // 'topic'
  const [newTopic, setNewTopic] = useState({ title: '', category: 'General', difficulty: 'Beginner', estimatedTime: '1 hour' });

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
      console.time('API: Parallel Fetch Dashboard Data');
      
      // Parallelize all curriculum, stats, user list, and tasks API calls
      const promises = [
        todoService.getTodos(),
        taskService.getUserTasks(),
        taskService.getUserStats()
      ];

      if (u.role === 'admin') {
        promises.push(userService.getUsers());
      } else {
        promises.push(Promise.resolve(null));
      }

      const [allTopics, tasks, stats, allUsers] = await Promise.all(promises);
      console.timeEnd('API: Parallel Fetch Dashboard Data');

      setTopics(allTopics || []);
      setUserTasks(tasks || []);
      setUserStats(stats || {
        streak: 0,
        completedTasksCount: 0,
        completedTopicsCount: 0,
        totalTopicsCount: 0,
        learningPercentage: 0,
        weeklyActivity: [],
        recommendations: []
      });

      if (u.role === 'admin' && allUsers) {
        setUsersList(allUsers);

        // Compute curriculum counts in-memory
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
      }
    } catch (err) {
      console.error('loadDashboardData error:', err);
      setError('Could not connect to database.');
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
      await todoService.createTodo(
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

  const filteredUserTasks = useMemo(() => {
    if (filter === 'today') {
      return userTasks.filter(t => t.status !== 'Completed');
    }
    return userTasks;
  }, [userTasks, filter]);

  if (!user) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  // RENDER ADMIN DASHBOARD (Only show Admin Console if filter is not set)
  if (user.role === 'admin' && !filter) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-heading)', margin: 0 }}>
              Admin Management Console
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
              Manage curriculum topics and review enrollments.
            </p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => router.push('/admin/users')}
            style={{ padding: '10px 20px', fontWeight: '600' }}
          >
            Manage Users & Permissions &rarr;
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}
        {success && <div className="save-indicator" style={{ marginBottom: '12px' }}>{success}</div>}

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
          {[
            { title: 'Total Topics', count: adminStats.topicsCount },
            { title: 'Total Questions', count: adminStats.questionsCount },
            { title: 'Total Notes', count: adminStats.notesCount },
            { title: 'Code Examples', count: adminStats.examplesCount },
            { title: 'Total Users', count: adminStats.usersCount }
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--text-heading)' }}>
              Curriculum Manager
            </h3>
            <button className="btn btn-primary" onClick={() => setActiveForm(activeForm === 'topic' ? null : 'topic')}>
              {activeForm === 'topic' ? 'Cancel' : '+ Add New Topic'}
            </button>
          </div>

          {/* Quick Action Forms */}
          {activeForm === 'topic' && (
            <form onSubmit={handleCreateTopic} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '500px', padding: '16px', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              <h4 style={{ fontWeight: '600', color: 'var(--text-heading)', margin: 0 }}>Create New Topic</h4>
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

  // RENDER USER DASHBOARD (Or Admin Task board view when navigating tabs)
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Welcome Banner */}
      <div className="card" style={{ minHeight: 'auto', padding: '24px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: 'none', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#ffffff' }}>
            {user.role === 'admin' ? 'Admin workspace' : `Welcome, ${user.username}!`}
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

      {user.role !== 'admin' && !user.approved && (
        <div style={{ padding: '16px', backgroundColor: '#fef7e0', border: '1px solid #feebc8', borderRadius: '8px', color: '#c05621', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span>⚠️</span>
          <span>Your account is pending admin approval. You can browse topics but cannot add tasks to your daily board yet.</span>
        </div>
      )}

      {error && <div className="login-error">{error}</div>}
      {success && <div className="save-indicator" style={{ marginBottom: '12px' }}>{success}</div>}

      {/* Conditional module-wise content rendering based on selected Navbar filter */}
      {filter ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Today's Tasks board */}
          <div className="card" style={{ minHeight: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-heading)', margin: 0 }}>
                {filter === 'today' ? "Today's Active Tasks" : "All Coding Tasks"}
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Completed: {userTasks.filter(t => t.status === 'Completed').length} / {userTasks.length}
              </span>
            </div>

            {filteredUserTasks.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', border: '1.5px dashed var(--card-border)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                <p style={{ margin: 0 }}>Your tasks list is empty.</p>
                <p style={{ fontSize: '0.8rem', margin: '4px 0 0 0' }}>Browse curriculum topics in Dashboard to add learning tasks.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredUserTasks.map((task) => (
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
                        disabled={!user.approved && user.role !== 'admin'}
                      >
                        + Add
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
      ) : (
        /* Default Home Dashboard - explore curriculum and general progress */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Stats Card */}
          <div className="card" style={{ minHeight: 'auto', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-heading)' }}>
              Overall Progress
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${userStats.learningPercentage}%`, height: '100%', backgroundColor: '#1a73e8', borderRadius: '4px', transition: 'width 0.5s ease-in-out' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Learning Progress</span>
                <span style={{ fontWeight: '700', color: 'var(--link-color)' }}>{userStats.learningPercentage}%</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '24px', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Completed Topics: </span>
                <span style={{ fontWeight: '600', color: 'var(--text-heading)' }}>
                  {userStats.completedTopicsCount} / {userStats.totalTopicsCount}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Completed Tasks: </span>
                <span style={{ fontWeight: '600', color: 'var(--text-heading)' }}>{userStats.completedTasksCount}</span>
              </div>
            </div>
          </div>

          {/* Curriculum Explore Grid */}
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
                      disabled={!user.approved && user.role !== 'admin'}
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
