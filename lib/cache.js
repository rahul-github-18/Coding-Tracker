import { supabase } from './supabase';

let cache = {
  todos: null,
  questions: null,
  codeExamples: null,
  notes: null,
  lastFetched: 0
};

const CACHE_TTL = 5000; // 5 seconds cache lifetime

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
    supabase.from('todos').select('id, title, category, difficulty, estimated_time'),
    supabase.from('questions').select('id, title, todo_id, difficulty, tags, description, answer, explanation, notes'),
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
