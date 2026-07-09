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

    const { id } = params; // topic_id

    // Check if topic exists
    const topicRes = await query('SELECT id FROM topics WHERE id = $1', [id]);
    if (topicRes.rows.length === 0) {
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }

    // Fetch questions
    const questionsRes = await query('SELECT * FROM questions WHERE topic_id = $1 ORDER BY id ASC', [id]);

    // Fetch user completion status for these questions
    const tasksRes = await query(
      "SELECT item_id, status, saved_for_later FROM user_tasks WHERE user_id = $1 AND item_type = 'question'",
      [user.id]
    );
    
    const taskMap = {};
    tasksRes.rows.forEach(t => {
      taskMap[t.item_id] = {
        status: t.status,
        saved_for_later: t.saved_for_later
      };
    });

    const enrichedQuestions = questionsRes.rows.map(q => ({
      ...q,
      status: taskMap[q.id]?.status || 'Pending',
      saved_for_later: taskMap[q.id]?.saved_for_later || false
    }));

    return NextResponse.json(enrichedQuestions);
  } catch (error) {
    console.error('GET topic questions error:', error);
    return NextResponse.json({ message: 'Failed to retrieve topic questions.' }, { status: 500 });
  }
}
