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
  const timerLabel = `API: PUT /api/notes/${id}`;
  console.time(timerLabel);
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { title, content } = await req.json();

    console.time('Supabase: Fetch Note (PUT)');
    const { data: note, error: fetchError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    console.timeEnd('Supabase: Fetch Note (PUT)');

    if (fetchError || !note) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Note not found.' }, { status: 404 });
    }

    const newTitle = title !== undefined ? title.trim() : note.title;
    const newContent = content !== undefined ? content : note.content;

    if (newTitle === '') {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Title cannot be empty.' }, { status: 400 });
    }
    if (newContent === '') {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Content cannot be empty.' }, { status: 400 });
    }

    console.time('Supabase: Update Note');
    const { data: updatedNote, error: updateError } = await supabase
      .from('notes')
      .update({
        title: newTitle,
        content: newContent
      })
      .eq('id', id)
      .select()
      .single();
    console.timeEnd('Supabase: Update Note');

    if (updateError) throw updateError;

    // Invalidate Cache
    invalidateCache();

    console.timeEnd(timerLabel);
    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('PUT note error:', error);
    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'Failed to update note.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = params;
  const timerLabel = `API: DELETE /api/notes/${id}`;
  console.time(timerLabel);
  try {
    const user = await checkUser(req);
    if (!user || !user.can_delete) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Access Denied. You do not have permission to delete content.' }, { status: 403 });
    }

    console.time('Supabase: Delete Note');
    const { data: deletedNote, error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    console.timeEnd('Supabase: Delete Note');

    if (error || !deletedNote) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Note not found.' }, { status: 404 });
    }

    // Invalidate Cache
    invalidateCache();

    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'Note deleted successfully.' });
  } catch (error) {
    console.error('DELETE note error:', error);
    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'Failed to delete note.' }, { status: 500 });
  }
}
