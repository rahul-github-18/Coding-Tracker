import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }

    if (username.trim().toLowerCase() === 'admin') {
      return NextResponse.json({ message: 'Cannot register with the username "admin"' }, { status: 400 });
    }

    // Check if user already exists
    const checkRes = await query('SELECT id FROM users WHERE username = $1', [username.trim()]);
    if (checkRes.rows.length > 0) {
      return NextResponse.json({ message: 'Username is already taken' }, { status: 400 });
    }

    // Insert user (not encrypted as requested)
    await query(
      'INSERT INTO users (username, password, role, approved, can_view, can_edit, can_delete) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [username.trim(), password, 'user', false, true, false, false]
    );

    return NextResponse.json(
      { message: 'Enrollment successful! Your account is pending admin approval.' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
