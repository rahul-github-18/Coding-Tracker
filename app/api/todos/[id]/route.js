import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PUT(req, { params }) {
  const { id } = params;
  try {
    const { title, completed } = await req.json();

    const updateData = {};
    if (title !== undefined) {
      if (title.trim() === '') {
        return NextResponse.json({ message: 'Title cannot be empty.' }, { status: 400 });
      }
      updateData.title = title.trim();
    }

    if (completed !== undefined) {
      updateData.completed = completed;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No fields provided for update.' }, { status: 400 });
    }

    const { data: updatedTodo, error } = await supabase
      .from('todos')
      .update(updateData)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!updatedTodo) {
      return NextResponse.json({ message: 'Todo item not found.' }, { status: 404 });
    }

    return NextResponse.json(updatedTodo);
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json({ message: 'Failed to update the todo item.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = params;
  try {
    const { data: deletedTodo, error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!deletedTodo) {
      return NextResponse.json({ message: 'Todo item not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Todo deleted successfully.' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json({ message: 'Failed to delete the todo item.' }, { status: 500 });
  }
}
