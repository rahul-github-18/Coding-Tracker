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

    // Fetch all topics sorted by current sort_order, then id desc
    const { data: topics, error: fetchError } = await supabase
      .from('todos')
      .select('id, sort_order')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: false });

    if (fetchError) throw fetchError;

    const index = topics.findIndex(t => t.id === parseInt(id, 10));
    if (index === -1) {
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= topics.length) {
      return NextResponse.json({ message: 'Cannot move in that direction.' }, { status: 400 });
    }

    const updates = [];
    topics.forEach((t, idx) => {
      let newOrder = idx;
      if (idx === index) newOrder = targetIndex;
      else if (idx === targetIndex) newOrder = index;

      if (t.sort_order !== newOrder) {
        updates.push(
          supabase
            .from('todos')
            .update({ sort_order: newOrder })
            .eq('id', t.id)
        );
      }
    });

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    invalidateCache();

    return NextResponse.json({ message: 'Topic reordered successfully.' });
  } catch (error) {
    console.error('Reorder topic error:', error);
    return NextResponse.json({ message: 'Failed to reorder topic.' }, { status: 500 });
  }
}
