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
  console.time('API: GET /api/code-examples');
  try {
    const user = await checkUser(req);
    if (!user || !user.can_view) {
      console.timeEnd('API: GET /api/code-examples');
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get('topic_id');

    if (!topicId) {
      console.timeEnd('API: GET /api/code-examples');
      return NextResponse.json({ message: 'topic_id is required.' }, { status: 400 });
    }

    console.time('Supabase: Fetch Code Examples');
    const { data: examples, error } = await supabase
      .from('code_examples')
      .select('*')
      .eq('topic_id', topicId)
      .order('id', { ascending: true });
    console.timeEnd('Supabase: Fetch Code Examples');

    if (error) throw error;

    // Fetch user completion status for these code examples
    console.time('Supabase: Fetch user_tasks (GET examples)');
    const { data: tasks, error: tasksError } = await supabase
      .from('user_tasks')
      .select('item_id, status, saved_for_later')
      .eq('user_id', user.id)
      .eq('item_type', 'code_example');
    console.timeEnd('Supabase: Fetch user_tasks (GET examples)');

    if (tasksError) throw tasksError;

    const taskMap = {};
    tasks.forEach(t => {
      taskMap[t.item_id] = {
        status: t.status,
        saved_for_later: t.saved_for_later
      };
    });

    const enrichedExamples = (examples || []).map(e => ({
      ...e,
      status: taskMap[e.id]?.status || 'Pending',
      saved_for_later: taskMap[e.id]?.saved_for_later || false
    }));

    console.timeEnd('API: GET /api/code-examples');
    return NextResponse.json(enrichedExamples);
  } catch (error) {
    console.error('GET code examples error:', error);
    console.timeEnd('API: GET /api/code-examples');
    return NextResponse.json({ message: 'Failed to retrieve code examples.' }, { status: 500 });
  }
}

export async function POST(req) {
  console.time('API: POST /api/code-examples');
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      console.timeEnd('API: POST /api/code-examples');
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { topic_id, title, language, code, explanation, notes } = await req.json();

    if (!topic_id) {
      console.timeEnd('API: POST /api/code-examples');
      return NextResponse.json({ message: 'topic_id is required.' }, { status: 400 });
    }
    if (!code || code.trim() === '') {
      console.timeEnd('API: POST /api/code-examples');
      return NextResponse.json({ message: 'Code block cannot be empty.' }, { status: 400 });
    }

    // Verify topic exists (todos table)
    const { data: topic, error: topicError } = await supabase
      .from('todos')
      .select('id')
      .eq('id', topic_id)
      .maybeSingle();

    if (topicError || !topic) {
      console.timeEnd('API: POST /api/code-examples');
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }

    console.time('Supabase: Insert Code Example');
    const { data: newExample, error: insertError } = await supabase
      .from('code_examples')
      .insert({
        topic_id: topic_id,
        title: title || '',
        language: language || 'Java',
        code: code,
        explanation: explanation || '',
        notes: notes || ''
      })
      .select()
      .single();
    console.timeEnd('Supabase: Insert Code Example');

    if (insertError) throw insertError;

    // Invalidate Cache
    invalidateCache();

    console.timeEnd('API: POST /api/code-examples');
    return NextResponse.json(newExample, { status: 201 });
  } catch (error) {
    console.error('POST code example error:', error);
    console.timeEnd('API: POST /api/code-examples');
    return NextResponse.json({ message: 'Failed to create code example.' }, { status: 500 });
  }
}
