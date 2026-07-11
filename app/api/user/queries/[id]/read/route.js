import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCachedUser } from '@/lib/cache';

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

export async function PUT(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { id } = params;

    const { data: updatedQuery, error } = await supabase
      .from('user_queries')
      .update({
        is_read_by_user: true
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle();

    if (error) throw error;

    if (!updatedQuery) {
      return NextResponse.json({ message: 'Query not found.' }, { status: 404 });
    }

    return NextResponse.json(updatedQuery);
  } catch (error) {
    console.error('PUT read query error:', error);
    return NextResponse.json({ message: 'Failed to update query status.' }, { status: 500 });
  }
}
