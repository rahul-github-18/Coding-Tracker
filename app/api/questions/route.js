import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { invalidateCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, approved, role, can_view, can_edit, can_delete')
    .eq('id', reqUserId)
    .maybeSingle();

  if (error || !user || !user.approved) {
    return null;
  }
  return user;
}

export async function POST(req) {
  console.time('API: POST /api/questions');
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      console.timeEnd('API: POST /api/questions');
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { topic_id, title, description, difficulty, tags, answer, code, explanation } = await req.json();

    if (!topic_id) {
      console.timeEnd('API: POST /api/questions');
      return NextResponse.json({ message: 'topic_id is required.' }, { status: 400 });
    }
    if (!title || title.trim() === '') {
      console.timeEnd('API: POST /api/questions');
      return NextResponse.json({ message: 'Question title is required.' }, { status: 400 });
    }

    // Verify topic exists (todos table)
    const { data: topic, error: topicError } = await supabase
      .from('todos')
      .select('id')
      .eq('id', topic_id)
      .maybeSingle();

    if (topicError || !topic) {
      console.timeEnd('API: POST /api/questions');
      return NextResponse.json({ message: 'Associated topic not found.' }, { status: 404 });
    }

    console.time('Supabase: Insert Question');
    const { data: newQuestion, error: insertError } = await supabase
      .from('questions')
      .insert({
        todo_id: topic_id,
        title: title.trim(),
        description: description || '',
        difficulty: difficulty || 'Beginner',
        tags: tags || '',
        answer: answer || '',
        code: code || '',
        explanation: explanation || ''
      })
      .select()
      .single();
    console.timeEnd('Supabase: Insert Question');

    if (insertError) throw insertError;

    // Invalidate Cache
    invalidateCache();

    console.timeEnd('API: POST /api/questions');
    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error) {
    console.error('POST question error:', error);
    console.timeEnd('API: POST /api/questions');
    return NextResponse.json({ message: 'Failed to create question.' }, { status: 500 });
  }
}
