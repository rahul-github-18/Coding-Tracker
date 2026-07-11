"use client";

import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { todoService, userService, taskService, questionService, userQueryService, adminQueryService, adminSubmissionService } from '@/lib/api';

const getDisplayDifficulty = (difficulty) => {
  if (!difficulty) return 'Easy';
  const d = String(difficulty).toLowerCase();
  if (d.includes('beg') || d.includes('easy')) return 'Easy';
  if (d.includes('int') || d.includes('mid') || d.includes('med')) return 'Medium';
  if (d.includes('adv') || d.includes('hard')) return 'Hard';
  return 'Easy';
};

function DashboardContent({ searchQuery }) {
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [questionPage, setQuestionPage] = useState(0);
  const [visibleCurriculumCount, setVisibleCurriculumCount] = useState(8);
  const [visibleAdminCount, setVisibleAdminCount] = useState(8);
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

  // Floating Query Button / Modal States
  const [fabOpen, setFabOpen] = useState(false);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [showSubmitCodeModal, setShowSubmitCodeModal] = useState(false);

  // Ask Query Form States
  const [queryText, setQueryText] = useState('');
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [querySuccess, setQuerySuccess] = useState('');

  // Submit Code Form States
  const [submitCodeTopicId, setSubmitCodeTopicId] = useState('');
  const [submitCodeQuestionTitle, setSubmitCodeQuestionTitle] = useState('');
  const [submitCodeContent, setSubmitCodeContent] = useState('');
  const [topicQuestions, setTopicQuestions] = useState([]);
  const [loadingTopicQuestions, setLoadingTopicQuestions] = useState(false);
  const [submittingCode, setSubmittingCode] = useState(false);
  const [codeSuccess, setCodeSuccess] = useState('');

  // Admin Dashboard Query States
  const [adminTab, setAdminTab] = useState('topics'); // 'topics' | 'queries' | 'submissions'
  const [adminQueries, setAdminQueries] = useState([]);
  const [loadingAdminQueries, setLoadingAdminQueries] = useState(false);
  const [replyingQuery, setReplyingQuery] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Admin submissions states
  const [adminSubmissions, setAdminSubmissions] = useState([]);
  const [loadingAdminSubmissions, setLoadingAdminSubmissions] = useState(false);
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [replyingSubmission, setReplyingSubmission] = useState(null);
  const [submissionReplyText, setSubmissionReplyText] = useState('');
  const [submittingSubmissionReply, setSubmittingSubmissionReply] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Forms / Modals States
  const [activeForm, setActiveForm] = useState(null); // 'topic'
  const [newTopic, setNewTopic] = useState({ title: '', category: 'General', difficulty: 'Easy', estimatedTime: '1 hour' });
  const [editingTopic, setEditingTopic] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [questionUploadMode, setQuestionUploadMode] = useState('manual');
  const [selectedFileForUpload, setSelectedFileForUpload] = useState(null);
  const [questionFilter, setQuestionFilter] = useState('all');
  const [dashboardFilter, setDashboardFilter] = useState('all');
  const [newQuestionForm, setNewQuestionForm] = useState({
    title: '',
    difficulty: 'Easy',
    tags: '',
    description: '',
    code: '',
    explanation: ''
  });

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
        setQuestionFilter('all');
        setDashboardFilter('all');
        setVisibleCurriculumCount(8);
        setVisibleAdminCount(8);
        loadDashboardData(u);
      } catch (e) {
        localStorage.clear();
        router.replace('/login');
      }
    }
  }, [router, filter, searchParams]);

  useEffect(() => {
    if (!submitCodeTopicId) {
      setTopicQuestions([]);
      return;
    }
    const fetchQuestions = async () => {
      setLoadingTopicQuestions(true);
      try {
        const data = await questionService.getQuestions(submitCodeTopicId);
        setTopicQuestions(data || []);
        if (data && data.length > 0) {
          setSubmitCodeQuestionTitle(data[0].title);
        } else {
          setSubmitCodeQuestionTitle('');
        }
      } catch (err) {
        console.error('Error fetching questions for dynamic select:', err);
      } finally {
        setLoadingTopicQuestions(false);
      }
    };
    fetchQuestions();
  }, [submitCodeTopicId]);

  const loadAdminQueries = useCallback(async () => {
    setLoadingAdminQueries(true);
    try {
      const data = await adminQueryService.getQueries();
      setAdminQueries(data || []);
    } catch (err) {
      console.error('Error loading admin queries:', err);
    } finally {
      setLoadingAdminQueries(false);
    }
  }, []);

  const loadAdminSubmissions = useCallback(async () => {
    setLoadingAdminSubmissions(true);
    try {
      const data = await adminSubmissionService.getSubmissions();
      setAdminSubmissions(data || []);
    } catch (err) {
      console.error('Error loading admin submissions:', err);
    } finally {
      setLoadingAdminSubmissions(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin' && adminTab === 'queries') {
      loadAdminQueries();
    }
    if (user?.role === 'admin' && adminTab === 'submissions') {
      loadAdminSubmissions();
    }
  }, [adminTab, user, loadAdminQueries, loadAdminSubmissions]);

  useEffect(() => {
    const handleRefresh = () => {
      if (user?.role === 'admin' && adminTab === 'queries') {
        loadAdminQueries();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('refresh-queries', handleRefresh);
      return () => window.removeEventListener('refresh-queries', handleRefresh);
    }
  }, [user, adminTab, loadAdminQueries]);

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    setSubmittingQuery(true);
    setQuerySuccess('');
    try {
      const newQ = await userQueryService.submitQuery(queryText);
      setQuerySuccess(`Query submitted successfully! Your Ticket ID is QRY-#${newQ.id}`);
      setQueryText('');
      window.dispatchEvent(new Event('refresh-notifications'));
      setTimeout(() => {
        setShowQueryModal(false);
        setQuerySuccess('');
      }, 3000);
    } catch (err) {
      console.error('Query submission error:', err);
    } finally {
      setSubmittingQuery(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    if (!submitCodeTopicId || !submitCodeQuestionTitle.trim() || !submitCodeContent.trim()) return;
    setSubmittingCode(true);
    setCodeSuccess('');
    try {
      await userQueryService.submitCode(
        parseInt(submitCodeTopicId, 10),
        submitCodeQuestionTitle.trim(),
        submitCodeContent.trim()
      );
      setCodeSuccess('Code submitted successfully!');
      setSubmitCodeContent('');
      setTimeout(() => {
        setShowSubmitCodeModal(false);
        setCodeSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Code submission error:', err);
    } finally {
      setSubmittingCode(false);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyingQuery || !replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await adminQueryService.submitReply(replyingQuery.id, replyText);
      setReplyingQuery(null);
      setReplyText('');
      loadAdminQueries();
      window.dispatchEvent(new Event('refresh-notifications'));
    } catch (err) {
      console.error('Reply submission error:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleSubmissionReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyingSubmission || !submissionReplyText.trim()) return;
    setSubmittingSubmissionReply(true);
    try {
      await adminSubmissionService.submitReply(replyingSubmission.id, submissionReplyText);
      setReplyingSubmission(null);
      setSubmissionReplyText('');
      loadAdminSubmissions();
      window.dispatchEvent(new Event('refresh-notifications'));
    } catch (err) {
      console.error('Submission reply error:', err);
    } finally {
      setSubmittingSubmissionReply(false);
    }
  };

  useEffect(() => {
    setVisibleCurriculumCount(8);
    setVisibleAdminCount(8);
  }, [searchQuery]);

  useEffect(() => {
    if (topics && topics.length > 0) {
      const maxVisible = Math.max(visibleCurriculumCount, visibleAdminCount);
      topics.slice(0, maxVisible).forEach(topic => {
        router.prefetch(`/todo/${topic.id}`);
      });
    }
  }, [topics, visibleCurriculumCount, visibleAdminCount, router]);

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
      const topicIdParam = searchParams.get('topicId');
      if (topicIdParam) {
        setSelectedTopicId(parseInt(topicIdParam, 10));
      } else if (allTopics && allTopics.length > 0) {
        setSelectedTopicId(prev => prev || allTopics[0].id);
      }
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
      setNewTopic({ title: '', category: 'General', difficulty: 'Easy', estimatedTime: '1 hour' });
      setActiveForm(null);
      loadDashboardData(user);
    } catch (err) {
      setError(err.message || 'Failed to create topic.');
    }
  };

  const handleEditTopicSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await todoService.updateTodo(editingTopic.id, {
        title: editingTopic.title,
        category: editingTopic.category,
        difficulty: editingTopic.difficulty,
        estimatedTime: editingTopic.estimated_time || editingTopic.estimatedTime
      });
      setSuccess('Topic updated successfully!');
      setActiveForm(null);
      loadDashboardData(user);
    } catch (err) {
      setError(err.message || 'Failed to update topic.');
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!window.confirm('Are you sure you want to delete this topic and all its questions? This cannot be undone.')) return;
    setError('');
    setSuccess('');
    try {
      await todoService.deleteTodo(topicId);
      setSuccess('Topic deleted successfully!');
      if (selectedTopicId === topicId) {
        setSelectedTopicId(null);
      }
      loadDashboardData(user);
    } catch (err) {
      setError('Failed to delete topic.');
    }
  };

  const handleCreateQuestionSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await questionService.createQuestion(selectedTopicId, newQuestionForm);
      setSuccess('Question added successfully!');
      setNewQuestionForm({
        title: '',
        difficulty: 'Easy',
        tags: '',
        description: '',
        code: '',
        explanation: ''
      });
      setActiveForm(null);
      loadDashboardData(user);
    } catch (err) {
      setError(err.message || 'Failed to add question.');
    }
  };

  const handleEditQuestionSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await questionService.updateQuestion(editingQuestion.id, {
        title: editingQuestion.title,
        difficulty: editingQuestion.difficulty,
        tags: editingQuestion.tags,
        description: editingQuestion.description,
        code: editingQuestion.code,
        explanation: editingQuestion.explanation
      });
      setSuccess('Question updated successfully!');
      setActiveForm(null);
      loadDashboardData(user);
    } catch (err) {
      setError(err.message || 'Failed to update question.');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question? This cannot be undone.')) return;
    setError('');
    setSuccess('');
    try {
      await questionService.deleteQuestion(questionId);
      setSuccess('Question deleted successfully!');
      loadDashboardData(user);
    } catch (err) {
      setError('Failed to delete question.');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileForUpload(file);
      setError('');
      setSuccess('');
    }
  };

  const handleExcelUpload = () => {
    if (!selectedFileForUpload) {
      setError('Please select an Excel or CSV file first.');
      return;
    }

    setError('');
    setSuccess('');

    import('xlsx').then((XLSX) => {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const questionsToInsert = [];
          rows.forEach((row, index) => {
            if (index === 0) {
              const col1 = String(row[0] || '').toLowerCase();
              if (col1.includes('question') || col1.includes('title') || col1.includes('name')) {
                return; // skip header row
              }
            }

            const title = row[0];
            const explanation = row[1] || '';
            const code = row[2] || '';
            
            // Normalize difficulty level in column 4 (index 3)
            const rawDifficulty = String(row[3] || '').trim().toLowerCase();
            let difficulty = 'Easy';
            if (rawDifficulty.includes('hard') || rawDifficulty.includes('adv')) {
              difficulty = 'Hard';
            } else if (rawDifficulty.includes('medium') || rawDifficulty.includes('med') || rawDifficulty.includes('int') || rawDifficulty.includes('mid')) {
              difficulty = 'Medium';
            }

            if (title && String(title).trim() !== '') {
              questionsToInsert.push({
                title: String(title).trim(),
                difficulty: difficulty,
                tags: '',
                description: '',
                code: String(code),
                explanation: String(explanation)
              });
            }
          });

          if (questionsToInsert.length === 0) {
            setError('No valid questions found in the Excel sheet.');
            return;
          }

          setSuccess(`Importing ${questionsToInsert.length} questions... Please wait.`);
          
          for (const q of questionsToInsert) {
            await questionService.createQuestion(selectedTopicId, q);
          }

          setSuccess(`Successfully imported ${questionsToInsert.length} questions!`);
          setSelectedFileForUpload(null);
          setActiveForm(null);
          loadDashboardData(user);
        } catch (err) {
          console.error(err);
          setError('Failed to parse Excel sheet. Ensure layout has Question, Explanation, Code, and Difficulty columns.');
        }
      };
      reader.readAsArrayBuffer(selectedFileForUpload);
    }).catch(err => {
      console.error(err);
      setError('Could not load Excel parser dependency.');
    });
  };



  const renderModal = () => {
    if (!activeForm) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}>
        <div className="card" style={{
          width: '90%',
          maxWidth: '600px',
          padding: '24px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--card-border)',
          backgroundColor: 'var(--card-bg)'
        }}>
          {activeForm === 'createTopic' && (
            <form onSubmit={handleCreateTopic} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-heading)' }}>
                Add New Curriculum Topic
              </h3>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Topic Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Advance SQL" 
                  className="form-input" 
                  value={newTopic.title} 
                  onChange={e => setNewTopic({ ...newTopic, title: e.target.value })} 
                  required 
                  style={{ marginTop: '4px', width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Category</label>
                <input 
                  type="text" 
                  placeholder="e.g. SQL" 
                  className="form-input" 
                  value={newTopic.category} 
                  onChange={e => setNewTopic({ ...newTopic, category: e.target.value })} 
                  style={{ marginTop: '4px', width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Difficulty</label>
                  <select 
                    className="form-input" 
                    value={newTopic.difficulty} 
                    onChange={e => setNewTopic({ ...newTopic, difficulty: e.target.value })}
                    style={{ marginTop: '4px', width: '100%' }}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Estimated Time</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 2 hours" 
                    className="form-input" 
                    value={newTopic.estimatedTime} 
                    onChange={e => setNewTopic({ ...newTopic, estimatedTime: e.target.value })} 
                    style={{ marginTop: '4px', width: '100%' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveForm(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Topic</button>
              </div>
            </form>
          )}

          {activeForm === 'editTopic' && editingTopic && (
            <form onSubmit={handleEditTopicSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-heading)' }}>
                Edit Topic Details
              </h3>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Topic Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editingTopic.title} 
                  onChange={e => setEditingTopic({ ...editingTopic, title: e.target.value })} 
                  required 
                  style={{ marginTop: '4px', width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Category</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editingTopic.category} 
                  onChange={e => setEditingTopic({ ...editingTopic, category: e.target.value })} 
                  style={{ marginTop: '4px', width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Difficulty</label>
                  <select 
                    className="form-input" 
                    value={editingTopic.difficulty} 
                    onChange={e => setEditingTopic({ ...editingTopic, difficulty: e.target.value })}
                    style={{ marginTop: '4px', width: '100%' }}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Estimated Time</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingTopic.estimated_time || editingTopic.estimatedTime} 
                    onChange={e => setEditingTopic({ ...editingTopic, estimated_time: e.target.value })} 
                    style={{ marginTop: '4px', width: '100%' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveForm(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          )}

          {activeForm === 'createQuestion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-heading)' }}>
                Add Question to Topic
              </h3>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--card-border)', marginBottom: '10px' }}>
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    background: 'none',
                    border: 'none',
                    borderBottom: questionUploadMode === 'manual' ? '2.2px solid var(--link-color)' : 'none',
                    color: questionUploadMode === 'manual' ? 'var(--link-color)' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setQuestionUploadMode('manual')}
                >
                  Single Question Form
                </button>
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    background: 'none',
                    border: 'none',
                    borderBottom: questionUploadMode === 'excel' ? '2.2px solid var(--link-color)' : 'none',
                    color: questionUploadMode === 'excel' ? 'var(--link-color)' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setQuestionUploadMode('excel')}
                >
                  Upload Excel (.xlsx, .csv)
                </button>
              </div>

              {questionUploadMode === 'excel' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{
                    border: '2.5px dashed var(--card-border)',
                    borderRadius: '8px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    backgroundColor: 'var(--list-item-bg)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease',
                    position: 'relative'
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px', color: selectedFileForUpload ? 'var(--link-color)' : 'var(--text-muted)' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <p style={{ margin: '0 0 6px 0', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-heading)' }}>
                      {selectedFileForUpload ? selectedFileForUpload.name : 'Drag & drop your Excel or CSV file here, or click to browse'}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {selectedFileForUpload ? `${(selectedFileForUpload.size / 1024).toFixed(1)} KB` : 'Supports .xlsx, .xls, and .csv files'}
                    </p>
                    <input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      onChange={handleFileSelect} 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        opacity: 0,
                        cursor: 'pointer',
                        width: '100%',
                        height: '100%'
                      }}
                    />
                  </div>
                  
                  <div style={{ padding: '14px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-heading)', fontSize: '0.85rem' }}>Excel Columns Layout Requirement:</span>
                    <span>• <strong>Column 1:</strong> Question Title (Required)</span>
                    <span>• <strong>Column 2:</strong> Explanation (Optional)</span>
                    <span>• <strong>Column 3:</strong> Code (Optional)</span>
                    <span>• <strong>Column 4:</strong> Difficulty Level (Optional - e.g. Easy, Medium, Hard)</span>
                    <span style={{ fontSize: '0.75rem', fontStyle: 'italic', marginTop: '4px' }}>Note: Row 1 containing column headers will be automatically skipped.</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => { setSelectedFileForUpload(null); setActiveForm(null); }}>Cancel</button>
                    {selectedFileForUpload && (
                      <button type="button" className="btn btn-primary" onClick={handleExcelUpload}>
                        Upload
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateQuestionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Question Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Write a SQL query to find..." 
                      className="form-input" 
                      value={newQuestionForm.title} 
                      onChange={e => setNewQuestionForm({ ...newQuestionForm, title: e.target.value })} 
                      required 
                      style={{ marginTop: '4px', width: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Difficulty</label>
                      <select 
                        className="form-input" 
                        value={newQuestionForm.difficulty} 
                        onChange={e => setNewQuestionForm({ ...newQuestionForm, difficulty: e.target.value })}
                        style={{ marginTop: '4px', width: '100%' }}
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Tags</label>
                      <input 
                        type="text" 
                        placeholder="e.g. SQL, Window Functions" 
                        className="form-input" 
                        value={newQuestionForm.tags} 
                        onChange={e => setNewQuestionForm({ ...newQuestionForm, tags: e.target.value })} 
                        style={{ marginTop: '4px', width: '100%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Description / Instructions</label>
                    <textarea 
                      placeholder="Problem details..." 
                      className="form-input" 
                      rows={3}
                      value={newQuestionForm.description} 
                      onChange={e => setNewQuestionForm({ ...newQuestionForm, description: e.target.value })} 
                      style={{ marginTop: '4px', resize: 'vertical', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Working Code Template</label>
                    <textarea 
                      placeholder="// Provide starter code or reference solution..." 
                      className="form-input" 
                      rows={4}
                      value={newQuestionForm.code} 
                      onChange={e => setNewQuestionForm({ ...newQuestionForm, code: e.target.value })} 
                      style={{ marginTop: '4px', fontFamily: 'monospace', resize: 'vertical', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Explanation / Notes</label>
                    <textarea 
                      placeholder="Solution steps or markdown explanation..." 
                      className="form-input" 
                      rows={3}
                      value={newQuestionForm.explanation} 
                      onChange={e => setNewQuestionForm({ ...newQuestionForm, explanation: e.target.value })} 
                      style={{ marginTop: '4px', resize: 'vertical', width: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setActiveForm(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Create Question</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeForm === 'editQuestion' && editingQuestion && (
            <form onSubmit={handleEditQuestionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--text-heading)' }}>
                Edit Question Details
              </h3>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Question Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editingQuestion.title} 
                  onChange={e => setEditingQuestion({ ...editingQuestion, title: e.target.value })} 
                  required 
                  style={{ marginTop: '4px', width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Difficulty</label>
                  <select 
                    className="form-input" 
                    value={editingQuestion.difficulty} 
                    onChange={e => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}
                    style={{ marginTop: '4px', width: '100%' }}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Tags</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingQuestion.tags} 
                    onChange={e => setEditingQuestion({ ...editingQuestion, tags: e.target.value })} 
                    style={{ marginTop: '4px', width: '100%' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Description / Instructions</label>
                <textarea 
                  className="form-input" 
                  rows={3}
                  value={editingQuestion.description} 
                  onChange={e => setEditingQuestion({ ...editingQuestion, description: e.target.value })} 
                  style={{ marginTop: '4px', resize: 'vertical', width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Working Code Template</label>
                <textarea 
                  className="form-input" 
                  rows={4}
                  value={editingQuestion.code} 
                  onChange={e => setEditingQuestion({ ...editingQuestion, code: e.target.value })} 
                  style={{ marginTop: '4px', fontFamily: 'monospace', resize: 'vertical', width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>Explanation / Notes</label>
                <textarea 
                  className="form-input" 
                  rows={3}
                  value={editingQuestion.explanation} 
                  onChange={e => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })} 
                  style={{ marginTop: '4px', resize: 'vertical', width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveForm(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  // User Actions
  // User Actions
  // User Actions
  const handleToggleItemStatus = async (item) => {
    if (user && !user.approved && user.role !== 'admin') {
      setError('Your account is pending admin approval.');
      return;
    }
    setError('');
    
    let nextStatus = 'Pending';
    if (item.status === 'Pending') nextStatus = 'In Progress';
    else if (item.status === 'In Progress') nextStatus = 'Completed';

    // Optimistic UI Update
    const backupTasks = [...userTasks];
    if (item.taskId) {
      if (nextStatus === 'Pending') {
        setUserTasks(prev => prev.filter(t => t.id !== item.taskId));
      } else {
        setUserTasks(prev => prev.map(t => t.id === item.taskId ? { ...t, status: nextStatus } : t));
      }
    } else {
      const tempTask = {
        id: -Date.now(),
        item_type: item.item_type,
        item_id: item.dbId,
        status: 'In Progress',
        user_id: user.id
      };
      setUserTasks(prev => [...prev, tempTask]);
    }

    try {
      if (item.taskId) {
        if (nextStatus === 'Pending') {
          await taskService.removeTask(item.taskId);
        } else {
          await taskService.updateTask(item.taskId, { status: nextStatus });
        }
      } else {
        await taskService.addTask(item.item_type, item.dbId, 'In Progress');
      }
      
      // Fetch latest updates in background
      const freshTasks = await taskService.getUserTasks();
      setUserTasks(freshTasks || []);
      const freshStats = await taskService.getUserStats();
      setUserStats(freshStats);
    } catch (err) {
      setUserTasks(backupTasks);
      setError('Failed to update task status.');
    }
  };

  const handleRemoveTaskItem = async (item) => {
    if (!item.taskId) return;
    if (!window.confirm('Are you sure you want to remove this task?')) return;
    setError('');
    const backupTasks = [...userTasks];
    setUserTasks(prev => prev.filter(t => t.id !== item.taskId));
    try {
      await taskService.removeTask(item.taskId);
      const freshTasks = await taskService.getUserTasks();
      setUserTasks(freshTasks || []);
      const freshStats = await taskService.getUserStats();
      setUserStats(freshStats);
    } catch (err) {
      setUserTasks(backupTasks);
      setError('Failed to remove task.');
    }
  };

  const handleQuickAdd = async (itemId, type) => {
    if (user && !user.approved && user.role !== 'admin') {
      setError('Your account is pending admin approval.');
      return;
    }
    setError('');
    setSuccess('');
    const backupTasks = [...userTasks];
    const tempTask = {
      id: -Date.now(),
      item_type: type,
      item_id: itemId,
      status: 'Pending',
      user_id: user.id
    };
    setUserTasks(prev => [...prev, tempTask]);
    try {
      await taskService.addTask(type, itemId, 'Pending');
      setSuccess('Item added to your daily tasks!');
      const freshTasks = await taskService.getUserTasks();
      setUserTasks(freshTasks || []);
      const freshStats = await taskService.getUserStats();
      setUserStats(freshStats);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setUserTasks(backupTasks);
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

  const handleToggleTopicSelection = async (topicId) => {
    if (user && !user.approved && user.role !== 'admin') {
      setError('Your account is pending admin approval.');
      return;
    }
    setError('');
    setSuccess('');
    
    const existingTask = userTasks.find(t => t.item_type === 'topic' && t.item_id === topicId);
    const backupTasks = [...userTasks];

    if (existingTask) {
      setUserTasks(prev => prev.filter(t => t.id !== existingTask.id));
      setSuccess('Topic removed from progress.');
    } else {
      const tempTask = {
        id: -Date.now(),
        item_type: 'topic',
        item_id: topicId,
        status: 'In Progress',
        user_id: user.id
      };
      setUserTasks(prev => [...prev, tempTask]);
      setSuccess('Topic added to progress.');
    }
    
    try {
      if (existingTask) {
        await taskService.removeTask(existingTask.id);
      } else {
        await taskService.addTask('topic', topicId, 'In Progress');
      }
      const freshTasks = await taskService.getUserTasks();
      setUserTasks(freshTasks || []);
      const freshStats = await taskService.getUserStats();
      setUserStats(freshStats);
    } catch (err) {
      setUserTasks(backupTasks);
      setError('Failed to update topic selection.');
    }
  };

  const handleToggleQuestionCompletion = async (questionId) => {
    if (user && !user.approved && user.role !== 'admin') {
      setError('Your account is pending admin approval.');
      return;
    }
    setError('');
    setSuccess('');

    const existingTask = userTasks.find(t => t.item_type === 'question' && t.item_id === questionId);
    const backupTasks = [...userTasks];

    if (existingTask) {
      if (existingTask.status === 'Completed') {
        setUserTasks(prev => prev.filter(t => t.id !== existingTask.id));
      } else {
        setUserTasks(prev => prev.map(t => t.id === existingTask.id ? { ...t, status: 'Completed' } : t));
      }
    } else {
      const tempTask = {
        id: -Date.now(),
        item_type: 'question',
        item_id: questionId,
        status: 'Completed',
        user_id: user.id
      };
      setUserTasks(prev => [...prev, tempTask]);
    }

    try {
      if (existingTask) {
        if (existingTask.status === 'Completed') {
          await taskService.removeTask(existingTask.id);
        } else {
          await taskService.updateTask(existingTask.id, { status: 'Completed' });
        }
      } else {
        await taskService.addTask('question', questionId, 'Completed');
      }
      const freshTasks = await taskService.getUserTasks();
      setUserTasks(freshTasks || []);
      const freshStats = await taskService.getUserStats();
      setUserStats(freshStats);
    } catch (err) {
      setUserTasks(backupTasks);
      setError('Failed to update question completion.');
    }
  };

  const computedStats = useMemo(() => {
    const selectedTopicIds = new Set(
      userTasks
        .filter(t => t.item_type === 'topic')
        .map(t => t.item_id)
        .filter(id => topics.some(topic => topic.id === id))
    );

    if (selectedTopicIds.size === 0) {
      return {
        completedTasksCount: 0,
        completedTopicsCount: 0,
        totalTopicsCount: 0,
        learningPercentage: 0
      };
    }

    let totalQuestionsInSelected = 0;
    let completedQuestionsInSelected = 0;
    let completedTopicsCount = 0;

    topics.forEach(topic => {
      if (selectedTopicIds.has(topic.id)) {
        const totalQs = topic.total_questions || 0;
        const completedQs = topic.completed_questions || 0;
        
        totalQuestionsInSelected += totalQs;
        completedQuestionsInSelected += completedQs;

        if (totalQs > 0 && completedQs === totalQs) {
          completedTopicsCount++;
        }
      }
    });

    const totalTasksCount = totalQuestionsInSelected;
    const completedTasksCount = completedQuestionsInSelected;
    const learningPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    return {
      completedTasksCount,
      completedTopicsCount,
      totalTopicsCount: selectedTopicIds.size,
      learningPercentage
    };
  }, [topics, userTasks]);

  const groupedTasks = useMemo(() => {
    const statusMap = {};
    userTasks.forEach(t => {
      statusMap[`${t.item_type}_${t.item_id}`] = {
        id: t.id,
        status: t.status
      };
    });

    const groups = topics.map(topic => {
      const topicTask = statusMap[`topic_${topic.id}`] || {};
      
      return {
        id: topic.id,
        title: topic.title,
        category: topic.category,
        difficulty: topic.difficulty,
        status: topicTask.status || 'Pending',
        taskId: topicTask.id || null,
        total_questions: topic.total_questions || 0
      };
    });

    if (searchQuery) {
      return groups.filter(g => 
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return groups;
  }, [topics, userTasks, searchQuery]);



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



        {/* Sub-tab Navigation */}
        <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginTop: '12px' }}>
          <span
            onClick={() => setAdminTab('topics')}
            style={{
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '700',
              color: adminTab === 'topics' ? 'var(--link-color)' : 'var(--text-muted)',
              borderBottom: adminTab === 'topics' ? '2px solid var(--link-color)' : 'none',
              paddingBottom: '10px',
              transition: 'color 0.15s ease'
            }}
          >
            Curriculum Topics
          </span>
          <span
            onClick={() => setAdminTab('queries')}
            style={{
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '700',
              color: adminTab === 'queries' ? 'var(--link-color)' : 'var(--text-muted)',
              borderBottom: adminTab === 'queries' ? '2px solid var(--link-color)' : 'none',
              paddingBottom: '10px',
              transition: 'color 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Student Queries
            {adminQueries.filter(q => !q.reply_text).length > 0 && (
              <span style={{ backgroundColor: '#ff4d4f', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '0.65rem' }}>
                {adminQueries.filter(q => !q.reply_text).length}
              </span>
            )}
          </span>
          <span
            onClick={() => setAdminTab('submissions')}
            style={{
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: '700',
              color: adminTab === 'submissions' ? 'var(--link-color)' : 'var(--text-muted)',
              borderBottom: adminTab === 'submissions' ? '2px solid var(--link-color)' : 'none',
              paddingBottom: '10px',
              transition: 'color 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            Code Submissions
            {adminSubmissions.length > 0 && (
              <span style={{ backgroundColor: '#4f46e5', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '0.65rem' }}>
                {adminSubmissions.length}
              </span>
            )}
          </span>
        </div>

        {/* Topics List Panel */}
        {adminTab === 'topics' && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-heading)' }}>
              Curriculum Topics
            </h3>
            <div className="todos-grid">
              {filteredTopics.slice(0, visibleAdminCount).map((topic) => (
                <div key={topic.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 6px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                        {topic.category}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: '500', color: getDisplayDifficulty(topic.difficulty) === 'Hard' ? '#d93025' : getDisplayDifficulty(topic.difficulty) === 'Medium' ? '#b06000' : '#137333' }}>
                        {getDisplayDifficulty(topic.difficulty)}
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

            {filteredTopics.length > visibleAdminCount && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setVisibleAdminCount(prev => prev + 8)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '10px 24px', 
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    borderRadius: '30px',
                    border: '1px solid var(--card-border)',
                    backgroundColor: 'var(--card-bg)',
                    boxShadow: 'var(--card-shadow)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(1px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <span>View More</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Queries List Panel */}
        {adminTab === 'queries' && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-heading)' }}>
              Support Tickets & Student Queries
            </h3>
            
            {loadingAdminQueries ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '24px' }}>Loading tickets...</div>
            ) : adminQueries.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '24px', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                No student queries submitted.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {adminQueries.map((q) => (
                  <div 
                    key={q.id} 
                    className="card" 
                    style={{ 
                      padding: '20px', 
                      border: '1px solid var(--card-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--link-color)' }}>
                            QRY-#{q.id}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Submitted by <strong>@{q.users?.username || 'unknown'}</strong>
                          </span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                          Date: {new Date(q.created_at).toLocaleString()}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: '600',
                        backgroundColor: q.reply_text ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: q.reply_text ? '#10b981' : '#f59e0b'
                      }}>
                        {q.reply_text ? 'Replied' : 'Pending Response'}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: 'var(--text-color)', margin: 0, backgroundColor: 'var(--body-bg)', padding: '12px', borderRadius: '6px', border: '1px solid var(--card-border)', whiteSpace: 'pre-wrap' }}>
                      {q.query_text}
                    </p>

                    {q.reply_text && (
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#10b981', display: 'block', marginBottom: '4px' }}>Your Response:</span>
                        <p style={{ fontSize: '0.85rem', color: '#10b981', margin: 0, backgroundColor: 'rgba(16, 185, 129, 0.03)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.1)', whiteSpace: 'pre-wrap' }}>
                          {q.reply_text}
                        </p>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                          Replied at: {new Date(q.replied_at).toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => {
                          setReplyingQuery(q);
                          setReplyText(q.reply_text || '');
                        }}
                        style={{ padding: '6px 16px', fontSize: '0.8rem', fontWeight: '600' }}
                      >
                        {q.reply_text ? 'Edit Response' : 'Reply & Answer'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Code Submissions Panel */}
        {adminTab === 'submissions' && (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-heading)' }}>
              Student Code Submissions
            </h3>

            {loadingAdminSubmissions ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '24px' }}>Loading submissions...</div>
            ) : adminSubmissions.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '24px', backgroundColor: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                No code submissions yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {adminSubmissions.map((sub) => {
                  const isExpanded = expandedSubmission === sub.id;
                  return (
                    <div
                      key={sub.id}
                      className="card"
                      style={{ padding: '20px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--link-color)' }}>SUB-#{sub.id}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              by <strong>@{sub.users?.username || 'unknown'}</strong>
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 8px', backgroundColor: 'rgba(79, 70, 229, 0.15)', color: '#4f46e5', borderRadius: '4px' }}>
                              {sub.todos?.title || 'Unknown Topic'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Q: {sub.question_title}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                            {new Date(sub.created_at).toLocaleString()}
                          </span>
                        </div>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setExpandedSubmission(isExpanded ? null : sub.id)}
                          style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {isExpanded ? 'Hide Code' : 'View Code'}
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points={isExpanded ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}></polyline>
                          </svg>
                        </button>
                      </div>

                      {isExpanded && (
                        <pre style={{
                          margin: 0,
                          padding: '16px',
                          backgroundColor: '#1e1e2f',
                          color: '#f8f8f2',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          fontSize: '0.8rem',
                          fontFamily: 'monospace',
                          overflowX: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          maxHeight: '400px',
                          overflowY: 'auto'
                        }}>
                          {sub.code}
                        </pre>
                      )}

                      {/* Admin feedback display */}
                      {sub.admin_reply && (
                        <div style={{ marginTop: '4px', padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Your Feedback</span>
                          <p style={{ fontSize: '0.85rem', color: '#10b981', margin: 0, whiteSpace: 'pre-wrap' }}>{sub.admin_reply}</p>
                          {sub.replied_at && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Replied: {new Date(sub.replied_at).toLocaleString()}</span>}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setReplyingSubmission(sub);
                            setSubmissionReplyText(sub.admin_reply || '');
                          }}
                          style={{ padding: '6px 16px', fontSize: '0.8rem', fontWeight: '600' }}
                        >
                          {sub.admin_reply ? '✏️ Edit Feedback' : '💬 Add Feedback'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Submission Feedback Modal - inline to stay within admin return scope */}
        {replyingSubmission && (
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.65)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1100, backdropFilter: 'blur(4px)', padding: '20px'
            }}
          >
            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '24px', boxShadow: 'var(--card-shadow)', position: 'relative', textAlign: 'left' }}>
              <button
                onClick={() => { setReplyingSubmission(null); setSubmissionReplyText(''); }}
                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}
              >
                &times;
              </button>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-heading)', margin: '0 0 4px 0' }}>
                Feedback for SUB-#{replyingSubmission.id}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                @{replyingSubmission.users?.username} &mdash; {replyingSubmission.question_title}
              </p>
              <form onSubmit={handleSubmissionReplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>Your Feedback</label>
                  <textarea
                    required
                    rows={5}
                    className="search-bar"
                    placeholder="Write your code review / feedback here..."
                    value={submissionReplyText}
                    onChange={(e) => setSubmissionReplyText(e.target.value)}
                    style={{ width: '100%', borderRadius: '8px', padding: '12px', fontSize: '0.9rem', minHeight: '120px', resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setReplyingSubmission(null); setSubmissionReplyText(''); }} disabled={submittingSubmissionReply}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submittingSubmissionReply}>
                    {submittingSubmissionReply ? 'Saving...' : 'Save Feedback'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // RENDER USER DASHBOARD (Or Admin Task board view when navigating tabs)
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
      


      {user.role !== 'admin' && !user.approved && (
        <div style={{ padding: '16px', backgroundColor: '#fef7e0', border: '1px solid #feebc8', borderRadius: '8px', color: '#c05621', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span>⚠️</span>
          <span>Your account is pending admin approval. You can browse topics but cannot add tasks to your daily board yet.</span>
        </div>
      )}

      {error && <div className="login-error">{error}</div>}
      {success && <div className="save-indicator" style={{ marginBottom: '12px' }}>{success}</div>}

      {filter === 'all' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-heading)', margin: 0 }}>
                Curriculum Topics
              </h2>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                Browse curriculum topics, select a topic to view its questions and track your progress.
              </p>
            </div>
            {user?.role === 'admin' && (
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setNewTopic({ title: '', category: 'General', difficulty: 'Easy', estimatedTime: '1 hour' });
                  setActiveForm('createTopic');
                }}
                style={{ padding: '10px 20px', fontWeight: '600' }}
              >
                + Add Topic
              </button>
            )}
          </div>

          <div className="todos-grid" style={{ marginTop: '12px' }}>
            {groupedTasks.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No topics match search.</div>
            ) : (
              groupedTasks.slice(0, visibleCurriculumCount).map((group) => {
                const qTotal = group.total_questions || 0;
                return (
                  <div 
                    key={group.id} 
                    className="card" 
                    onClick={() => router.push(`/todo/${group.id}`)}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between', 
                      cursor: 'pointer',
                      border: '1px solid var(--card-border)',
                      transition: 'transform 0.2s ease, border-color 0.2s ease',
                      minHeight: '160px',
                      padding: '20px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--link-color)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--card-border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 6px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '4px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          {group.category}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: '500', color: getDisplayDifficulty(group.difficulty) === 'Hard' ? '#d93025' : getDisplayDifficulty(group.difficulty) === 'Medium' ? '#b06000' : '#137333' }}>
                          {getDisplayDifficulty(group.difficulty)}
                        </span>
                      </div>
                      <h4 className="card-title" style={{ fontSize: '1.15rem', fontWeight: '700', margin: '8px 0', color: 'var(--text-heading)' }}>
                        {group.title}
                      </h4>
                    </div>
                    <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '12px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Questions: {qTotal}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--link-color)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        View Questions &rarr;
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
 
           {groupedTasks.length > visibleCurriculumCount && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setVisibleCurriculumCount(prev => prev + 8)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '10px 24px', 
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  borderRadius: '30px',
                  border: '1px solid var(--card-border)',
                  backgroundColor: 'var(--card-bg)',
                  boxShadow: 'var(--card-shadow)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span>View More</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Default Home Dashboard - explore curriculum and general progress */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Stats & KPIs Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
            
            {/* Stats Card */}
            <div className="card" style={{ minHeight: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-heading)' }}>
                  Overall Progress
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${computedStats.learningPercentage}%`, height: '100%', backgroundColor: '#1a73e8', borderRadius: '4px', transition: 'width 0.5s ease-in-out' }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Learning Progress</span>
                    <span style={{ fontWeight: '700', color: 'var(--link-color)' }}>{computedStats.learningPercentage}%</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '24px', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
                <div style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Completed Topics: </span>
                  <span style={{ fontWeight: '600', color: 'var(--text-heading)' }}>
                    {computedStats.completedTopicsCount} / {computedStats.totalTopicsCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Completed Questions KPI Card */}
            {(() => {
              const selectedTopicIds = new Set(
                userTasks
                  .filter(t => t.item_type === 'topic')
                  .map(t => t.item_id)
                  .filter(id => topics.some(topic => topic.id === id))
              );

              const totalTopicsCount = selectedTopicIds.size;
              const completedTopicsCount = computedStats.completedTopicsCount;
              const pendingTopicsCount = totalTopicsCount - completedTopicsCount;

              return (
                <>
                  <div 
                    className="card"
                    onClick={() => setDashboardFilter(prev => prev === 'completed' ? 'all' : 'completed')}
                    style={{
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: `1.5px solid ${dashboardFilter === 'completed' ? 'var(--link-color)' : 'var(--card-border)'}`,
                      backgroundColor: dashboardFilter === 'completed' ? 'rgba(56, 189, 248, 0.08)' : 'var(--card-bg)',
                      boxShadow: 'var(--card-shadow)',
                      minHeight: '160px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                      Completed Topics
                    </span>
                    <h3 style={{ fontSize: '3rem', fontWeight: '900', color: '#10b981', margin: '4px 0' }}>
                      {completedTopicsCount}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600', marginTop: '6px' }}>
                      {dashboardFilter === 'completed' ? '● Filtering Active' : 'Filter completed topics'}
                    </span>
                  </div>

                  <div 
                    className="card"
                    onClick={() => setDashboardFilter(prev => prev === 'pending' ? 'all' : 'pending')}
                    style={{
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: `1.5px solid ${dashboardFilter === 'pending' ? 'var(--link-color)' : 'var(--card-border)'}`,
                      backgroundColor: dashboardFilter === 'pending' ? 'rgba(56, 189, 248, 0.08)' : 'var(--card-bg)',
                      boxShadow: 'var(--card-shadow)',
                      minHeight: '160px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                      Pending Topics
                    </span>
                    <h3 style={{ fontSize: '3rem', fontWeight: '900', color: '#f59e0b', margin: '4px 0' }}>
                      {pendingTopicsCount}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '600', marginTop: '6px' }}>
                      {dashboardFilter === 'pending' ? '● Filtering Active' : 'Filter pending topics'}
                    </span>
                  </div>
                </>
              );
            })()}

          </div>

          {/* Curriculum Explore Grid */}
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-heading)' }}>
              {user?.role === 'admin' 
                ? 'Explore Curriculum Topics' 
                : dashboardFilter === 'completed' 
                  ? 'Selected Topics (Completed)' 
                  : dashboardFilter === 'pending' 
                    ? 'Selected Topics (Pending / In Progress)' 
                    : 'Selected Curriculum Topics'}
            </h3>
            
            {(() => {
              const selectedTopicIds = new Set(
                userTasks
                  .filter(t => t.item_type === 'topic')
                  .map(t => t.item_id)
                  .filter(id => topics.some(topic => topic.id === id))
              );
              
              const displayedTopics = topics.filter(topic => {
                const matchesSearch = !searchQuery || 
                  topic.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  topic.category.toLowerCase().includes(searchQuery.toLowerCase());

                if (user?.role === 'admin') {
                  return matchesSearch;
                }
                
                const isSelected = selectedTopicIds.has(topic.id);
                if (!isSelected || !matchesSearch) return false;

                const isCompleted = topic.completed;

                if (dashboardFilter === 'completed') return isCompleted;
                if (dashboardFilter === 'pending') return !isCompleted;
                return true;
              });

              if (displayedTopics.length === 0) {
                return (
                  <div style={{ padding: '40px 24px', textAlign: 'center', border: '1.5px dashed var(--card-border)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>
                      {user?.role === 'admin' 
                        ? 'No topics match your search.' 
                        : dashboardFilter === 'completed'
                          ? 'No fully completed topics found.'
                          : dashboardFilter === 'pending'
                            ? 'All selected topics are fully completed!'
                            : 'You have not selected any topics yet.'}
                    </p>
                    {user?.role !== 'admin' && dashboardFilter === 'all' && (
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem' }}>
                        Go to the <strong style={{ color: 'var(--link-color)', cursor: 'pointer' }} onClick={() => router.push('/?filter=all')}>Curriculum</strong> tab in the sidebar to browse and select topics for your dashboard.
                      </p>
                    )}
                  </div>
                );
              }

              return (
                <div className="todos-grid">
                  {displayedTopics.map((topic) => {
                    const totalQs = topic.total_questions || 0;
                    const completedQCount = topic.completed_questions || 0;
                    const progressPercent = totalQs > 0 ? Math.round((completedQCount / totalQs) * 100) : 0;

                    return (
                      <div 
                        key={topic.id} 
                        className="card" 
                        onClick={() => router.push(`/todo/${topic.id}`)}
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          border: '1px solid var(--card-border)',
                          transition: 'transform 0.2s ease, border-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--link-color)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--card-border)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 6px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                              {topic.category}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: '500', color: getDisplayDifficulty(topic.difficulty) === 'Hard' ? '#d93025' : getDisplayDifficulty(topic.difficulty) === 'Medium' ? '#b06000' : '#137333' }}>
                              {getDisplayDifficulty(topic.difficulty)}
                            </span>
                          </div>
                          <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-heading)' }}>
                            {topic.title}
                          </h4>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Est. Time: {topic.estimated_time}</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                            <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#137333' }}></div>
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)' }}>{progressPercent}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {renderModal()}

      {/* Floating Query Button (FAB) - only visible to students */}
      {user && user.role !== 'admin' && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1050 }}>
          {fabOpen && (
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px', 
                marginBottom: '16px', 
                alignItems: 'flex-end' 
              }}
            >
              {/* Option 1: Ask Query */}
              <button
                onClick={() => {
                  setFabOpen(false);
                  setShowQueryModal(true);
                }}
                className="btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '24px',
                  color: 'var(--text-heading)',
                  boxShadow: 'var(--card-shadow)',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transform: 'scale(1)',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span>Ask Query</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </button>

              {/* Option 2: Submit Code */}
              <button
                onClick={() => {
                  setFabOpen(false);
                  setShowSubmitCodeModal(true);
                  if (topics && topics.length > 0) {
                    setSubmitCodeTopicId(topics[0].id.toString());
                  }
                }}
                className="btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '24px',
                  color: 'var(--text-heading)',
                  boxShadow: 'var(--card-shadow)',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transform: 'scale(1)',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span>Submit Code</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
              </button>
            </div>
          )}

          {/* Main Floating Button */}
          <button
            onClick={() => setFabOpen(!fabOpen)}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--link-color) 0%, #4f46e5 100%)',
              border: 'none',
              color: '#ffffff',
              boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: fabOpen ? 'rotate(45deg)' : 'rotate(0)',
              transition: 'transform 0.2s ease, background 0.2s ease'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      )}

      {/* Ask Query Modal */}
      {showQueryModal && (
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
              maxWidth: '500px',
              padding: '24px',
              boxShadow: 'var(--card-shadow)',
              position: 'relative',
              textAlign: 'left'
            }}
          >
            <button 
              onClick={() => setShowQueryModal(false)}
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
              Ask a Query
            </h3>
            
            {querySuccess && (
              <div className="save-indicator" style={{ marginBottom: '16px' }}>{querySuccess}</div>
            )}
            
            <form onSubmit={handleQuerySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                  How can we help you?
                </label>
                <textarea
                  required
                  rows={5}
                  className="search-bar"
                  placeholder="Describe your issue, error, or question..."
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '0.9rem',
                    minHeight: '120px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowQueryModal(false)}
                  disabled={submittingQuery}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submittingQuery}
                >
                  {submittingQuery ? 'Submitting...' : 'Submit Query'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Code Modal */}
      {showSubmitCodeModal && (
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
              onClick={() => setShowSubmitCodeModal(false)}
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
              Submit Your Code Solution
            </h3>
            
            {codeSuccess && (
              <div className="save-indicator" style={{ marginBottom: '16px' }}>{codeSuccess}</div>
            )}
            
            <form onSubmit={handleCodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                    Topic
                  </label>
                  <select
                    className="search-bar"
                    value={submitCodeTopicId}
                    onChange={(e) => setSubmitCodeTopicId(e.target.value)}
                    style={{ width: '100%', padding: '10px' }}
                  >
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                    Question
                  </label>
                  {loadingTopicQuestions ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '10px' }}>Loading questions...</div>
                  ) : topicQuestions.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#ff4d4f', padding: '10px' }}>No questions in this topic</div>
                  ) : (
                    <select
                      className="search-bar"
                      value={submitCodeQuestionTitle}
                      onChange={(e) => setSubmitCodeQuestionTitle(e.target.value)}
                      style={{ width: '100%', padding: '10px' }}
                    >
                      {topicQuestions.map(q => (
                        <option key={q.id} value={q.title}>{q.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                  Code Content
                </label>
                <textarea
                  required
                  rows={10}
                  className="search-bar"
                  placeholder="// Paste your solution code here..."
                  value={submitCodeContent}
                  onChange={(e) => setSubmitCodeContent(e.target.value)}
                  style={{
                    width: '100%',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    padding: '12px',
                    minHeight: '200px',
                    resize: 'vertical',
                    backgroundColor: '#1e1e2f',
                    color: '#f8f8f2',
                    border: '1px solid var(--card-border)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowSubmitCodeModal(false)}
                  disabled={submittingCode}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submittingCode || topicQuestions.length === 0}
                >
                  {submittingCode ? 'Submitting...' : 'Submit Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reply Modal */}
      {replyingQuery && (
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
              maxWidth: '500px',
              padding: '24px',
              boxShadow: 'var(--card-shadow)',
              position: 'relative',
              textAlign: 'left'
            }}
          >
            <button 
              onClick={() => {
                setReplyingQuery(null);
                setReplyText('');
              }}
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
              Reply to Query QRY-#{replyingQuery.id}
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700' }}>Student: @{replyingQuery.users?.username || 'unknown'}</span>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-color)', margin: '6px 0 0 0', padding: '10px', backgroundColor: 'var(--body-bg)', borderRadius: '6px', border: '1px solid var(--card-border)', maxHeight: '100px', overflowY: 'auto' }}>
                {replyingQuery.query_text}
              </p>
            </div>
            
            <form onSubmit={handleReplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                  Your Response
                </label>
                <textarea
                  required
                  rows={5}
                  className="search-bar"
                  placeholder="Type your reply here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '0.9rem',
                    minHeight: '120px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setReplyingQuery(null);
                    setReplyText('');
                  }}
                  disabled={submittingReply}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={submittingReply}
                >
                  {submittingReply ? 'Submitting...' : 'Submit Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submission Feedback Modal handled in admin return block */}
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
