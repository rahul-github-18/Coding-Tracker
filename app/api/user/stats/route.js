import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCachedCurriculum } from '@/lib/cache';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', reqUserId)
    .maybeSingle();

  if (error || !user || !user.approved) {
    return null;
  }
  return user;
}

export async function GET(req) {
  console.time('API: GET /api/user/stats');
  try {
    const user = await checkUser(req);
    if (!user) {
      console.timeEnd('API: GET /api/user/stats');
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    // Fetch curriculum from cache
    const { todos, questions, codeExamples, notes } = await getCachedCurriculum();

    const qCount = questions.length;
    const eCount = codeExamples.length;
    const nCount = notes.length;
    const totalItems = qCount + eCount + nCount;

    // Fetch user completed tasks and recent tasks in parallel
    console.time('Supabase: Fetch user_tasks (stats)');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [completedRes, recentTasksRes] = await Promise.all([
      supabase.from('user_tasks').select('item_type, item_id').eq('user_id', user.id).eq('status', 'Completed'),
      supabase.from('user_tasks').select('completed_at').eq('user_id', user.id).eq('status', 'Completed').gte('completed_at', sevenDaysAgo.toISOString())
    ]);
    console.timeEnd('Supabase: Fetch user_tasks (stats)');

    if (completedRes.error) throw completedRes.error;
    if (recentTasksRes.error) throw recentTasksRes.error;

    const userCompletedTasks = completedRes.data || [];
    const completedItems = userCompletedTasks.length;

    // Percentage
    const learningPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Completed topics count (todos is the topics table)
    const completedQuestionIds = new Set(userCompletedTasks.filter(t => t.item_type === 'question').map(t => t.item_id));
    const completedExampleIds = new Set(userCompletedTasks.filter(t => t.item_type === 'code_example').map(t => t.item_id));
    const completedNoteIds = new Set(userCompletedTasks.filter(t => t.item_type === 'note').map(t => t.item_id));

    const topicQuestionsMap = {};
    questions.forEach(q => {
      if (!topicQuestionsMap[q.todo_id]) topicQuestionsMap[q.todo_id] = [];
      topicQuestionsMap[q.todo_id].push(q.id);
    });

    const topicExamplesMap = {};
    codeExamples.forEach(e => {
      if (!topicExamplesMap[e.topic_id]) topicExamplesMap[e.topic_id] = [];
      topicExamplesMap[e.topic_id].push(e.id);
    });

    const topicNotesMap = {};
    notes.forEach(n => {
      if (!topicNotesMap[n.topic_id]) topicNotesMap[n.topic_id] = [];
      topicNotesMap[n.topic_id].push(n.id);
    });

    let completedTopicsCount = 0;
    (todos || []).forEach(todo => {
      const qIds = topicQuestionsMap[todo.id] || [];
      const eIds = topicExamplesMap[todo.id] || [];
      const nIds = topicNotesMap[todo.id] || [];
      const total = qIds.length + eIds.length + nIds.length;

      if (total > 0) {
        const completedCount = 
          qIds.filter(id => completedQuestionIds.has(id)).length +
          eIds.filter(id => completedExampleIds.has(id)).length +
          nIds.filter(id => completedNoteIds.has(id)).length;
        
        if (completedCount === total) {
          completedTopicsCount++;
        }
      }
    });

    // Group weekly activity by YYYY-MM-DD
    const activityMap = {};
    (recentTasksRes.data || []).forEach(t => {
      if (t.completed_at) {
        const dateStr = new Date(t.completed_at).toISOString().split('T')[0];
        activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
      }
    });

    const weeklyActivity = Object.entries(activityMap).map(([date, count]) => ({
      date,
      count
    }));

    // Recommended learning tasks (suggest up to 3 questions not yet completed)
    const completedQIds = userCompletedTasks.filter(t => t.item_type === 'question').map(t => t.item_id);
    const completedQSet = new Set(completedQIds);

    const uncompletedQuestions = questions.filter(q => !completedQSet.has(q.id));
    const questionsList = uncompletedQuestions.slice(0, 3);

    const todoTitles = {};
    (todos || []).forEach(t => { todoTitles[t.id] = t.title; });

    const recommendations = questionsList.map(q => ({
      id: q.id,
      title: q.title,
      topic_id: q.todo_id,
      topic_title: todoTitles[q.todo_id] || 'General',
      difficulty: q.difficulty
    }));

    // Streak verification
    let currentStreak = user.streak;
    if (user.last_activity_date) {
      const today = new Date();
      const offset = today.getTimezoneOffset();
      const localToday = new Date(today.getTime() - (offset * 60 * 1000));
      const todayStr = localToday.toISOString().split('T')[0];

      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000 - (offset * 60 * 1000));
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const dbLastActivityStr = new Date(user.last_activity_date).toISOString().split('T')[0];

      if (dbLastActivityStr !== todayStr && dbLastActivityStr !== yesterdayStr) {
        currentStreak = 0;
        console.time('Supabase: Reset user streak');
        await supabase
          .from('users')
          .update({ streak: 0 })
          .eq('id', user.id);
        console.timeEnd('Supabase: Reset user streak');
      }
    }

    console.timeEnd('API: GET /api/user/stats');
    return NextResponse.json({
      streak: currentStreak,
      completedTasksCount: completedItems,
      completedTopicsCount: completedTopicsCount,
      totalTopicsCount: todos ? todos.length : 0,
      learningPercentage: learningPercentage,
      weeklyActivity: weeklyActivity,
      recommendations: recommendations
    });
  } catch (error) {
    console.error('GET user stats error:', error);
    console.timeEnd('API: GET /api/user/stats');
    return NextResponse.json({ message: 'Failed to retrieve stats.' }, { status: 500 });
  }
}
