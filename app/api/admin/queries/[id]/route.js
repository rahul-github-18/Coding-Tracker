import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCachedUser } from '@/lib/cache';

export const dynamic = 'force-dynamic';

async function checkAdmin(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const user = await getCachedUser(reqUserId);
  if (!user || user.role !== 'admin') {
    return null;
  }
  return reqUserId;
}

export async function PUT(req, { params }) {
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ message: 'Access Denied. Admins only.' }, { status: 403 });
    }

    const { id } = params;
    const { reply_text } = await req.json();

    if (!reply_text || reply_text.trim() === '') {
      return NextResponse.json({ message: 'Reply text is required.' }, { status: 400 });
    }

    const { data: updatedQuery, error } = await supabase
      .from('user_queries')
      .update({
        reply_text: reply_text.trim(),
        replied_at: new Date().toISOString(),
        is_read_by_user: false // trigger notification dot for student
      })
      .eq('id', id)
      .select('*, users(username)')
      .maybeSingle();

    if (error) throw error;

    if (!updatedQuery) {
      return NextResponse.json({ message: 'Query not found.' }, { status: 404 });
    }

    return NextResponse.json(updatedQuery);
  } catch (error) {
    console.error('PUT admin reply query error:', error);
    return NextResponse.json({ message: 'Failed to submit query reply.' }, { status: 500 });
  }
}
