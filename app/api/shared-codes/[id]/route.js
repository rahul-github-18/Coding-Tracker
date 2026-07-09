import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function DELETE(req, { params }) {
  const { id } = params;
  try {
    const { data: deletedSnippet, error } = await supabase
      .from('shared_codes')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!deletedSnippet) {
      return NextResponse.json({ message: 'Shared code not found or already expired.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Shared code deleted successfully.' });
  } catch (error) {
    console.error('Error deleting shared code:', error);
    return NextResponse.json({ message: 'Failed to delete the shared code.' }, { status: 500 });
  }
}
