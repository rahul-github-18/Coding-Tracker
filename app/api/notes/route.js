import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { invalidateCache, getCachedUser } from '@/lib/cache';

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

    if (!topicId && user.role !== 'admin') {
      console.timeEnd('API: GET /api/notes');
      return NextResponse.json({ message: 'Access Denied. Standalone notes are admin-only.' }, { status: 403 });
    }

    console.time('Supabase: Fetch Notes');
    let dbQuery = supabase.from('notes').select('*');
    if (topicId) {
      dbQuery = dbQuery.eq('topic_id', topicId);
    } else {
      dbQuery = dbQuery.is('topic_id', null);
    }
    const { data: notes, error } = await dbQuery.order('id', { ascending: true });
    console.timeEnd('Supabase: Fetch Notes');

    if (error) throw error;

    let enrichedNotes = notes || [];
    if (topicId) {
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

      enrichedNotes = (notes || []).map(n => ({
        ...n,
        status: taskMap[n.id]?.status || 'Pending',
        saved_for_later: taskMap[n.id]?.saved_for_later || false
      }));
    }

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
    if (!user || (user.role !== 'admin' && !user.can_edit)) {
      console.timeEnd('API: POST /api/notes');
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { topic_id, title, content } = await req.json();

    if (!topic_id && user.role !== 'admin') {
      console.timeEnd('API: POST /api/notes');
      return NextResponse.json({ message: 'Access Denied. Standalone notes are admin-only.' }, { status: 403 });
    }
    if (!title || title.trim() === '') {
      console.timeEnd('API: POST /api/notes');
      return NextResponse.json({ message: 'Note title is required.' }, { status: 400 });
    }
    if (!content || content.trim() === '') {
      console.timeEnd('API: POST /api/notes');
      return NextResponse.json({ message: 'Note content cannot be empty.' }, { status: 400 });
    }

    // Verify topic exists (todos table) if topic_id is provided
    if (topic_id) {
      const { data: topic, error: topicError } = await supabase
        .from('todos')
        .select('id')
        .eq('id', topic_id)
        .maybeSingle();

      if (topicError || !topic) {
        console.timeEnd('API: POST /api/notes');
        return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
      }
    }

    console.time('Supabase: Insert Note');
    const { data: newNote, error: insertError } = await supabase
      .from('notes')
      .insert({
        topic_id: topic_id || null,
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
