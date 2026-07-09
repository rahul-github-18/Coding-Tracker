import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: todos, error: todosError } = await supabase
      .from('todos')
      .select('id, title, completed, created_date')
      .order('created_date', { ascending: false })
      .order('id', { ascending: false });

    if (todosError) throw todosError;

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, todo_id, title');

    if (questionsError) throw questionsError;
    
    // Group questions by todo_id
    const questionsMap = {};
    questions.forEach(q => {
      if (!questionsMap[q.todo_id]) {
        questionsMap[q.todo_id] = [];
      }
      questionsMap[q.todo_id].push(q);
    });

    // Attach questions array to each todo
    const todosWithQuestions = todos.map(todo => ({
      ...todo,
      // Supabase date fields are returned as 'YYYY-MM-DD' strings, but we format just in case
      created_date: todo.created_date,
      questions: questionsMap[todo.id] || []
    }));

    return NextResponse.json(todosWithQuestions);
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      { message: 'Failed to retrieve coding tasks. Please ensure the database is running.' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { title } = await req.json();

    if (!title || title.trim() === '') {
      return NextResponse.json({ message: 'Todo title is required.' }, { status: 400 });
    }

    // Automatically save the current date in YYYY-MM-DD format based on local time
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const createdDate = `${yyyy}-${mm}-${dd}`;

    const { data: newTodo, error } = await supabase
      .from('todos')
      .insert({
        title: title.trim(),
        completed: false,
        created_date: createdDate
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(newTodo, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json({ message: 'Failed to create the todo item.' }, { status: 500 });
  }
}
