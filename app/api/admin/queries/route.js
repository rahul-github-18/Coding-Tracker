import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCachedUser } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function checkAdmin(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const user = await getCachedUser(reqUserId);
  if (!user || user.role !== 'admin') {
    return null;
  }
  return reqUserId;
}

export async function GET(req) {
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ message: 'Access Denied. Admins only.' }, { status: 403 });
    }

    const { data: queries, error } = await supabase
      .from('user_queries')
      .select('*, users(username)')
      .order('id', { ascending: false });

    if (error) throw error;

    return NextResponse.json(queries);
  } catch (error) {
    console.error('GET admin queries error:', error);
    return NextResponse.json({ message: 'Failed to retrieve admin queries.' }, { status: 500 });
  }
}
