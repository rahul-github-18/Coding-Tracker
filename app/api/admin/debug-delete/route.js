import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    // 1. Fetch all users
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*');
    
    // 2. Test a direct delete on a test user if one exists
    let deleteResult = null;
    let deleteError = null;
    
    const testUser = users ? users.find(u => u.username !== 'admin') : null;
    if (testUser) {
      const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('id', testUser.id)
        .select('*');
      deleteResult = data;
      deleteError = error;
    }

    return NextResponse.json({
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      users: users || [],
      fetchError: fetchError || null,
      testUserToDelete: testUser || null,
      deleteResult: deleteResult || null,
      deleteError: deleteError || null
    });
  } catch (err) {
    return NextResponse.json({ error: err.message });
  }
}
