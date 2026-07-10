import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const { data: deletedSnippet, error } = await supabase
      .from('shared_codes')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error || !deletedSnippet) {
      return NextResponse.json({ message: 'Shared code not found or already expired.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Shared code deleted successfully.' });
  } catch (error) {
    console.error('DELETE shared code error:', error);
    return NextResponse.json({ message: 'Failed to delete shared code.' }, { status: 500 });
  }
}
