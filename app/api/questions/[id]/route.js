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

export async function GET(req, { params }) {
  const { id } = params;
  const timerLabel = `API: GET /api/questions/${id}`;
  console.time(timerLabel);
  try {
    const user = await checkUser(req);
    if (!user || !user.can_view) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    console.time('Supabase: Fetch Question (GET detail)');
    const { data: question, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    console.timeEnd('Supabase: Fetch Question (GET detail)');

    if (error || !question) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    console.timeEnd(timerLabel);
    return NextResponse.json(question);
  } catch (error) {
    console.error('GET question detail error:', error);
    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'Failed to retrieve question details.' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const { id } = params;
  const timerLabel = `API: PUT /api/questions/${id}`;
  console.time(timerLabel);
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { title, description, difficulty, tags, answer, code, explanation, notes } = await req.json();

    console.time('Supabase: Fetch Question (PUT)');
    const { data: question, error: fetchError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    console.timeEnd('Supabase: Fetch Question (PUT)');

    if (fetchError || !question) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    const newTitle = title !== undefined ? title.trim() : question.title;
    const newDescription = description !== undefined ? description : question.description;
    const newDifficulty = difficulty !== undefined ? difficulty : question.difficulty;
    const newTags = tags !== undefined ? tags : question.tags;
    const newAnswer = answer !== undefined ? answer : question.answer;
    const newCode = code !== undefined ? code : question.code;
    const newExplanation = explanation !== undefined ? explanation : question.explanation;
    const newNotes = notes !== undefined ? notes : question.notes;

    if (newTitle === '') {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Title cannot be empty.' }, { status: 400 });
    }

    console.time('Supabase: Update Question');
    const { data: updatedQuestion, error: updateError } = await supabase
      .from('questions')
      .update({
        title: newTitle,
        description: newDescription,
        difficulty: newDifficulty,
        tags: newTags,
        answer: newAnswer,
        code: newCode,
        explanation: newExplanation,
        notes: newNotes
      })
      .eq('id', id)
      .select()
      .single();
    console.timeEnd('Supabase: Update Question');

    if (updateError) throw updateError;

    // Invalidate Cache
    invalidateCache();

    console.timeEnd(timerLabel);
    return NextResponse.json(updatedQuestion);
  } catch (error) {
    console.error('PUT question error:', error);
    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'Failed to update question.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = params;
  const timerLabel = `API: DELETE /api/questions/${id}`;
  console.time(timerLabel);
  try {
    const user = await checkUser(req);
    if (!user || !user.can_delete) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Access Denied. You do not have permission to delete content.' }, { status: 403 });
    }

    console.time('Supabase: Delete Question');
    const { data: deletedQuestion, error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    console.timeEnd('Supabase: Delete Question');

    if (error || !deletedQuestion) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    // Invalidate Cache
    invalidateCache();

    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'Question deleted successfully.' });
  } catch (error) {
    console.error('DELETE question error:', error);
    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'Failed to delete question.' }, { status: 500 });
  }
}
