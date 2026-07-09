// Client-side API Service Layer calling Next.js API Routes

// Helper to get auth headers
const getAuthHeaders = () => {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  return {
    'Content-Type': 'application/json',
    ...(userId ? { 'x-user-id': userId } : {})
  };
};

const handleResponse = async (res) => {
  const contentType = res.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = { message: await res.text() };
  }

  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
};

export const authService = {
  login: async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(res);
  },

  register: async (username, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(res);
  }
};

export const userService = {
  getUsers: async () => {
    const res = await fetch('/api/admin/users', {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    return handleResponse(res);
  },

  approveUser: async (id) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ approved: true })
    });
    return handleResponse(res);
  },

  updatePermissions: async (id, permissions) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(permissions)
    });
    return handleResponse(res);
  }
};

export const todoService = {
  getTodos: async (search = '', difficulty = '', category = '') => {
    let url = '/api/topics?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (difficulty) url += `difficulty=${encodeURIComponent(difficulty)}&`;
    if (category) url += `category=${encodeURIComponent(category)}&`;
    
    const res = await fetch(url, {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    return handleResponse(res);
  },

  createTodo: async (title, category = 'General', difficulty = 'Beginner', estimatedTime = '1 hour') => {
    const res = await fetch('/api/topics', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, category, difficulty, estimatedTime })
    });
    return handleResponse(res);
  },

  updateTodo: async (id, updateData) => {
    const res = await fetch(`/api/topics/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData)
    });
    return handleResponse(res);
  },

  deleteTodo: async (id) => {
    const res = await fetch(`/api/topics/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  }
};

export const questionService = {
  getQuestions: async (topicId) => {
    const res = await fetch(`/api/topics/${topicId}/questions`, {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    return handleResponse(res);
  },

  getAllQuestions: async () => {
    const res = await fetch('/api/questions', {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    return handleResponse(res);
  },

  getQuestion: async (id) => {
    const res = await fetch(`/api/questions/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  createQuestion: async (topicId, data) => {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ topic_id: topicId, ...data })
    });
    return handleResponse(res);
  },

  updateQuestion: async (id, updateData) => {
    const res = await fetch(`/api/questions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData)
    });
    return handleResponse(res);
  },

  deleteQuestion: async (id) => {
    const res = await fetch(`/api/questions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  }
};

export const codeService = {
  getExamples: async (topicId) => {
    const res = await fetch(`/api/code-examples?topic_id=${topicId}`, {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    return handleResponse(res);
  },

  createExample: async (topicId, data) => {
    const res = await fetch('/api/code-examples', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ topic_id: topicId, ...data })
    });
    return handleResponse(res);
  },

  updateExample: async (id, updateData) => {
    const res = await fetch(`/api/code-examples/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData)
    });
    return handleResponse(res);
  },

  deleteExample: async (id) => {
    const res = await fetch(`/api/code-examples/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  }
};

export const noteService = {
  getNotes: async (topicId) => {
    const res = await fetch(`/api/notes?topic_id=${topicId}`, {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    return handleResponse(res);
  },

  createNote: async (topicId, data) => {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ topic_id: topicId, ...data })
    });
    return handleResponse(res);
  },

  updateNote: async (id, updateData) => {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData)
    });
    return handleResponse(res);
  },

  deleteNote: async (id) => {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  }
};

export const taskService = {
  getUserTasks: async () => {
    const res = await fetch('/api/user/tasks', {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    return handleResponse(res);
  },

  addTask: async (itemType, itemId, status = 'Pending', savedForLater = false) => {
    const res = await fetch('/api/user/tasks', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ itemType, itemId, status, savedForLater })
    });
    return handleResponse(res);
  },

  updateTask: async (id, updateData) => {
    const res = await fetch(`/api/user/tasks/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData)
    });
    return handleResponse(res);
  },

  removeTask: async (id) => {
    const res = await fetch(`/api/user/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  getUserStats: async () => {
    const res = await fetch('/api/user/stats', {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    return handleResponse(res);
  }
};

export const shareService = {
  getSharedCodes: async () => {
    const res = await fetch('/api/shared-codes', {
      headers: getAuthHeaders(),
      cache: 'no-store'
    });
    return handleResponse(res);
  },

  createSharedCode: async (title, code) => {
    const res = await fetch('/api/shared-codes', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, code })
    });
    return handleResponse(res);
  },

  deleteSharedCode: async (id) => {
    const res = await fetch(`/api/shared-codes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  }
};

export default {
  authService,
  userService,
  todoService,
  questionService,
  codeService,
  noteService,
  taskService,
  shareService
};
