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

export async function GET(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_view) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { id } = params;

    // Fetch topic
    const topicRes = await query('SELECT * FROM topics WHERE id = $1', [id]);
    if (topicRes.rows.length === 0) {
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }
    const topic = topicRes.rows[0];

    // Fetch associated questions, code examples, and notes
    const questionsRes = await query('SELECT * FROM questions WHERE topic_id = $1 ORDER BY id ASC', [id]);
    const examplesRes = await query('SELECT * FROM code_examples WHERE topic_id = $1 ORDER BY id ASC', [id]);
    const notesRes = await query('SELECT * FROM notes WHERE topic_id = $1 ORDER BY id ASC', [id]);

    // Fetch user completion tasks for these items
    const tasksRes = await query(
      "SELECT item_type, item_id, status, saved_for_later FROM user_tasks WHERE user_id = $1",
      [user.id]
    );
    const userTasks = tasksRes.rows;
    
    // Create maps for quick lookup of item status/saved state
    const taskMap = {};
    userTasks.forEach(t => {
      taskMap[`${t.item_type}_${t.item_id}`] = {
        status: t.status,
        saved_for_later: t.saved_for_later
      };
    });

    const questionsWithStatus = questionsRes.rows.map(q => ({
      ...q,
      status: taskMap[`question_${q.id}`]?.status || 'Pending',
      saved_for_later: taskMap[`question_${q.id}`]?.saved_for_later || false
    }));

    const examplesWithStatus = examplesRes.rows.map(e => ({
      ...e,
      status: taskMap[`code_example_${e.id}`]?.status || 'Pending',
      saved_for_later: taskMap[`code_example_${e.id}`]?.saved_for_later || false
    }));

    const notesWithStatus = notesRes.rows.map(n => ({
      ...n,
      status: taskMap[`note_${n.id}`]?.status || 'Pending',
      saved_for_later: taskMap[`note_${n.id}`]?.saved_for_later || false
    }));

    const isTopicCompleted = taskMap[`topic_${topic.id}`]?.status === 'Completed';
    const isTopicSaved = taskMap[`topic_${topic.id}`]?.saved_for_later || false;

    return NextResponse.json({
      ...topic,
      completed: isTopicCompleted,
      saved_for_later: isTopicSaved,
      questions: questionsWithStatus,
      codeExamples: examplesWithStatus,
      notes: notesWithStatus
    });
  } catch (error) {
    console.error('GET topic detail error:', error);
    return NextResponse.json({ message: 'Failed to retrieve topic details.' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { id } = params;
    const { title, category, difficulty, estimatedTime } = await req.json();

    const topicCheck = await query('SELECT * FROM topics WHERE id = $1', [id]);
    if (topicCheck.rows.length === 0) {
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }
    const topic = topicCheck.rows[0];

    const newTitle = title !== undefined ? title.trim() : topic.title;
    const newCategory = category !== undefined ? category : topic.category;
    const newDifficulty = difficulty !== undefined ? difficulty : topic.difficulty;
    const newEstimatedTime = estimatedTime !== undefined ? estimatedTime : topic.estimated_time;

    if (newTitle === '') {
      return NextResponse.json({ message: 'Title cannot be empty.' }, { status: 400 });
    }

    const updateRes = await query(
      `UPDATE topics 
       SET title = $1, category = $2, difficulty = $3, estimated_time = $4
       WHERE id = $5
       RETURNING *`,
      [newTitle, newCategory, newDifficulty, newEstimatedTime, id]
    );

    return NextResponse.json(updateRes.rows[0]);
  } catch (error) {
    console.error('PUT topic error:', error);
    return NextResponse.json({ message: 'Failed to update topic.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_delete) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to delete content.' }, { status: 403 });
    }

    const { id } = params;
    const deleteRes = await query('DELETE FROM topics WHERE id = $1 RETURNING id', [id]);

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Topic deleted successfully.' });
  } catch (error) {
    console.error('DELETE topic error:', error);
    return NextResponse.json({ message: 'Failed to delete topic.' }, { status: 500 });
  }
}
