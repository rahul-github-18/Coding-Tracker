import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const userCheck = await query('SELECT id, approved, role, can_view FROM users WHERE id = $1', [reqUserId]);
  if (userCheck.rows.length === 0 || !userCheck.rows[0].approved) {
    return null;
  }
  return userCheck.rows[0];
}

export async function DELETE(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_view) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { id } = params;
    const deleteRes = await query('DELETE FROM shared_codes WHERE id = $1 RETURNING id', [id]);

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ message: 'Shared code not found or already expired.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Shared code deleted successfully.' });
  } catch (error) {
    console.error('DELETE shared code error:', error);
    return NextResponse.json({ message: 'Failed to delete shared code.' }, { status: 500 });
  }
}
