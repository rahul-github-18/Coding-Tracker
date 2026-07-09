import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { id } = params;
  try {
    const { data: question, error } = await supabase
      .from('questions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!question) {
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json({ message: 'Failed to retrieve question details.' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const { id } = params;
  try {
    const { title, notes, code } = await req.json();

    const updateData = {};
    if (title !== undefined) {
      if (title.trim() === '') {
        return NextResponse.json({ message: 'Title cannot be empty.' }, { status: 400 });
      }
      updateData.title = title.trim();
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (code !== undefined) {
      updateData.code = code;
    }

    // Set updated_at timestamp to now
    updateData.updated_at = new Date().toISOString();

    const { data: updatedQuestion, error } = await supabase
      .from('questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!updatedQuestion) {
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    return NextResponse.json(updatedQuestion);
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json({ message: 'Failed to save question notes and code.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = params;
  try {
    const { data: deletedQuestion, error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!deletedQuestion) {
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Question deleted successfully.' });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json({ message: 'Failed to delete the question.' }, { status: 500 });
  }
}
