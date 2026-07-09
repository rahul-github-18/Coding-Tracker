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

export async function PUT(req, { params }) {
  const { id } = params;
  const timerLabel = `API: PUT /api/code-examples/${id}`;
  console.time(timerLabel);
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { title, language, code, explanation, notes } = await req.json();

    console.time('Supabase: Fetch Example (PUT)');
    const { data: example, error: fetchError } = await supabase
      .from('code_examples')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    console.timeEnd('Supabase: Fetch Example (PUT)');

    if (fetchError || !example) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Code example not found.' }, { status: 404 });
    }

    const newTitle = title !== undefined ? title : example.title;
    const newLanguage = language !== undefined ? language : example.language;
    const newCode = code !== undefined ? code : example.code;
    const newExplanation = explanation !== undefined ? explanation : example.explanation;
    const newNotes = notes !== undefined ? notes : example.notes;

    if (!newCode || newCode.trim() === '') {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Code block cannot be empty.' }, { status: 400 });
    }

    console.time('Supabase: Update Code Example');
    const { data: updatedExample, error: updateError } = await supabase
      .from('code_examples')
      .update({
        title: newTitle,
        language: newLanguage,
        code: newCode,
        explanation: newExplanation,
        notes: newNotes
      })
      .eq('id', id)
      .select()
      .single();
    console.timeEnd('Supabase: Update Code Example');

    if (updateError) throw updateError;

    // Invalidate Cache
    invalidateCache();

    console.timeEnd(timerLabel);
    return NextResponse.json(updatedExample);
  } catch (error) {
    console.error('PUT code example error:', error);
    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'Failed to update code example.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = params;
  const timerLabel = `API: DELETE /api/code-examples/${id}`;
  console.time(timerLabel);
  try {
    const user = await checkUser(req);
    if (!user || !user.can_delete) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Access Denied. You do not have permission to delete content.' }, { status: 403 });
    }

    console.time('Supabase: Delete Code Example');
    const { data: deletedExample, error } = await supabase
      .from('code_examples')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    console.timeEnd('Supabase: Delete Code Example');

    if (error || !deletedExample) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Code example not found.' }, { status: 404 });
    }

    // Invalidate Cache
    invalidateCache();

    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'Code example deleted successfully.' });
  } catch (error) {
    console.error('DELETE code example error:', error);
    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'Failed to delete code example.' }, { status: 500 });
  }
}
