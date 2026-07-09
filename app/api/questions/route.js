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

export async function POST(req) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { topic_id, title, description, difficulty, tags, answer, code, explanation } = await req.json();

    if (!topic_id) {
      return NextResponse.json({ message: 'topic_id is required.' }, { status: 400 });
    }
    if (!title || title.trim() === '') {
      return NextResponse.json({ message: 'Question title is required.' }, { status: 400 });
    }

    // Verify topic exists
    const topicCheck = await query('SELECT id FROM topics WHERE id = $1', [topic_id]);
    if (topicCheck.rows.length === 0) {
      return NextResponse.json({ message: 'Associated topic not found.' }, { status: 404 });
    }

    const insertRes = await query(
      `INSERT INTO questions (topic_id, title, description, difficulty, tags, answer, code, explanation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        topic_id,
        title.trim(),
        description || '',
        difficulty || 'Beginner',
        tags || '',
        answer || '',
        code || '',
        explanation || ''
      ]
    );

    return NextResponse.json(insertRes.rows[0], { status: 201 });
  } catch (error) {
    console.error('POST question error:', error);
    return NextResponse.json({ message: 'Failed to create question.' }, { status: 500 });
  }
}
