import { supabase } from './supabase';

let cache = {
  todos: null,
  questions: null,
  codeExamples: null,
  notes: null,
  lastFetched: 0
};

const CACHE_TTL = 300000; // 5 minutes cache lifetime

export async function getCachedCurriculum() {
  const now = Date.now();
  if (now - cache.lastFetched < CACHE_TTL && cache.todos) {
    console.log('[Cache] Returning cached curriculum data (HIT)');
    return {
      todos: cache.todos,
      questions: cache.questions,
      codeExamples: cache.codeExamples,
      notes: cache.notes
    };
  }

  console.log('[Cache] Fetching fresh curriculum data from Supabase (MISS)');
  console.time('Supabase: Fetch Curriculum');

  const [todosRes, questionsRes, examplesRes, notesRes] = await Promise.all([
    supabase.from('todos').select('id, title, category, difficulty, estimated_time, sort_order'),
    supabase.from('questions').select('id, title, todo_id, difficulty, tags, description, answer, code, explanation, notes, sort_order'),
    supabase.from('code_examples').select('id, topic_id, title, language, code, explanation, notes'),
    supabase.from('notes').select('id, topic_id, title, content')
  ]);

  console.timeEnd('Supabase: Fetch Curriculum');

  if (todosRes.error) throw todosRes.error;
  if (questionsRes.error) throw questionsRes.error;
  if (examplesRes.error) throw examplesRes.error;
  if (notesRes.error) throw notesRes.error;

  cache.todos = todosRes.data || [];
  cache.questions = questionsRes.data || [];
  cache.codeExamples = examplesRes.data || [];
  cache.notes = notesRes.data || [];
  cache.lastFetched = now;

  return {
    todos: cache.todos,
    questions: cache.questions,
    codeExamples: cache.codeExamples,
    notes: cache.notes
  };
}

export function invalidateCache() {
  console.log('[Cache] Invalidating curriculum cache');
  cache.todos = null;
  cache.questions = null;
  cache.codeExamples = null;
  cache.notes = null;
  cache.lastFetched = 0;
}

let userCache = {}; // userId -> { user, timestamp }
const USER_CACHE_TTL = 15000; // 15 seconds

export async function getCachedUser(userId) {
  const now = Date.now();
  if (userCache[userId] && (now - userCache[userId].timestamp < USER_CACHE_TTL)) {
    console.log(`[Cache] Returning cached user for ID ${userId} (HIT)`);
    return userCache[userId].user;
  }

  console.log(`[Cache] Fetching fresh user profile from DB for ID ${userId} (MISS)`);
  const { data: user, error } = await supabase
    .from('users')
    .select('id, approved, role, can_view, can_edit, can_delete, streak, last_activity_date')
    .eq('id', userId)
    .maybeSingle();

  if (error || !user) {
    return null;
  }

  userCache[userId] = {
    user,
    timestamp: now
  };
  return user;
}

export function invalidateUserCache(userId) {
  console.log(`[Cache] Invalidating user cache for ID ${userId}`);
  delete userCache[userId];
}
