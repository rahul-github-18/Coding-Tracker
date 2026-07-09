import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const userCheck = await query('SELECT id, approved, role, can_view, can_edit, can_delete FROM users WHERE id = $1', [reqUserId]);
  if (userCheck.rows.length === 0 || !userCheck.rows[0].approved) {
    return null;
  }
  return userCheck.rows[0];
}

export async function GET(req) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_view) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const difficulty = searchParams.get('difficulty') || '';
    const category = searchParams.get('category') || '';

    // Build query
    let sql = 'SELECT * FROM topics WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (title ILIKE $${paramIndex} OR category ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (difficulty) {
      sql += ` AND difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }

    if (category) {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    sql += ' ORDER BY id DESC';

    const topicsRes = await query(sql, params);
    const topics = topicsRes.rows;

    // Fetch all user completed tasks for progress calculation
    const tasksRes = await query(
      "SELECT item_type, item_id, status FROM user_tasks WHERE user_id = $1 AND status = 'Completed'",
      [user.id]
    );
    const completedTasks = tasksRes.rows;

    // Fetch questions, code examples, notes counts grouped by topic_id to compute progress
    const questionsRes = await query("SELECT topic_id, COUNT(id) as count FROM questions GROUP BY topic_id");
    const examplesRes = await query("SELECT topic_id, COUNT(id) as count FROM code_examples GROUP BY topic_id");
    const notesRes = await query("SELECT topic_id, COUNT(id) as count FROM notes GROUP BY topic_id");

    const questionsCountMap = {};
    questionsRes.rows.forEach(r => { questionsCountMap[r.topic_id] = parseInt(r.count, 10); });
    const examplesCountMap = {};
    examplesRes.rows.forEach(r => { examplesCountMap[r.topic_id] = parseInt(r.count, 10); });
    const notesCountMap = {};
    notesRes.rows.forEach(r => { notesCountMap[r.topic_id] = parseInt(r.count, 10); });

    // Fetch user-completed items counts per topic
    // First, let's list all items per topic
    const allQuestions = await query("SELECT id, topic_id FROM questions");
    const allExamples = await query("SELECT id, topic_id FROM code_examples");
    const allNotes = await query("SELECT id, topic_id FROM notes");

    const topicQuestionsMap = {};
    allQuestions.rows.forEach(q => {
      if (!topicQuestionsMap[q.topic_id]) topicQuestionsMap[q.topic_id] = [];
      topicQuestionsMap[q.topic_id].push(q.id);
    });
    const topicExamplesMap = {};
    allExamples.rows.forEach(e => {
      if (!topicExamplesMap[e.topic_id]) topicExamplesMap[e.topic_id] = [];
      topicExamplesMap[e.topic_id].push(e.id);
    });
    const topicNotesMap = {};
    allNotes.rows.forEach(n => {
      if (!topicNotesMap[n.topic_id]) topicNotesMap[n.topic_id] = [];
      topicNotesMap[n.topic_id].push(n.id);
    });

    const completedQuestionIds = new Set(completedTasks.filter(t => t.item_type === 'question').map(t => t.item_id));
    const completedExampleIds = new Set(completedTasks.filter(t => t.item_type === 'code_example').map(t => t.item_id));
    const completedNoteIds = new Set(completedTasks.filter(t => t.item_type === 'note').map(t => t.item_id));
    const completedTopicIds = new Set(completedTasks.filter(t => t.item_type === 'topic').map(t => t.item_id));

    // Enhance topics with progress
    const enhancedTopics = topics.map(topic => {
      const qTotal = questionsCountMap[topic.id] || 0;
      const eTotal = examplesCountMap[topic.id] || 0;
      const nTotal = notesCountMap[topic.id] || 0;
      const totalItems = qTotal + eTotal + nTotal;

      let completedItems = 0;
      if (topicQuestionsMap[topic.id]) {
        topicQuestionsMap[topic.id].forEach(qId => {
          if (completedQuestionIds.has(qId)) completedItems++;
        });
      }
      if (topicExamplesMap[topic.id]) {
        topicExamplesMap[topic.id].forEach(eId => {
          if (completedExampleIds.has(eId)) completedItems++;
        });
      }
      if (topicNotesMap[topic.id]) {
        topicNotesMap[topic.id].forEach(nId => {
          if (completedNoteIds.has(nId)) completedItems++;
        });
      }

      const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      return {
        ...topic,
        total_questions: qTotal,
        total_examples: eTotal,
        total_notes: nTotal,
        completed_items: completedItems,
        total_items: totalItems,
        progress_percentage: percentage,
        completed: completedTopicIds.has(topic.id) || (totalItems > 0 && completedItems === totalItems)
      };
    });

    return NextResponse.json(enhancedTopics);
  } catch (error) {
    console.error('GET topics error:', error);
    return NextResponse.json({ message: 'Failed to retrieve topics.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { title, category, difficulty, estimatedTime } = await req.json();

    if (!title || title.trim() === '') {
      return NextResponse.json({ message: 'Topic title is required.' }, { status: 400 });
    }

    const insertRes = await query(
      `INSERT INTO topics (title, category, difficulty, estimated_time)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title.trim(), category || 'General', difficulty || 'Beginner', estimatedTime || '1 hour']
    );

    return NextResponse.json(insertRes.rows[0], { status: 201 });
  } catch (error) {
    console.error('POST topic error:', error);
    return NextResponse.json({ message: 'Failed to create topic.' }, { status: 500 });
  }
}
