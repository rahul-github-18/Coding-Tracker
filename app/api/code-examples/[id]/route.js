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
    const { title, language, code, explanation, notes } = await req.json();

    const checkRes = await query('SELECT * FROM code_examples WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ message: 'Code example not found.' }, { status: 404 });
    }
    const example = checkRes.rows[0];

    const newTitle = title !== undefined ? title : example.title;
    const newLanguage = language !== undefined ? language : example.language;
    const newCode = code !== undefined ? code : example.code;
    const newExplanation = explanation !== undefined ? explanation : example.explanation;
    const newNotes = notes !== undefined ? notes : example.notes;

    if (!newCode || newCode.trim() === '') {
      return NextResponse.json({ message: 'Code block cannot be empty.' }, { status: 400 });
    }

    const updateRes = await query(
      `UPDATE code_examples 
       SET title = $1, language = $2, code = $3, explanation = $4, notes = $5
       WHERE id = $6
       RETURNING *`,
      [newTitle, newLanguage, newCode, newExplanation, newNotes, id]
    );

    return NextResponse.json(updateRes.rows[0]);
  } catch (error) {
    console.error('PUT code example error:', error);
    return NextResponse.json({ message: 'Failed to update code example.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_delete) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to delete content.' }, { status: 403 });
    }

    const { id } = params;
    const deleteRes = await query('DELETE FROM code_examples WHERE id = $1 RETURNING id', [id]);

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ message: 'Code example not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Code example deleted successfully.' });
  } catch (error) {
    console.error('DELETE code example error:', error);
    return NextResponse.json({ message: 'Failed to delete code example.' }, { status: 500 });
  }
}
