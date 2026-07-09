import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const userCheck = await query('SELECT id, approved, role, can_view, can_edit, can_delete FROM users WHERE id = $1', [reqUserId]);
  if (userCheck.rows.length === 0 || !userCheck.rows[0].approved) {
    return null;
  }
  return userCheck.rows[0];
}

export async function PUT(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { id } = params;
    const { title, content } = await req.json();

    const checkRes = await query('SELECT * FROM notes WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ message: 'Note not found.' }, { status: 404 });
    }
    const note = checkRes.rows[0];

    const newTitle = title !== undefined ? title.trim() : note.title;
    const newContent = content !== undefined ? content : note.content;

    if (newTitle === '') {
      return NextResponse.json({ message: 'Title cannot be empty.' }, { status: 400 });
    }
    if (newContent === '') {
      return NextResponse.json({ message: 'Content cannot be empty.' }, { status: 400 });
    }

    const updateRes = await query(
      `UPDATE notes 
       SET title = $1, content = $2
       WHERE id = $3
       RETURNING *`,
      [newTitle, newContent, id]
    );

    return NextResponse.json(updateRes.rows[0]);
  } catch (error) {
    console.error('PUT note error:', error);
    return NextResponse.json({ message: 'Failed to update note.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_delete) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to delete content.' }, { status: 403 });
    }

    const { id } = params;
    const deleteRes = await query('DELETE FROM notes WHERE id = $1 RETURNING id', [id]);

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ message: 'Note not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Note deleted successfully.' });
  } catch (error) {
    console.error('DELETE note error:', error);
    return NextResponse.json({ message: 'Failed to delete note.' }, { status: 500 });
  }
}
