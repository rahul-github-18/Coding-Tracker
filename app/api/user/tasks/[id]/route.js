import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, approved, role, streak, last_activity_date')
    .eq('id', reqUserId)
    .maybeSingle();

  if (error || !user) {
    return null;
  }
  return user;
}

export async function PUT(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    if (!user.approved && user.role !== 'admin') {
      return NextResponse.json({ message: 'Your account is pending admin approval. You cannot edit tasks.' }, { status: 403 });
    }

    const { id } = params;
    const { status, saved_for_later } = await req.json();

    // Fetch existing task
    const { data: task, error: fetchError } = await supabase
      .from('user_tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError || !task) {
      return NextResponse.json({ message: 'Task not found.' }, { status: 404 });
    }

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
      const localToday = new Date(today.getTime() - (offset * 60 * 1000));
      const todayStr = localToday.toISOString().split('T')[0];

      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000 - (offset * 60 * 1000));
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
    const { data: updatedTask, error: updateError } = await supabase
      .from('user_tasks')
      .update({
        status: newStatus,
        saved_for_later: newSavedForLater,
        completed_at: completedAt
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update user streak if it changed
    if (streakUpdated) {
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          streak: newStreak,
          last_activity_date: newLastActivityDate
        })
        .eq('id', user.id);

      if (userUpdateError) throw userUpdateError;
    }

    return NextResponse.json(updatedTask);
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

    if (!user.approved && user.role !== 'admin') {
      return NextResponse.json({ message: 'Your account is pending admin approval. You cannot delete tasks.' }, { status: 403 });
    }

    const { id } = params;
    const { data: deletedTask, error } = await supabase
      .from('user_tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error || !deletedTask) {
      return NextResponse.json({ message: 'Task not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Task removed successfully.' });
  } catch (error) {
    console.error('DELETE user task error:', error);
    return NextResponse.json({ message: 'Failed to delete task.' }, { status: 500 });
  }
}
