import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  console.time('API: POST /api/auth/login');
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      console.timeEnd('API: POST /api/auth/login');
      return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }

    // Query user from Supabase
    console.time('Supabase: Fetch user (login)');
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password, role, approved, can_view, can_edit, can_delete')
      .eq('username', username.trim())
      .maybeSingle();
    console.timeEnd('Supabase: Fetch user (login)');

    if (error) {
      console.error('Supabase query error during login:', error);
      throw error;
    }

    if (!user) {
      console.timeEnd('API: POST /api/auth/login');
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }

    // Check plaintext password (dont encrypt the pass as requested)
    if (user.password !== password) {
      console.timeEnd('API: POST /api/auth/login');
      return NextResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    }

    // Check if approved
    if (!user.approved) {
      console.timeEnd('API: POST /api/auth/login');
      return NextResponse.json({ message: 'Your account is pending approval by the admin.' }, { status: 403 });
    }

    // Success - return user without password
    const { password: _, ...userWithoutPassword } = user;
    console.timeEnd('API: POST /api/auth/login');
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error('Login error:', error);
    console.timeEnd('API: POST /api/auth/login');
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
