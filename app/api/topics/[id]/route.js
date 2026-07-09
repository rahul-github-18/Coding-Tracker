import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCachedCurriculum, invalidateCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, approved, role, can_view, can_edit, can_delete')
    .eq('id', reqUserId)
    .maybeSingle();

  if (error || !user || !user.approved) {
    return null;
  }
  return user;
}

export async function GET(req, { params }) {
  const { id } = params;
  const timerLabel = `API: GET /api/topics/${id}`;
  console.time(timerLabel);
  try {
    const user = await checkUser(req);
    if (!user || !user.can_view) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    // Fetch curriculum from cache
    const { todos, questions, codeExamples, notes } = await getCachedCurriculum();

    // Find the specific topic
    const topic = todos.find(t => t.id === parseInt(id, 10));
    if (!topic) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }

    // Filter questions, code examples, and notes associated with this topic
    const topicQuestions = questions.filter(q => q.todo_id === topic.id);
    const topicExamples = codeExamples.filter(e => e.topic_id === topic.id);
    const topicNotes = notes.filter(n => n.topic_id === topic.id);

    // Fetch user completion tasks (only user_tasks table queried)
    console.time('Supabase: Fetch user_tasks (GET topic detail)');
    const { data: userTasks, error: tasksError } = await supabase
      .from('user_tasks')
      .select('item_type, item_id, status, saved_for_later')
      .eq('user_id', user.id);
    console.timeEnd('Supabase: Fetch user_tasks (GET topic detail)');

    if (tasksError) throw tasksError;

    // Create maps for quick lookup of item status/saved state
    const taskMap = {};
    (userTasks || []).forEach(t => {
      taskMap[`${t.item_type}_${t.item_id}`] = {
        status: t.status,
        saved_for_later: t.saved_for_later
      };
    });

    const questionsWithStatus = topicQuestions.map(q => ({
      ...q,
      status: taskMap[`question_${q.id}`]?.status || 'Pending',
      saved_for_later: taskMap[`question_${q.id}`]?.saved_for_later || false
    }));

    const examplesWithStatus = topicExamples.map(e => ({
      ...e,
      status: taskMap[`code_example_${e.id}`]?.status || 'Pending',
      saved_for_later: taskMap[`code_example_${e.id}`]?.saved_for_later || false
    }));

    const notesWithStatus = topicNotes.map(n => ({
      ...n,
      status: taskMap[`note_${n.id}`]?.status || 'Pending',
      saved_for_later: taskMap[`note_${n.id}`]?.saved_for_later || false
    }));

    const isTopicCompleted = taskMap[`topic_${topic.id}`]?.status === 'Completed';
    const isTopicSaved = taskMap[`topic_${topic.id}`]?.saved_for_later || false;

    console.timeEnd(timerLabel);
    return NextResponse.json({
      ...topic,
      completed: isTopicCompleted,
      saved_for_later: isTopicSaved,
      questions: questionsWithStatus,
      codeExamples: examplesWithStatus,
      notes: notesWithStatus
    });
  } catch (error) {
    console.error('GET topic detail error:', error);
    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'Failed to retrieve topic details.' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  const { id } = params;
  const timerLabel = `API: PUT /api/topics/${id}`;
  console.time(timerLabel);
  try {
    const user = await checkUser(req);
    if (!user || !user.can_edit) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Access Denied. You do not have permission to edit content.' }, { status: 403 });
    }

    const { title, category, difficulty, estimatedTime } = await req.json();

    // Fetch existing topic from cache
    const { todos } = await getCachedCurriculum();
    const topic = todos.find(t => t.id === parseInt(id, 10));

    if (!topic) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }

    const newTitle = title !== undefined ? title.trim() : topic.title;
    const newCategory = category !== undefined ? category : topic.category;
    const newDifficulty = difficulty !== undefined ? difficulty : topic.difficulty;
    const newEstimatedTime = estimatedTime !== undefined ? estimatedTime : topic.estimated_time;

    if (newTitle === '') {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Title cannot be empty.' }, { status: 400 });
    }

    console.time('Supabase: Update Topic');
    const { data: updatedTopic, error: updateError } = await supabase
      .from('todos')
      .update({
        title: newTitle,
        category: newCategory,
        difficulty: newDifficulty,
        estimated_time: newEstimatedTime
      })
      .eq('id', id)
      .select()
      .single();
    console.timeEnd('Supabase: Update Topic');

    if (updateError) throw updateError;

    // Invalidate Cache
    invalidateCache();

    console.timeEnd(timerLabel);
    return NextResponse.json(updatedTopic);
  } catch (error) {
    console.error('PUT topic error:', error);
    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'Failed to update topic.' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = params;
  const timerLabel = `API: DELETE /api/topics/${id}`;
  console.time(timerLabel);
  try {
    const user = await checkUser(req);
    if (!user || !user.can_delete) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Access Denied. You do not have permission to delete content.' }, { status: 403 });
    }

    console.time('Supabase: Delete Topic');
    const { data: deletedTopic, error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    console.timeEnd('Supabase: Delete Topic');

    if (error || !deletedTopic) {
      console.timeEnd(timerLabel);
      return NextResponse.json({ message: 'Topic not found.' }, { status: 404 });
    }

    // Invalidate Cache
    invalidateCache();

    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'Topic deleted successfully.' });
  } catch (error) {
    console.error('DELETE topic error:', error);
    console.timeEnd(timerLabel);
    return NextResponse.json({ message: 'Failed to delete topic.' }, { status: 500 });
  }
}
