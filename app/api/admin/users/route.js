import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function checkAdmin(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const adminCheck = await query('SELECT role FROM users WHERE id = $1', [reqUserId]);
  if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
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

    const usersRes = await query(
      'SELECT id, username, role, approved, can_view, can_edit, can_delete, streak FROM users ORDER BY approved ASC, username ASC'
    );
    return NextResponse.json(usersRes.rows);
  } catch (error) {
    console.error('Admin GET users error:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
