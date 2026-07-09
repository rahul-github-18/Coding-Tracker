import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function checkAdmin(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  console.time('Supabase: Check Admin role (PUT user)');
  const { data: adminCheck, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', reqUserId)
    .maybeSingle();
  console.timeEnd('Supabase: Check Admin role (PUT user)');

  if (error || !adminCheck || adminCheck.role !== 'admin') {
    return null;
  }
  return reqUserId;
}

export async function PUT(req, { params }) {
  const { id } = params;
  const timerLabel = `API: PUT /api/admin/users/${id}`;
  console.time(timerLabel);
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Access Denied. Admins only.' }, { status: 403 });
    }

    const { approved, can_view, can_edit, can_delete, role } = await req.json();

    // Fetch existing user details
    console.time('Supabase: Fetch User detail (PUT)');
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    console.timeEnd('Supabase: Fetch User detail (PUT)');

    if (fetchError || !user) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const updateData = {};
    if (approved !== undefined) updateData.approved = approved;
    if (can_view !== undefined) updateData.can_view = can_view;
    if (can_edit !== undefined) updateData.can_edit = can_edit;
    if (can_delete !== undefined) updateData.can_delete = can_delete;
    if (role !== undefined) updateData.role = role;

    // Do update
    console.time('Supabase: Update User detail');
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, role, approved, can_view, can_edit, can_delete')
      .single();
    console.timeEnd('Supabase: Update User detail');

    if (updateError) throw updateError;

    console.timeEnd(timerLabel);
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Admin PUT user error:', error);
    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
