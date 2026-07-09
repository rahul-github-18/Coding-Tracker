import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }

    // Query user from database
    const res = await query(
      'SELECT id, username, password, role, approved, can_view, can_edit, can_delete FROM users WHERE username = $1',
      [username.trim()]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }

    const user = res.rows[0];

    // Check plaintext password (dont encrypt the pass as requested)
    if (user.password !== password) {
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }

    // Check if approved
    if (!user.approved) {
      return NextResponse.json({ message: 'Your account is pending approval by the admin.' }, { status: 403 });
    }

    // Success - return user without password
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
