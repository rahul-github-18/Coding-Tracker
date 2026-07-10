"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { todoService, userService, taskService, questionService } from '@/lib/api';

function DashboardContent({ searchQuery }) {
  const [user, setUser] = useState(null);
  const [topics, setTopics] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [questionPage, setQuestionPage] = useState(0);
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
        loadDashboardData(u);
      } catch (e) {
        localStorage.clear();
        router.replace('/login');
      }
    }
  }, [router, filter, searchParams]);

  const loadDashboardData = async (u) => {
    setLoading(true);
    setError('');
    try {
      console.time('API: Parallel Fetch Dashboard Data');
      
      // Parallelize all curriculum, stats, user list, and tasks API calls
      const promises = [
        todoService.getTodos(),
        taskService.getUserTasks(),
        taskService.getUserStats(),
        questionService.getAllQuestions()
      ];

      if (u.role === 'admin') {
        promises.push(userService.getUsers());
      } else {
        promises.push(Promise.resolve(null));
      }

      const [allTopics, tasks, stats, allQs, allUsers] = await Promise.all(promises);
      console.timeEnd('API: Parallel Fetch Dashboard Data');

      setTopics(allTopics || []);
      const topicIdParam = searchParams.get('topicId');
      if (topicIdParam) {
        setSelectedTopicId(parseInt(topicIdParam, 10));
      } else if (allTopics && allTopics.length > 0) {
        setSelectedTopicId(prev => prev || allTopics[0].id);
      }
      setUserTasks(tasks || []);
      setAllQuestions(allQs || []);
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

  const handleExportTopicPDF = (topic) => {
    if (!topic) return;
    const questionsForTopic = allQuestions.filter(q => q.todo_id === topic.id);

    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      let yPos = 20;

      const addText = (text, fontSize = 10, isBold = false, color = [0, 0, 0], spacing = 5) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setTextColor(color[0], color[1], color[2]);

        const lines = doc.splitTextToSize(text, contentWidth);
        const requiredHeight = lines.length * (fontSize * 0.4) + spacing;
        if (yPos + requiredHeight > pageHeight - margin) {
          doc.addPage();
          yPos = 20;
        }

        lines.forEach(line => {
          doc.text(line, margin, yPos);
          yPos += (fontSize * 0.4);
        });

        yPos += spacing;
      };

      addText(`CURRICULUM TOPIC: ${topic.title.toUpperCase()}`, 16, true, [26, 115, 232], 8);
      addText(`Category: ${topic.category || 'General'} | Difficulty: ${topic.difficulty || 'Easy'} | Estimated Time: ${topic.estimated_time || '1 hour'}`, 10, false, [128, 128, 128], 10);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      addText(`Questions (${questionsForTopic.length})`, 13, true, [0, 0, 0], 8);

      questionsForTopic.forEach((q, idx) => {
        addText(`${idx + 1}. ${q.title}`, 11, true, [0, 0, 0], 4);
        addText(`Difficulty: ${q.difficulty || 'Easy'} | Tags: ${q.tags || 'None'}`, 9, false, [100, 100, 100], 4);

        if (q.description) {
          addText(`Description:`, 9, true, [80, 80, 80], 2);
          addText(q.description, 9.5, false, [50, 50, 50], 4);
        }

        if (q.code) {
          addText(`Starter / Reference Code:`, 9, true, [80, 80, 80], 2);
          doc.setFontSize(8.5);
          doc.setFont('courier', 'normal');
          doc.setTextColor(50, 50, 50);
          
          const codeLines = doc.splitTextToSize(q.code, contentWidth - 6);
          const boxHeight = codeLines.length * 3.8 + 6;

          if (yPos + boxHeight > pageHeight - margin) {
            doc.addPage();
            yPos = 20;
          }

          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPos, contentWidth, boxHeight, 'F');
          
          let codeY = yPos + 4;
          codeLines.forEach(line => {
            doc.text(line, margin + 3, codeY);
            codeY += 3.8;
          });

          yPos += boxHeight + 4;
        }

        if (q.explanation) {
          addText(`Explanation & Answer:`, 9, true, [80, 80, 80], 2);
          addText(q.explanation, 9.5, false, [50, 50, 50], 6);
        }

        if (idx < questionsForTopic.length - 1) {
          if (yPos + 10 > pageHeight - margin) {
            doc.addPage();
            yPos = 20;
          } else {
            doc.setDrawColor(240, 240, 240);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 8;
          }
        }
      });

      doc.save(`${topic.title.replace(/\s+/g, '_')}_Curriculum.pdf`);
    }).catch(err => {
      console.error("Failed to load jsPDF library:", err);
      setError("Failed to generate PDF document.");
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
  const handleToggleItemStatus = async (item) => {
    if (user && !user.approved && user.role !== 'admin') {
      setError('Your account is pending admin approval.');
      return;
    }
    setError('');
    try {
      if (item.taskId) {
        let nextStatus = 'Pending';
        if (item.status === 'Pending') nextStatus = 'In Progress';
        else if (item.status === 'In Progress') nextStatus = 'Completed';
        
        if (nextStatus === 'Pending') {
          await taskService.removeTask(item.taskId);
        } else {
          await taskService.updateTask(item.taskId, { status: nextStatus });
        }
      } else {
        await taskService.addTask(item.item_type, item.dbId, 'In Progress');
      }
      loadDashboardData(user);
    } catch (err) {
      setError('Failed to update task status.');
    }
  };

  const handleRemoveTaskItem = async (item) => {
    if (!item.taskId) return;
    if (!window.confirm('Are you sure you want to remove this task?')) return;
    setError('');
    try {
      await taskService.removeTask(item.taskId);
      loadDashboardData(user);
    } catch (err) {
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

  const handleToggleTopicSelection = async (topicId) => {
    if (user && !user.approved && user.role !== 'admin') {
      setError('Your account is pending admin approval.');
      return;
    }
    setError('');
    setSuccess('');
    
    const existingTask = userTasks.find(t => t.item_type === 'topic' && t.item_id === topicId);
    
    try {
      if (existingTask) {
        await taskService.removeTask(existingTask.id);
        setSuccess('Topic removed from progress.');
      } else {
        await taskService.addTask('topic', topicId, 'In Progress');
        setSuccess('Topic added to progress.');
      }
      loadDashboardData(user);
    } catch (err) {
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
      loadDashboardData(user);
    } catch (err) {
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

    const completedQuestionIds = new Set(
      userTasks.filter(t => t.item_type === 'question' && t.status === 'Completed').map(t => t.item_id)
    );

    let totalQuestionsInSelected = 0;
    let completedQuestionsInSelected = 0;
    let completedTopicsCount = 0;

    topics.forEach(topic => {
      if (selectedTopicIds.has(topic.id)) {
        const topicQs = allQuestions.filter(q => q.todo_id === topic.id);
        totalQuestionsInSelected += topicQs.length;
        
        const completedQs = topicQs.filter(q => completedQuestionIds.has(q.id));
        completedQuestionsInSelected += completedQs.length;

        if (topicQs.length > 0 && completedQs.length === topicQs.length) {
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
  }, [topics, allQuestions, userTasks]);

  const renderTasks = useMemo(() => {
    if (filter === 'today') {
      return userTasks.filter(t => t.status !== 'Completed').map(t => ({
        id: `today_${t.id}`,
        dbId: t.item_id,
        item_type: t.item_type,
        title: t.details?.title || 'Coding task',
        status: t.status,
        taskId: t.id
      }));
    }
    
    // For filter === 'all'
    const statusMap = {};
    userTasks.forEach(t => {
      statusMap[`${t.item_type}_${t.item_id}`] = {
        id: t.id,
        status: t.status
      };
    });

    const items = [];
    topics.forEach(topic => {
      const state = statusMap[`topic_${topic.id}`] || {};
      items.push({
        id: `topic_${topic.id}`,
        dbId: topic.id,
        item_type: 'topic',
        title: topic.title,
        status: state.status || 'Pending',
        taskId: state.id || null
      });

      // Add questions for this topic
      const topicQuestions = allQuestions.filter(q => q.todo_id === topic.id);
      topicQuestions.forEach(q => {
        const qState = statusMap[`question_${q.id}`] || {};
        items.push({
          id: `question_${q.id}`,
          dbId: q.id,
          item_type: 'question',
          title: `${topic.title} > ${q.title}`,
          status: qState.status || 'Pending',
          taskId: qState.id || null
        });
      });
    });

    if (searchQuery) {
      return items.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return items;
  }, [topics, allQuestions, userTasks, filter, searchQuery]);

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
      
      const topicQuestions = allQuestions.filter(q => q.todo_id === topic.id).map(q => {
        const qTask = statusMap[`question_${q.id}`] || {};
        return {
          ...q,
          status: qTask.status || 'Pending',
          taskId: qTask.id || null
        };
      });

      return {
        id: topic.id,
        title: topic.title,
        category: topic.category,
        difficulty: topic.difficulty,
        status: topicTask.status || 'Pending',
        taskId: topicTask.id || null,
        questions: topicQuestions
      };
    });

    if (searchQuery) {
      return groups.filter(g => 
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.questions.some(q => q.title.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return groups;
  }, [topics, allQuestions, userTasks, searchQuery]);

  const allTasksCount = useMemo(() => {
    return groupedTasks.reduce((acc, g) => acc + 1 + g.questions.length, 0);
  }, [groupedTasks]);

  const completedTasksCount = useMemo(() => {
    return groupedTasks.reduce((acc, g) => acc + (g.status === 'Completed' ? 1 : 0) + g.questions.filter(q => q.status === 'Completed').length, 0);
  }, [groupedTasks]);

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
                    <span style={{ fontSize: '0.75rem', fontWeight: '500', color: topic.difficulty === 'Hard' ? '#d93025' : topic.difficulty === 'Medium' ? '#b06000' : '#137333' }}>
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
      <div className="card" style={{ minHeight: 'auto', padding: '24px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#ffffff' }}>
          Welcome, {user.username}!
        </h2>
      </div>

      {user.role !== 'admin' && !user.approved && (
        <div style={{ padding: '16px', backgroundColor: '#fef7e0', border: '1px solid #feebc8', borderRadius: '8px', color: '#c05621', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span>⚠️</span>
          <span>Your account is pending admin approval. You can browse topics but cannot add tasks to your daily board yet.</span>
        </div>
      )}

      {error && <div className="login-error">{error}</div>}
      {success && <div className="save-indicator" style={{ marginBottom: '12px' }}>{success}</div>}

      {filter === 'all' ? (
          /* Curriculum Management Split View (Master-Detail) */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>
            
            {/* Left Side: Topic Navigation Menu (Master Panel) */}
            <div className="card" style={{ padding: '20px', minHeight: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-heading)', margin: 0 }}>
                  Curriculum Topics
                </h3>
                {user?.role === 'admin' && (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      setNewTopic({ title: '', category: 'General', difficulty: 'Easy', estimatedTime: '1 hour' });
                      setActiveForm('createTopic');
                    }}
                    style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: '600' }}
                  >
                    + Add Topic
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {groupedTasks.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No topics match search.</div>
                ) : (
                  groupedTasks.map((group) => {
                    const isActive = selectedTopicId === group.id;
                    const qTotal = group.questions.length;

                    return (
                      <div 
                        key={group.id}
                        onClick={() => {
                          setSelectedTopicId(group.id);
                          setQuestionPage(0);
                        }}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: `1px solid ${isActive ? 'var(--link-color)' : 'var(--card-border)'}`,
                          backgroundColor: isActive ? 'rgba(26, 115, 232, 0.08)' : 'var(--list-item-bg)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: '600', padding: '1px 4px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '4px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {group.category}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', color: isActive ? 'var(--link-color)' : 'var(--text-heading)' }}>
                          {group.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Questions: {qTotal}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Side: Questions & Details for Selected Topic (Detail Panel) */}
            {(() => {
              const activeGroup = groupedTasks.find(g => g.id === selectedTopicId) || groupedTasks[0];
              if (!activeGroup) {
                return (
                  <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No topic selected.
                  </div>
                );
              }

              const topicQs = activeGroup.questions || [];
              const completedQs = topicQs.filter(q => userTasks.some(t => t.item_type === 'question' && t.item_id === q.id && t.status === 'Completed'));
              const pendingQs = topicQs.filter(q => !userTasks.some(t => t.item_type === 'question' && t.item_id === q.id && t.status === 'Completed'));

              const displayedQuestions = (() => {
                if (questionFilter === 'completed') return completedQs;
                if (questionFilter === 'pending') return pendingQs;
                return topicQs;
              })();

              const handleKPIFilterClick = (filterType) => {
                setQuestionFilter(prev => prev === filterType ? 'all' : filterType);
                setQuestionPage(0);
              };

              return (
                <div className="card" style={{ padding: '24px', minHeight: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--card-border)', paddingBottom: '16px', marginBottom: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '2px 6px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '4px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          {activeGroup.category}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: '500', color: activeGroup.difficulty === 'Hard' ? '#d93025' : activeGroup.difficulty === 'Medium' ? '#b06000' : '#137333' }}>
                          {activeGroup.difficulty}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-heading)', margin: 0 }}>
                        {activeGroup.title}
                      </h3>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {user?.role === 'admin' && (
                        <>
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setEditingTopic(activeGroup);
                              setActiveForm('editTopic');
                            }}
                            style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600' }}
                          >
                            Edit Topic
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDeleteTopic(activeGroup.id)}
                            style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600' }}
                          >
                            Delete Topic
                          </button>
                        </>
                      )}
                      {user?.role !== 'admin' && (
                        <button
                          className="btn"
                          onClick={() => handleToggleTopicSelection(activeGroup.id)}
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            backgroundColor: userTasks.some(t => t.item_type === 'topic' && t.item_id === activeGroup.id) 
                              ? '#e6f4ea' 
                              : 'var(--btn-secondary-bg)',
                            color: userTasks.some(t => t.item_type === 'topic' && t.item_id === activeGroup.id)
                              ? '#137333'
                              : 'var(--text-color)',
                            border: '1px solid ' + (userTasks.some(t => t.item_type === 'topic' && t.item_id === activeGroup.id) ? '#ceead6' : 'var(--card-border)')
                          }}
                        >
                          {userTasks.some(t => t.item_type === 'topic' && t.item_id === activeGroup.id) ? '✓ Selected' : '+ Select Topic'}
                        </button>
                      )}
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => handleExportTopicPDF(activeGroup)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export Topic
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: '600' }}
                          onClick={() => router.push(`/todo/${activeGroup.id}`)}
                        >
                          Study Topic &rarr;
                        </button>
                      )}
                    </div>
                  </div>

                  {/* KPI Cards Row */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <div 
                      onClick={() => handleKPIFilterClick('completed')}
                      style={{
                        flex: 1,
                        minWidth: '130px',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: `1.5px solid ${questionFilter === 'completed' ? '#137333' : 'var(--card-border)'}`,
                        backgroundColor: questionFilter === 'completed' ? 'rgba(19, 115, 51, 0.08)' : 'var(--list-item-bg)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        boxShadow: 'var(--card-shadow)'
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Completed Questions
                      </span>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#137333', margin: 0 }}>
                        {completedQs.length}
                      </h3>
                      <span style={{ fontSize: '0.65rem', color: '#137333', fontWeight: '600' }}>
                        {questionFilter === 'completed' ? '● Filtering Active (Reset)' : 'Filter completed'}
                      </span>
                    </div>

                    <div 
                      onClick={() => handleKPIFilterClick('pending')}
                      style={{
                        flex: 1,
                        minWidth: '130px',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: `1.5px solid ${questionFilter === 'pending' ? '#b06000' : 'var(--card-border)'}`,
                        backgroundColor: questionFilter === 'pending' ? 'rgba(176, 96, 0, 0.08)' : 'var(--list-item-bg)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        boxShadow: 'var(--card-shadow)'
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Pending Questions
                      </span>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#b06000', margin: 0 }}>
                        {pendingQs.length}
                      </h3>
                      <span style={{ fontSize: '0.65rem', color: '#b06000', fontWeight: '600' }}>
                        {questionFilter === 'pending' ? '● Filtering Active (Reset)' : 'Filter pending'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-heading)', margin: 0 }}>
                      Curriculum Questions {questionFilter !== 'all' && `(${questionFilter === 'completed' ? 'Completed' : 'Pending'})`}
                    </h4>
                    {user?.role === 'admin' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setNewQuestionForm({
                            title: '',
                            difficulty: 'Easy',
                            tags: '',
                            description: '',
                            code: '',
                            explanation: ''
                          });
                          setActiveForm('createQuestion');
                        }}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600' }}
                      >
                        + Add Question
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {topicQs.length === 0 ? (
                      <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', border: '1.5px dashed var(--card-border)', borderRadius: '8px', fontSize: '0.85rem' }}>
                        No questions registered under this curriculum topic.
                      </div>
                    ) : displayedQuestions.length === 0 ? (
                      <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', border: '1.5px dashed var(--card-border)', borderRadius: '8px', fontSize: '0.85rem' }}>
                        {questionFilter === 'completed' ? 'No completed questions found.' : 'All questions completed! No pending questions.'}
                      </div>
                    ) : (
                      displayedQuestions.slice(questionPage * 10, (questionPage + 1) * 10).map((q) => {
                        const isExpanded = expandedQuestionId === q.id;
                        return (
                          <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid var(--card-border)', borderRadius: '8px', overflow: 'hidden' }}>
                            {/* Main Question Header Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--list-item-bg)' }}>
                              <div 
                                onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, marginRight: '16px', cursor: 'pointer' }}
                              >
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '12px', textAlign: 'center' }}>
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                                <span style={{ 
                                  fontSize: '0.65rem', 
                                  padding: '2.5px 7px', 
                                  borderRadius: '4px', 
                                  textTransform: 'uppercase', 
                                  fontWeight: '700',
                                  backgroundColor: q.difficulty === 'Hard' ? '#fde8e8' : q.difficulty === 'Medium' ? '#fef3c7' : '#e6f4ea',
                                  color: q.difficulty === 'Hard' ? '#d93025' : q.difficulty === 'Medium' ? '#b06000' : '#137333',
                                  border: '1px solid ' + (q.difficulty === 'Hard' ? '#f8b4b4' : q.difficulty === 'Medium' ? '#fcd34d' : '#ceead6')
                                }}>
                                  {q.difficulty}
                                </span>
                                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-heading)' }}>
                                  {q.title}
                                </span>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* Completed Button */}
                                <button
                                  className="btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleQuestionCompletion(q.id);
                                  }}
                                  style={{
                                    padding: '4px 10px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    backgroundColor: userTasks.some(t => t.item_type === 'question' && t.item_id === q.id && t.status === 'Completed') 
                                      ? '#e6f4ea' 
                                      : 'var(--btn-secondary-bg)',
                                    color: userTasks.some(t => t.item_type === 'question' && t.item_id === q.id && t.status === 'Completed')
                                      ? '#137333'
                                      : 'var(--text-color)',
                                    border: '1px solid ' + (userTasks.some(t => t.item_type === 'question' && t.item_id === q.id && t.status === 'Completed') ? '#ceead6' : 'var(--card-border)')
                                  }}
                                >
                                  {userTasks.some(t => t.item_type === 'question' && t.item_id === q.id && t.status === 'Completed') ? '✓ Completed' : 'Completed'}
                                </button>

                                {user?.role === 'admin' && (
                                  <>
                                    <button
                                      className="btn btn-secondary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingQuestion(q);
                                        setActiveForm('editQuestion');
                                      }}
                                      style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: '600' }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="btn btn-danger"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteQuestion(q.id);
                                      }}
                                      style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: '600' }}
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Collapsible Details Body */}
                            {isExpanded && (
                              <div style={{ 
                                padding: '16px', 
                                backgroundColor: 'var(--card-bg)', 
                                borderTop: '1px solid var(--card-border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px'
                              }}>
                                {/* Badges & Metadata */}
                                {q.tags && (
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {q.tags.split(',').map((tag, idx) => (
                                      <span key={idx} style={{ fontSize: '0.7rem', padding: '2px 6px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                                        {tag.trim()}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {/* Description */}
                                {q.description && (
                                  <div>
                                    <h5 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-heading)' }}>Description</h5>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-color)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                                      {q.description}
                                    </p>
                                  </div>
                                )}

                                {/* Explanation */}
                                {q.explanation && (
                                  <div>
                                    <h5 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-heading)' }}>Explanation</h5>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-color)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                                      {q.explanation}
                                    </p>
                                  </div>
                                )}

                                {/* Code Template */}
                                {q.code && (
                                  <div>
                                    <h5 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-heading)' }}>Code</h5>
                                    <pre style={{ 
                                      margin: 0, 
                                      padding: '12px', 
                                      backgroundColor: '#1e1e1e', 
                                      color: '#d4d4d4', 
                                      borderRadius: '6px', 
                                      fontFamily: 'monospace', 
                                      fontSize: '0.8rem', 
                                      overflowX: 'auto',
                                      lineHeight: '1.4'
                                    }}>
                                      <code>{q.code}</code>
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {displayedQuestions.length > 10 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setQuestionPage(p => Math.max(0, p - 1))}
                        disabled={questionPage === 0}
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        &larr; Previous 10
                      </button>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Showing {questionPage * 10 + 1} - {Math.min((questionPage + 1) * 10, displayedQuestions.length)} of {displayedQuestions.length} Questions
                      </span>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setQuestionPage(p => ((p + 1) * 10 < displayedQuestions.length ? p + 1 : p))}
                        disabled={(questionPage + 1) * 10 >= displayedQuestions.length}
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Next 10 &rarr;
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

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
                    onClick={() => setDashboardFilter(prev => prev === 'completed' ? 'all' : 'completed')}
                    style={{
                      padding: '12px 18px',
                      borderRadius: '8px',
                      border: `1.5px solid ${dashboardFilter === 'completed' ? '#137333' : 'var(--card-border)'}`,
                      backgroundColor: dashboardFilter === 'completed' ? 'rgba(19, 115, 51, 0.08)' : 'var(--card-bg)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '100px',
                      boxShadow: 'var(--card-shadow)'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Completed Topics
                      </span>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#137333', marginTop: '6px', marginBottom: '4px' }}>
                        {completedTopicsCount}
                      </h3>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#137333', fontWeight: '600' }}>
                      {dashboardFilter === 'completed' ? '● Filtering Active (Reset)' : 'Filter completed topics'}
                    </span>
                  </div>

                  <div 
                    onClick={() => setDashboardFilter(prev => prev === 'pending' ? 'all' : 'pending')}
                    style={{
                      padding: '12px 18px',
                      borderRadius: '8px',
                      border: `1.5px solid ${dashboardFilter === 'pending' ? '#b06000' : 'var(--card-border)'}`,
                      backgroundColor: dashboardFilter === 'pending' ? 'rgba(176, 96, 0, 0.08)' : 'var(--card-bg)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '100px',
                      boxShadow: 'var(--card-shadow)'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Pending Topics
                      </span>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#b06000', marginTop: '6px', marginBottom: '4px' }}>
                        {pendingTopicsCount}
                      </h3>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#b06000', fontWeight: '600' }}>
                      {dashboardFilter === 'pending' ? '● Filtering Active (Reset)' : 'Filter pending topics'}
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

                const topicQs = allQuestions.filter(q => q.todo_id === topic.id);
                const completedQCount = topicQs.filter(q => userTasks.some(t => t.item_type === 'question' && t.item_id === q.id && t.status === 'Completed')).length;
                const isCompleted = topicQs.length > 0 && completedQCount === topicQs.length;

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
                    const topicQs = allQuestions.filter(q => q.todo_id === topic.id);
                    const completedQCount = topicQs.filter(q => userTasks.some(t => t.item_type === 'question' && t.item_id === q.id && t.status === 'Completed')).length;
                    const progressPercent = topicQs.length > 0 ? Math.round((completedQCount / topicQs.length) * 100) : 0;

                    return (
                      <div key={topic.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 6px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                              {topic.category}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: '500', color: topic.difficulty === 'Hard' ? '#d93025' : topic.difficulty === 'Medium' ? '#b06000' : '#137333' }}>
                              {topic.difficulty}
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

                        <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '12px', marginTop: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => router.push(`/?filter=all&topicId=${topic.id}`)}>
                            Study Topic &rarr;
                          </button>
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
