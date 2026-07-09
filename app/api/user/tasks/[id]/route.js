import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const userCheck = await query('SELECT id, approved, role, streak, last_activity_date FROM users WHERE id = $1', [reqUserId]);
  if (userCheck.rows.length === 0 || !userCheck.rows[0].approved) {
    return null;
  }
  return userCheck.rows[0];
}

export async function PUT(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { id } = params;
    const { status, saved_for_later } = await req.json();

    // Fetch existing task
    const checkRes = await query('SELECT * FROM user_tasks WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ message: 'Task not found.' }, { status: 404 });
    }
    const task = checkRes.rows[0];

    const newStatus = status !== undefined ? status : task.status;
    const newSavedForLater = saved_for_later !== undefined ? saved_for_later : task.saved_for_later;

    let completedAt = task.completed_at;
    let streakUpdated = false;
    let newStreak = user.streak;
    let newLastActivityDate = user.last_activity_date;

    // Handle transition to Completed
    if (newStatus === 'Completed' && task.status !== 'Completed') {
      completedAt = new Date().toISOString();
      streakUpdated = true;

      const today = new Date();
      // Format to YYYY-MM-DD
      const offset = today.getTimezoneOffset();
      const localToday = new Date(today.getTime() - (offset*60*1000));
      const todayStr = localToday.toISOString().split('T')[0];

      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000 - (offset*60*1000));
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let dbLastActivityStr = null;
      if (user.last_activity_date) {
        dbLastActivityStr = new Date(user.last_activity_date).toISOString().split('T')[0];
      }

      if (!dbLastActivityStr) {
        newStreak = 1;
        newLastActivityDate = todayStr;
      } else if (dbLastActivityStr === todayStr) {
        // Already did something today, streak stays same
        newLastActivityDate = todayStr;
      } else if (dbLastActivityStr === yesterdayStr) {
        // Consecutive day activity!
        newStreak = user.streak + 1;
        newLastActivityDate = todayStr;
      } else {
        // Broke streak, reset to 1
        newStreak = 1;
        newLastActivityDate = todayStr;
      }
    } else if (newStatus !== 'Completed') {
      completedAt = null;
    }

    // Update user_tasks
    const updateTaskRes = await query(
      `UPDATE user_tasks 
       SET status = $1, saved_for_later = $2, completed_at = $3
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [newStatus, newSavedForLater, completedAt, id, user.id]
    );

    // Update user streak if it changed
    if (streakUpdated) {
      await query(
        'UPDATE users SET streak = $1, last_activity_date = $2 WHERE id = $3',
        [newStreak, newLastActivityDate, user.id]
      );
    }

    return NextResponse.json(updateTaskRes.rows[0]);
  } catch (error) {
    console.error('PUT user task error:', error);
    return NextResponse.json({ message: 'Failed to update task.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { id } = params;
    const deleteRes = await query('DELETE FROM user_tasks WHERE id = $1 AND user_id = $2 RETURNING id', [id, user.id]);

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ message: 'Task not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Task removed successfully.' });
  } catch (error) {
    console.error('DELETE user task error:', error);
    return NextResponse.json({ message: 'Failed to delete task.' }, { status: 500 });
  }
}
