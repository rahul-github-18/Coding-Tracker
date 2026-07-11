"use client";

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { todoService, taskService, questionService } from '@/lib/api';

const getDisplayDifficulty = (difficulty) => {
  if (!difficulty) return 'Easy';
  const d = String(difficulty).toLowerCase();
  if (d.includes('beg') || d.includes('easy')) return 'Easy';
  if (d.includes('int') || d.includes('mid') || d.includes('med')) return 'Medium';
  if (d.includes('adv') || d.includes('hard')) return 'Hard';
  return 'Easy';
};

function TodoDetailContent() {
  const { id: topicIdRaw } = useParams();
  const topicId = parseInt(topicIdRaw, 10);
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [topic, setTopic] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [userTasks, setUserTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authorized, setAuthorized] = useState(false);

  // Form states
  const [activeForm, setActiveForm] = useState(null); // 'editTopic', 'createQuestion', 'editQuestion'
  const [editingTopic, setEditingTopic] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [newQuestionForm, setNewQuestionForm] = useState({
    title: '',
    difficulty: 'Easy',
    tags: '',
    description: '',
    code: '',
    explanation: ''
  });
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [questionFilter, setQuestionFilter] = useState('all');
  const [questionPage, setQuestionPage] = useState(0);

  // Excel upload states
  const [questionUploadMode, setQuestionUploadMode] = useState('manual');
  const [selectedFileForUpload, setSelectedFileForUpload] = useState(null);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      router.replace('/login');
    } else {
      try {
        const u = JSON.parse(localStorage.getItem('currentUser'));
        setUser(u);
        setAuthorized(true);
        loadTopicData(u);
      } catch (e) {
        localStorage.clear();
        router.replace('/login');
      }
    }
  }, [topicId, router]);

  const loadTopicData = async (u) => {
    setLoading(true);
    setError('');
    try {
      const [topicDetail, tasks] = await Promise.all([
        todoService.getTodo(topicId),
        taskService.getUserTasks()
      ]);
      setTopic(topicDetail);
      setQuestions(topicDetail.questions || []);
      setUserTasks(tasks || []);
    } catch (err) {
      console.error(err);
      setError('Could not retrieve topic details.');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleEditTopicSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await todoService.updateTodo(topicId, {
        title: editingTopic.title,
        category: editingTopic.category,
        difficulty: editingTopic.difficulty,
        estimatedTime: editingTopic.estimated_time || editingTopic.estimatedTime
      });
      setSuccess('Topic updated successfully!');
      setActiveForm(null);
      loadTopicData(user);
    } catch (err) {
      setError(err.message || 'Failed to update topic.');
    }
  };

  const handleDeleteTopic = async () => {
    if (!window.confirm('Are you sure you want to delete this topic and all its questions? This cannot be undone.')) return;
    setError('');
    setSuccess('');
    try {
      await todoService.deleteTodo(topicId);
      setSuccess('Topic deleted successfully!');
      router.push('/?filter=all');
    } catch (err) {
      setError('Failed to delete topic.');
    }
  };

  const handleToggleTopicSelection = async () => {
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
    } catch (err) {
      setUserTasks(backupTasks);
      setError('Failed to update question completion.');
    }
  };

  const handleCreateQuestionSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await questionService.createQuestion(topicId, newQuestionForm);
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
      loadTopicData(user);
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
      loadTopicData(user);
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
      loadTopicData(user);
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
            await questionService.createQuestion(topicId, q);
          }

          setSuccess(`Successfully imported ${questionsToInsert.length} questions!`);
          setSelectedFileForUpload(null);
          setActiveForm(null);
          loadTopicData(user);
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

  const handleExportTopicPDF = () => {
    if (!topic) return;

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

      addText(`Questions (${questions.length})`, 13, true, [0, 0, 0], 8);

      questions.forEach((q, idx) => {
        addText(`${idx + 1}. ${q.title}`, 11, true, [0, 0, 0], 4);
        addText(`Difficulty: ${getDisplayDifficulty(q.difficulty)} | Tags: ${q.tags || 'None'}`, 9, false, [100, 100, 100], 4);

        if (q.description) {
          addText(`Description:`, 9, true, [80, 80, 80], 2);
          addText(q.description, 9.5, false, [50, 50, 50], 4);
        }

        if (q.explanation) {
          addText(`Explanation:`, 9, true, [80, 80, 80], 2);
          addText(q.explanation, 9.5, false, [50, 50, 50], 6);
        }

        if (q.code) {
          addText(`Code:`, 9, true, [80, 80, 80], 2);
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

        if (idx < questions.length - 1) {
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

  const handleKPIFilterClick = (filterType) => {
    setQuestionFilter(prev => prev === filterType ? 'all' : filterType);
    setQuestionPage(0);
  };

  if (!authorized) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Checking authorization...</div>;
  }

  if (loading && !topic) {
    return <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading topic details...</div>;
  }

  const topicQs = questions || [];
  const completedQs = topicQs.filter(q => userTasks.some(t => t.item_type === 'question' && t.item_id === q.id && t.status === 'Completed'));
  const pendingQs = topicQs.filter(q => !userTasks.some(t => t.item_type === 'question' && t.item_id === q.id && t.status === 'Completed'));

  const displayedQuestions = (() => {
    if (questionFilter === 'completed') return completedQs;
    if (questionFilter === 'pending') return pendingQs;
    return topicQs;
  })();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Back to Topics list */}
      <div>
        <button 
          className="btn btn-secondary" 
          onClick={() => router.push('/?filter=all')}
          style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          &larr; Back to Topics
        </button>
      </div>

      {error && <div className="login-error">{error}</div>}
      {success && <div className="save-indicator" style={{ marginBottom: '12px' }}>{success}</div>}

      {topic && (
        <div className="card" style={{ padding: '24px', minHeight: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--card-border)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '2px 6px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '4px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {topic.category}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: '500', color: getDisplayDifficulty(topic.difficulty) === 'Hard' ? '#d93025' : getDisplayDifficulty(topic.difficulty) === 'Medium' ? '#b06000' : '#137333' }}>
                  {getDisplayDifficulty(topic.difficulty)}
                </span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-heading)', margin: 0 }}>
                {topic.title}
              </h3>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {user?.role === 'admin' && (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingTopic(topic);
                      setActiveForm('editTopic');
                    }}
                    style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600' }}
                  >
                    Edit Topic
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleDeleteTopic}
                    style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600' }}
                  >
                    Delete Topic
                  </button>
                </>
              )}
              {user?.role !== 'admin' && (
                <button
                  className="btn"
                  onClick={handleToggleTopicSelection}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    backgroundColor: userTasks.some(t => t.item_type === 'topic' && t.item_id === topicId) 
                      ? '#e6f4ea' 
                      : 'var(--btn-secondary-bg)',
                    color: userTasks.some(t => t.item_type === 'topic' && t.item_id === topicId)
                      ? '#137333'
                      : 'var(--text-color)',
                    border: '1px solid ' + (userTasks.some(t => t.item_type === 'topic' && t.item_id === topicId) ? '#ceead6' : 'var(--card-border)')
                  }}
                >
                  {userTasks.some(t => t.item_type === 'topic' && t.item_id === topicId) ? '✓ Selected' : '+ Select Topic'}
                </button>
              )}
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={handleExportTopicPDF}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export Topic
              </button>
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
                          backgroundColor: getDisplayDifficulty(q.difficulty) === 'Hard' ? '#fde8e8' : getDisplayDifficulty(q.difficulty) === 'Medium' ? '#fef3c7' : '#e6f4ea',
                          color: getDisplayDifficulty(q.difficulty) === 'Hard' ? '#d93025' : getDisplayDifficulty(q.difficulty) === 'Medium' ? '#b06000' : '#137333',
                          border: '1px solid ' + (getDisplayDifficulty(q.difficulty) === 'Hard' ? '#f8b4b4' : getDisplayDifficulty(q.difficulty) === 'Medium' ? '#fcd34d' : '#ceead6')
                        }}>
                          {getDisplayDifficulty(q.difficulty)}
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
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteQuestion(q.id);
                              }}
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Question Content Dropdown Details */}
                    {isExpanded && (
                      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                        {q.tags && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {q.tags.split(',').map((tag, i) => (
                              <span key={i} style={{ fontSize: '0.7rem', padding: '2px 8px', backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--text-muted)', borderRadius: '12px', fontWeight: '500' }}>
                                #{tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                        {q.description && (
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description / Prompt</span>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-color)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                              {q.description}
                            </p>
                          </div>
                        )}
                        {q.code && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Code Template</span>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                onClick={() => router.push(`/question/${q.id}?focus=code`)}
                              >
                                Open Editor &rarr;
                              </button>
                            </div>
                            <pre style={{ margin: 0, padding: '12px', backgroundColor: 'var(--btn-secondary-bg)', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'monospace', overflowX: 'auto', border: '1px solid var(--card-border)', color: 'var(--text-color)' }}>
                              <code>{q.code}</code>
                            </pre>
                          </div>
                        )}
                        {q.explanation && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Explanation / Notes</span>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                onClick={() => router.push(`/question/${q.id}?focus=notes`)}
                              >
                                Edit Notes &rarr;
                              </button>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-color)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                              {q.explanation}
                            </p>
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
      )}

      {/* Modal Dialog Overlay for Forms */}
      {activeForm && (
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
      )}

    </div>
  );
}

export default function TodoDetailPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
      <Layout searchQuery={searchQuery} setSearchQuery={setSearchQuery}>
        <TodoDetailContent />
      </Layout>
    </Suspense>
  );
}
