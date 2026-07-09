import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { invalidateCache } from '@/lib/cache';

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
  console.time('API: GET /api/notes');
  try {
    const user = await checkUser(req);
    if (!user || !user.can_view) {
      console.timeEnd('API: GET /api/notes');
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topic_id');

    if (!topicId) {
      console.timeEnd('API: GET /api/notes');
      return NextResponse.json({ message: 'topic_id is required.' }, { status: 400 });
    }

    console.time('Supabase: Fetch Notes');
    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('topic_id', topicId)
      .order('id', { ascending: true });
    console.timeEnd('Supabase: Fetch Notes');

    if (error) throw error;

    // Fetch user completion status for these notes
    console.time('Supabase: Fetch user_tasks (GET notes)');
    const { data: tasks, error: tasksError } = await supabase
      .from('user_tasks')
      .select('item_id, status, saved_for_later')
      .eq('user_id', user.id)
      .eq('item_type', 'note');
    console.timeEnd('Supabase: Fetch user_tasks (GET notes)');

    if (tasksError) throw tasksError;

    const taskMap = {};
    tasks.forEach(t => {
      taskMap[t.item_id] = {
        status: t.status,
        saved_for_later: t.saved_for_later
      };
    });

    const enrichedNotes = (notes || []).map(n => ({
      ...n,
      status: taskMap[n.id]?.status || 'Pending',
      saved_for_later: taskMap[n.id]?.saved_for_later || false
    }));

    console.timeEnd('API: GET /api/notes');
    return NextResponse.json(enrichedNotes);
  } catch (error) {
    console.error('GET notes error:', error);
    console.timeEnd('API: GET /api/notes');
    return NextResponse.json({ message: 'Failed to retrieve notes.' }, { status: 500 });
  }
}

export async function POST(req) {
  console.time('API: POST /api/notes');
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      console.timeEnd('API: POST /api/notes');
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { topic_id, title, content } = await req.json();

    if (!topic_id) {
      console.timeEnd('API: POST /api/notes');
      return NextResponse.json({ message: 'topic_id is required.' }, { status: 400 });
    }
    if (!title || title.trim() === '') {
      console.timeEnd('API: POST /api/notes');
      return NextResponse.json({ message: 'Note title is required.' }, { status: 400 });
    }
    if (!content || content.trim() === '') {
      console.timeEnd('API: POST /api/notes');
      return NextResponse.json({ message: 'Note content cannot be empty.' }, { status: 400 });
    }

    // Verify topic exists (todos table)
    const { data: topic, error: topicError } = await supabase
      .from('todos')
      .select('id')
      .eq('id', topic_id)
      .maybeSingle();

    if (topicError || !topic) {
      console.timeEnd('API: POST /api/notes');
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }

    console.time('Supabase: Insert Note');
    const { data: newNote, error: insertError } = await supabase
      .from('notes')
      .insert({
        topic_id: topic_id,
        title: title.trim(),
        content: content
      })
      .select()
      .single();
    console.timeEnd('Supabase: Insert Note');

    if (insertError) throw insertError;

    // Invalidate Cache
    invalidateCache();

    console.timeEnd('API: POST /api/notes');
    return NextResponse.json(newNote, { status: 201 });
  } catch (error) {
    console.error('POST note error:', error);
    console.timeEnd('API: POST /api/notes');
    return NextResponse.json({ message: 'Failed to create note.' }, { status: 500 });
  }
}
