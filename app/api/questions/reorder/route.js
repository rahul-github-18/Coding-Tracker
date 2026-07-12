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

export async function POST(req) {
  try {
    const user = await checkUser(req);
    if (!user || (user.role !== 'admin' && !user.can_edit)) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { id, direction } = await req.json();
    if (!id || !direction || (direction !== 'up' && direction !== 'down')) {
      return NextResponse.json({ message: 'ID and valid direction (up/down) are required.' }, { status: 400 });
    }

    // Get the question's todo_id first
    const { data: question, error: qError } = await supabase
      .from('questions')
      .select('todo_id')
      .eq('id', id)
      .maybeSingle();

    if (qError || !question) {
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    const todoId = question.todo_id;

    // Fetch all questions for this topic sorted by current sort_order, then id asc
    const { data: questions, error: fetchError } = await supabase
      .from('questions')
      .select('id, sort_order')
      .eq('todo_id', todoId)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });

    if (fetchError) throw fetchError;

    const index = questions.findIndex(q => q.id === parseInt(id, 10));
    if (index === -1) {
      return NextResponse.json({ message: 'Question not found in topic.' }, { status: 404 });
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) {
      return NextResponse.json({ message: 'Cannot move in that direction.' }, { status: 400 });
    }

    const updates = [];
    questions.forEach((q, idx) => {
      let newOrder = idx;
      if (idx === index) newOrder = targetIndex;
      else if (idx === targetIndex) newOrder = index;

      if (q.sort_order !== newOrder) {
        updates.push(
          supabase
            .from('questions')
            .update({ sort_order: newOrder })
            .eq('id', q.id)
        );
      }
    });

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    invalidateCache();

    return NextResponse.json({ message: 'Question reordered successfully.' });
  } catch (error) {
    console.error('Reorder question error:', error);
    return NextResponse.json({ message: 'Failed to reorder question.' }, { status: 500 });
  }
}
