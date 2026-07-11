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

export async function POST(req) {
  try {
    const user = await checkUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    const { topic_id, question_title, code } = await req.json();

    if (!topic_id) {
      return NextResponse.json({ message: 'topic_id is required.' }, { status: 400 });
    }
    if (!question_title || question_title.trim() === '') {
      return NextResponse.json({ message: 'Question title is required.' }, { status: 400 });
    }
    if (!code || code.trim() === '') {
      return NextResponse.json({ message: 'Code content is required.' }, { status: 400 });
    }

    const { data: newSubmission, error } = await supabase
      .from('user_submissions')
      .insert({
        user_id: user.id,
        topic_id,
        question_title: question_title.trim(),
        code: code.trim()
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json(newSubmission, { status: 201 });
  } catch (error) {
    console.error('POST user submission error:', error);
    return NextResponse.json({ message: 'Failed to submit code.' }, { status: 500 });
  }
}
