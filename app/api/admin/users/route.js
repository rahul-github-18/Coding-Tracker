import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function checkAdmin(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  console.time('Supabase: Check Admin role');
  const { data: adminCheck, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', reqUserId)
    .maybeSingle();
  console.timeEnd('Supabase: Check Admin role');

  if (error || !adminCheck || adminCheck.role !== 'admin') {
    return null;
  }
  return reqUserId;
}

export async function GET(req) {
  console.time('API: GET /api/admin/users');
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) {
      console.timeEnd('API: GET /api/admin/users');
      return NextResponse.json({ message: 'Access Denied. Admins only.' }, { status: 403 });
    }

    console.time('Supabase: Fetch all users');
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, role, approved, can_view, can_edit, can_delete, streak')
      .order('approved', { ascending: true })
      .order('username', { ascending: true });
    console.timeEnd('Supabase: Fetch all users');

    if (error) throw error;

    console.timeEnd('API: GET /api/admin/users');
    return NextResponse.json(users);
  } catch (error) {
    console.error('Admin GET users error:', error);
    console.timeEnd('API: GET /api/admin/users');
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
