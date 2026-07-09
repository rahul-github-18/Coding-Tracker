import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { id: todoId } = params;

  try {
    // Verify todo exists first
    const { data: todo, error: todoError } = await supabase
      .from('todos')
      .select('id')
      .eq('id', todoId)
      .maybeSingle();

    if (todoError) throw todoError;
    if (!todo) {
      return NextResponse.json({ message: 'Todo item not found.' }, { status: 404 });
    }

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('todo_id', todoId)
      .order('id', { ascending: true });

    if (questionsError) throw questionsError;

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ message: 'Failed to retrieve questions for this todo.' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const { id: todoId } = params;

  try {
    const { title, notes, code } = await req.json();

    if (!title || title.trim() === '') {
      return NextResponse.json({ message: 'Question title is required.' }, { status: 400 });
    }

    // Verify todo exists
    const { data: todo, error: todoError } = await supabase
      .from('todos')
      .select('id')
      .eq('id', todoId)
      .maybeSingle();

    if (todoError) throw todoError;
    if (!todo) {
      return NextResponse.json({ message: 'Todo item not found.' }, { status: 404 });
    }

    const { data: newQuestion, error: insertError } = await supabase
      .from('questions')
      .insert({
        todo_id: todoId,
        title: title.trim(),
        notes: notes || '',
        code: code || ''
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json({ message: 'Failed to add the question.' }, { status: 500 });
  }
}
