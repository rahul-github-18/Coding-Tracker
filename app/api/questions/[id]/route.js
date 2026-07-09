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

export async function GET(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_view) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { id } = params;
    const res = await query('SELECT * FROM questions WHERE id = $1', [id]);

    if (res.rows.length === 0) {
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    return NextResponse.json(res.rows[0]);
  } catch (error) {
    console.error('GET question detail error:', error);
    return NextResponse.json({ message: 'Failed to retrieve question details.' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { id } = params;
    const { title, description, difficulty, tags, answer, code, explanation } = await req.json();

    const checkRes = await query('SELECT * FROM questions WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }
    const question = checkRes.rows[0];

    const newTitle = title !== undefined ? title.trim() : question.title;
    const newDescription = description !== undefined ? description : question.description;
    const newDifficulty = difficulty !== undefined ? difficulty : question.difficulty;
    const newTags = tags !== undefined ? tags : question.tags;
    const newAnswer = answer !== undefined ? answer : question.answer;
    const newCode = code !== undefined ? code : question.code;
    const newExplanation = explanation !== undefined ? explanation : question.explanation;

    if (newTitle === '') {
      return NextResponse.json({ message: 'Title cannot be empty.' }, { status: 400 });
    }

    const updateRes = await query(
      `UPDATE questions 
       SET title = $1, description = $2, difficulty = $3, tags = $4, answer = $5, code = $6, explanation = $7
       WHERE id = $8
       RETURNING *`,
      [newTitle, newDescription, newDifficulty, newTags, newAnswer, newCode, newExplanation, id]
    );

    return NextResponse.json(updateRes.rows[0]);
  } catch (error) {
    console.error('PUT question error:', error);
    return NextResponse.json({ message: 'Failed to update question.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const user = await checkUser(req);
    if (!user || !user.can_delete) {
      return NextResponse.json({ message: 'Access Denied. You do not have permission to delete content.' }, { status: 403 });
    }

    const { id } = params;
    const deleteRes = await query('DELETE FROM questions WHERE id = $1 RETURNING id', [id]);

    if (deleteRes.rows.length === 0) {
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Question deleted successfully.' });
  } catch (error) {
    console.error('DELETE question error:', error);
    return NextResponse.json({ message: 'Failed to delete question.' }, { status: 500 });
  }
}
