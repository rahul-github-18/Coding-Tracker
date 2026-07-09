import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCachedCurriculum } from '@/lib/cache';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, approved, role, can_view')
    .eq('id', reqUserId)
    .maybeSingle();

  if (error || !user || !user.approved) {
    return null;
  }
  return user;
}

export async function GET(req) {
  console.time('API: GET /api/user/tasks');
  try {
    const user = await checkUser(req);
    if (!user) {
      console.timeEnd('API: GET /api/user/tasks');
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    // Fetch user tasks
    console.time('Supabase: Fetch user_tasks (GET tasks)');
    const { data: userTasks, error: tasksError } = await supabase
      .from('user_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('id', { ascending: false });
    console.timeEnd('Supabase: Fetch user_tasks (GET tasks)');

    if (tasksError) throw tasksError;

    if (!userTasks || userTasks.length === 0) {
      console.timeEnd('API: GET /api/user/tasks');
      return NextResponse.json([]);
    }

    // Fetch curriculum from cache
    const { todos, questions, codeExamples, notes } = await getCachedCurriculum();

    const topicsMap = {};
    todos.forEach(t => { topicsMap[t.id] = t; });
    const questionsMap = {};
    questions.forEach(q => { questionsMap[q.id] = q; });
    const examplesMap = {};
    codeExamples.forEach(e => { examplesMap[e.id] = e; });
    const notesMap = {};
    notes.forEach(n => { notesMap[n.id] = n; });

    const enrichedTasks = userTasks.map(task => {
      let itemDetails = null;
      if (task.item_type === 'topic' || task.item_type === 'todo') {
        itemDetails = topicsMap[task.item_id];
      } else if (task.item_type === 'question') {
        itemDetails = questionsMap[task.item_id];
      } else if (task.item_type === 'code_example') {
        itemDetails = examplesMap[task.item_id];
      } else if (task.item_type === 'note') {
        itemDetails = notesMap[task.item_id];
      }

      const addedDateStr = task.added_date ? new Date(task.added_date).toISOString().split('T')[0] : '';

      return {
        ...task,
        added_date: addedDateStr,
        details: itemDetails || { title: 'Unknown Item (Deleted)' }
      };
    });

    console.timeEnd('API: GET /api/user/tasks');
    return NextResponse.json(enrichedTasks);
  } catch (error) {
    console.error('GET user tasks error:', error);
    console.timeEnd('API: GET /api/user/tasks');
    return NextResponse.json({ message: 'Failed to retrieve tasks.' }, { status: 500 });
  }
}

export async function POST(req) {
  console.time('API: POST /api/user/tasks');
  try {
    const user = await checkUser(req);
    if (!user) {
      console.timeEnd('API: POST /api/user/tasks');
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { itemType, itemId, status, savedForLater } = await req.json();

    if (!itemType || !itemId) {
      console.timeEnd('API: POST /api/user/tasks');
      return NextResponse.json({ message: 'itemType and itemId are required.' }, { status: 400 });
    }

    console.time('Supabase: Upsert user_tasks');
    const { data: task, error: upsertError } = await supabase
      .from('user_tasks')
      .upsert({
        user_id: user.id,
        item_type: itemType,
        item_id: itemId,
        status: status || 'Pending',
        saved_for_later: savedForLater !== undefined ? savedForLater : false
      }, { onConflict: 'user_id,item_type,item_id' })
      .select()
      .single();
    console.timeEnd('Supabase: Upsert user_tasks');

    if (upsertError) throw upsertError;

    console.timeEnd('API: POST /api/user/tasks');
    return NextResponse.json(task);
  } catch (error) {
    console.error('POST user task error:', error);
    console.timeEnd('API: POST /api/user/tasks');
    return NextResponse.json({ message: 'Failed to save task.' }, { status: 500 });
  }
}
