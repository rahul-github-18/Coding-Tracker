import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function checkUser(req) {
  const reqUserId = req.headers.get('x-user-id');
  if (!reqUserId) return null;

  const userCheck = await query('SELECT * FROM users WHERE id = $1', [reqUserId]);
  if (userCheck.rows.length === 0 || !userCheck.rows[0].approved) {
    return null;
  }
  return userCheck.rows[0];
}

export async function GET(req) {
  try {
    const user = await checkUser(req);
    if (!user) {
      return NextResponse.json({ message: 'Access Denied. Insufficient permissions.' }, { status: 403 });
    }

    // 1. Total count of learning items
    const [qTotalRes, eTotalRes, nTotalRes] = await Promise.all([
      query('SELECT COUNT(*) as count FROM questions'),
      query('SELECT COUNT(*) as count FROM code_examples'),
      query('SELECT COUNT(*) as count FROM notes')
    ]);
    const totalItems = 
      parseInt(qTotalRes.rows[0].count, 10) + 
      parseInt(eTotalRes.rows[0].count, 10) + 
      parseInt(nTotalRes.rows[0].count, 10);

    // 2. Total completed items by user
    const completedRes = await query(
      "SELECT COUNT(*) as count FROM user_tasks WHERE user_id = $1 AND status = 'Completed'",
      [user.id]
    );
    const completedItems = parseInt(completedRes.rows[0].count, 10);

    // 3. Percentage
    const learningPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // 4. Completed topics count
    // A topic is completed if all its items are completed (and it has items), or if marked completed in tasks
    const topicsRes = await query('SELECT id FROM topics');
    const topics = topicsRes.rows;

    let completedTopicsCount = 0;
    // For each topic, check if it is completed
    for (const topic of topics) {
      const [qTopic, eTopic, nTopic] = await Promise.all([
        query('SELECT id FROM questions WHERE topic_id = $1', [topic.id]),
        query('SELECT id FROM code_examples WHERE topic_id = $1', [topic.id]),
        query('SELECT id FROM notes WHERE topic_id = $1', [topic.id])
      ]);

      const itemIds = [
        ...qTopic.rows.map(q => ({ id: q.id, type: 'question' })),
        ...eTopic.rows.map(e => ({ id: e.id, type: 'code_example' })),
        ...nTopic.rows.map(n => ({ id: n.id, type: 'note' }))
      ];

      if (itemIds.length > 0) {
        // Check if all are completed
        const completedCheck = await query(
          `SELECT COUNT(*) as count FROM user_tasks 
           WHERE user_id = $1 AND status = 'Completed' 
           AND (
             (item_type = 'question' AND item_id = ANY($2::int[])) OR
             (item_type = 'code_example' AND item_id = ANY($3::int[])) OR
             (item_type = 'note' AND item_id = ANY($4::int[]))
           )`,
          [
            user.id,
            qTopic.rows.map(q => q.id),
            eTopic.rows.map(e => e.id),
            nTopic.rows.map(n => n.id)
          ]
        );
        if (parseInt(completedCheck.rows[0].count, 10) === itemIds.length) {
          completedTopicsCount++;
        }
      }
    }

    // 5. Weekly activity
    // Count completed tasks per day for the last 7 days
    const weeklyActivityRes = await query(
      `SELECT TO_CHAR(completed_at, 'YYYY-MM-DD') as date, COUNT(*) as count 
       FROM user_tasks 
       WHERE user_id = $1 AND status = 'Completed' AND completed_at >= NOW() - INTERVAL '7 days' 
       GROUP BY TO_CHAR(completed_at, 'YYYY-MM-DD')
       ORDER BY date ASC`,
      [user.id]
    );

    const weeklyActivity = weeklyActivityRes.rows;

    // 6. Recommended learning tasks
    // Suggest up to 3 questions that are not completed
    const recsRes = await query(
      `SELECT q.id, q.title, q.topic_id, t.title as topic_title, q.difficulty
       FROM questions q 
       JOIN topics t ON q.topic_id = t.id 
       WHERE q.id NOT IN (
         SELECT item_id FROM user_tasks WHERE user_id = $1 AND item_type = 'question' AND status = 'Completed'
       )
       LIMIT 3`,
      [user.id]
    );

    // 7. Streak verification (check if streak is broken, if user's last activity date is older than yesterday)
    let currentStreak = user.streak;
    if (user.last_activity_date) {
      const today = new Date();
      const offset = today.getTimezoneOffset();
      const localToday = new Date(today.getTime() - (offset*60*1000));
      const todayStr = localToday.toISOString().split('T')[0];

      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000 - (offset*60*1000));
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const dbLastActivityStr = new Date(user.last_activity_date).toISOString().split('T')[0];

      if (dbLastActivityStr !== todayStr && dbLastActivityStr !== yesterdayStr) {
        // Streak is broken! Reset in database
        currentStreak = 0;
        await query('UPDATE users SET streak = 0 WHERE id = $1', [user.id]);
      }
    }

    return NextResponse.json({
      streak: currentStreak,
      completedTasksCount: completedItems,
      completedTopicsCount: completedTopicsCount,
      totalTopicsCount: topics.length,
      learningPercentage: learningPercentage,
      weeklyActivity: weeklyActivity,
      recommendations: recsRes.rows
    });
  } catch (error) {
    console.error('GET user stats error:', error);
    return NextResponse.json({ message: 'Failed to retrieve stats.' }, { status: 500 });
  }
}
