import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

import { getCachedUser } from '@/lib/cache';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const user = await getCachedUser(reqUserId);
  if (!user || !user.approved) {
    return null;
  }
  return user;
}

export async function GET(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_view) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { id } = params; // topic_id

    // Check if topic exists (todos table)
    const { data: topic, error: topicError } = await supabase
      .from('todos')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (topicError || !topic) {
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }

    // Fetch questions (questions table has todo_id column)
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('*')
      .eq('todo_id', id)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (qError) throw qError;

    // Fetch user completion status for these questions
    const { data: tasks, error: tasksError } = await supabase
      .from('user_tasks')
      .select('item_id, status, saved_for_later')
      .eq('user_id', user.id)
      .eq('item_type', 'question');

    if (tasksError) throw tasksError;
    
    const taskMap = {};
    tasks.forEach(t => {
      taskMap[t.item_id] = {
        status: t.status,
        saved_for_later: t.saved_for_later
      };
    });

    const enrichedQuestions = (questions || []).map(q => ({
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
