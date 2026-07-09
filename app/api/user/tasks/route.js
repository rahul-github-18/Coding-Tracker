import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const userCheck = await query('SELECT id, approved, role, can_view FROM users WHERE id = $1', [reqUserId]);
  if (userCheck.rows.length === 0 || !userCheck.rows[0].approved) {
    return null;
  }
  return userCheck.rows[0];
}

export async function GET(req) {
  try {
    const user = await checkUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    // Fetch user tasks
    const tasksRes = await query('SELECT * FROM user_tasks WHERE user_id = $1 ORDER BY id DESC', [user.id]);
    const userTasks = tasksRes.rows;

    if (userTasks.length === 0) {
      return NextResponse.json([]);
    }

    // Resolve detailed information in parallel for topics, questions, code examples, notes
    const [topicsRes, questionsRes, examplesRes, notesRes] = await Promise.all([
      query('SELECT id, title, category, difficulty, estimated_time FROM topics'),
      query('SELECT id, title, topic_id, difficulty FROM questions'),
      query('SELECT id, title, topic_id, language FROM code_examples'),
      query('SELECT id, title, topic_id FROM notes')
    ]);

    const topicsMap = {};
    topicsRes.rows.forEach(t => { topicsMap[t.id] = t; });
    const questionsMap = {};
    questionsRes.rows.forEach(q => { questionsMap[q.id] = q; });
    const examplesMap = {};
    examplesRes.rows.forEach(e => { examplesMap[e.id] = e; });
    const notesMap = {};
    notesRes.rows.forEach(n => { notesMap[n.id] = n; });

    const enrichedTasks = userTasks.map(task => {
      let itemDetails = null;
      if (task.item_type === 'topic') {
        itemDetails = topicsMap[task.item_id];
      } else if (task.item_type === 'question') {
        itemDetails = questionsMap[task.item_id];
      } else if (task.item_type === 'code_example') {
        itemDetails = examplesMap[task.item_id];
      } else if (task.item_type === 'note') {
        itemDetails = notesMap[task.item_id];
      }

      // Format added_date to string
      const addedDateStr = task.added_date ? new Date(task.added_date).toISOString().split('T')[0] : '';

      return {
        ...task,
        added_date: addedDateStr,
        details: itemDetails || { title: 'Unknown Item (Deleted)' }
      };
    });

    return NextResponse.json(enrichedTasks);
  } catch (error) {
    console.error('GET user tasks error:', error);
    return NextResponse.json({ message: 'Failed to retrieve tasks.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await checkUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { itemType, itemId, status, savedForLater } = await req.json();

    if (!itemType || !itemId) {
      return NextResponse.json({ message: 'itemType and itemId are required.' }, { status: 400 });
    }

    // Insert task or update status / saved state if it already exists
    const upsertRes = await query(
      `INSERT INTO user_tasks (user_id, item_type, item_id, status, saved_for_later, added_date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
       ON CONFLICT (user_id, item_type, item_id)
       DO UPDATE SET 
         status = COALESCE($4, user_tasks.status),
         saved_for_later = COALESCE($5, user_tasks.saved_for_later)
       RETURNING *`,
      [
        user.id,
        itemType,
        itemId,
        status || 'Pending',
        savedForLater !== undefined ? savedForLater : false
      ]
    );

    return NextResponse.json(upsertRes.rows[0]);
  } catch (error) {
    console.error('POST user task error:', error);
    return NextResponse.json({ message: 'Failed to save task.' }, { status: 500 });
  }
}
