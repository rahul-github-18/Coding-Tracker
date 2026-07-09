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
    const topicId = searchParams.get('topic_id');

    if (!topicId) {
      return NextResponse.json({ message: 'topic_id is required.' }, { status: 400 });
    }

    const res = await query('SELECT * FROM code_examples WHERE topic_id = $1 ORDER BY id ASC', [topicId]);

    // Fetch user completion status for these code examples
    const tasksRes = await query(
      "SELECT item_id, status, saved_for_later FROM user_tasks WHERE user_id = $1 AND item_type = 'code_example'",
      [user.id]
    );

    const taskMap = {};
    tasksRes.rows.forEach(t => {
      taskMap[t.item_id] = {
        status: t.status,
        saved_for_later: t.saved_for_later
      };
    });

    const enrichedExamples = res.rows.map(e => ({
      ...e,
      status: taskMap[e.id]?.status || 'Pending',
      saved_for_later: taskMap[e.id]?.saved_for_later || false
    }));

    return NextResponse.json(enrichedExamples);
  } catch (error) {
    console.error('GET code examples error:', error);
    return NextResponse.json({ message: 'Failed to retrieve code examples.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { topic_id, title, language, code, explanation, notes } = await req.json();

    if (!topic_id) {
      return NextResponse.json({ message: 'topic_id is required.' }, { status: 400 });
    }
    if (!code || code.trim() === '') {
      return NextResponse.json({ message: 'Code block cannot be empty.' }, { status: 400 });
    }

    // Verify topic exists
    const topicCheck = await query('SELECT id FROM topics WHERE id = $1', [topic_id]);
    if (topicCheck.rows.length === 0) {
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }

    const insertRes = await query(
      `INSERT INTO code_examples (topic_id, title, language, code, explanation, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [topic_id, title || '', language || 'Java', code, explanation || '', notes || '']
    );

    return NextResponse.json(insertRes.rows[0], { status: 201 });
  } catch (error) {
    console.error('POST code example error:', error);
    return NextResponse.json({ message: 'Failed to create code example.' }, { status: 500 });
  }
}
