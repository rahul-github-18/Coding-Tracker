import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function cleanExpiredCodes() {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const { error } = await supabase
      .from('shared_codes')
      .delete()
      .lt('created_at', fifteenMinutesAgo.toISOString());

    if (error) throw error;
    console.log('[cleanExpiredCodes] Finished background cleanup');
  } catch (error) {
    console.error('Error cleaning expired shared codes:', error);
  }
}

export async function GET(req) {
  try {
    // Clean up expired codes in background
    cleanExpiredCodes();

    const { searchParams } = new URL(req.url);
    const codeKey = searchParams.get('code');

    let query = supabase.from('shared_codes').select('*');
    if (codeKey) {
      query = query.eq('title', codeKey);
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: sharedCodes, error } = await query;

    if (error) throw error;

    return NextResponse.json(sharedCodes);
  } catch (error) {
    console.error('GET shared codes error:', error);
    return NextResponse.json({ message: 'Failed to retrieve shared codes.' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { title, code } = await req.json();

    if (!title || title.trim() === '') {
      return NextResponse.json({ message: 'Title is required to share code.' }, { status: 400 });
    }
    if (!code || code.trim() === '') {
      return NextResponse.json({ message: 'Code content cannot be empty.' }, { status: 400 });
    }

    // Clean up expired codes in background
    cleanExpiredCodes();

    const { data: newSnippet, error: insertError } = await supabase
      .from('shared_codes')
      .insert({
        title: title.trim(),
        code: code
      })
      .select('id, title, code, created_at')
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(newSnippet, { status: 201 });
  } catch (error) {
    console.error('POST shared code error:', error);
    return NextResponse.json({ message: 'Failed to share code snippet.' }, { status: 500 });
  }
}
