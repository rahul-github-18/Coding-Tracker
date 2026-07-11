import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCachedUser } from '@/lib/cache';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const user = await getCachedUser(reqUserId);
  if (!user || !user.approved) {
    return null;
  }
  return user;
}

export async function GET(req) {
  try {
    const user = await checkUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { data: queries, error } = await supabase
      .from('user_queries')
      .select('*')
      .eq('user_id', user.id)
      .order('id', { ascending: false });

    if (error) throw error;

    return NextResponse.json(queries);
  } catch (error) {
    console.error('GET user queries error:', error);
    return NextResponse.json({ message: 'Failed to retrieve queries.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await checkUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { query_text } = await req.json();
    if (!query_text || query_text.trim() === '') {
      return NextResponse.json({ message: 'Query text is required.' }, { status: 400 });
    }

    const { data: newQuery, error } = await supabase
      .from('user_queries')
      .insert({
        user_id: user.id,
        query_text: query_text.trim(),
        is_read_by_user: true
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json(newQuery, { status: 201 });
  } catch (error) {
    console.error('POST user query error:', error);
    return NextResponse.json({ message: 'Failed to submit query.' }, { status: 500 });
  }
}
