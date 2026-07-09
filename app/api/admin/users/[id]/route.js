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

export async function PUT(req, { params }) {
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) {
      return NextResponse.json({ message: 'Access Denied. Admins only.' }, { status: 403 });
    }

    const { id } = params;
    const { approved, can_view, can_edit, can_delete, role } = await req.json();

    // Fetch existing user details first to keep unchanged fields
    const userRes = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    const user = userRes.rows[0];

    const newApproved = approved !== undefined ? approved : user.approved;
    const newCanView = can_view !== undefined ? can_view : user.can_view;
    const newCanEdit = can_edit !== undefined ? can_edit : user.can_edit;
    const newCanDelete = can_delete !== undefined ? can_delete : user.can_delete;
    const newRole = role !== undefined ? role : user.role;

    // Do update
    const updateRes = await query(
      `UPDATE users 
       SET approved = $1, can_view = $2, can_edit = $3, can_delete = $4, role = $5
       WHERE id = $6
       RETURNING id, username, role, approved, can_view, can_edit, can_delete`,
      [newApproved, newCanView, newCanEdit, newCanDelete, newRole, id]
    );

    return NextResponse.json(updateRes.rows[0]);
  } catch (error) {
    console.error('Admin PUT user error:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
