import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const todoService = {
  getTodos: async () => {
    const response = await api.get('/todos');
    return response.data;
  },
  createTodo: async (title) => {
    const response = await api.post('/todos', { title });
    return response.data;
  },
  updateTodo: async (id, data) => {
    const response = await api.put(`/todos/${id}`, data);
    return response.data;
  },
  deleteTodo: async (id) => {
    const response = await api.delete(`/todos/${id}`);
    return response.data;
  },
};

export const questionService = {
  getQuestions: async (todoId) => {
    const response = await api.get(`/todos/${todoId}/questions`);
    return response.data;
  },
  getQuestion: async (id) => {
    const response = await api.get(`/questions/${id}`);
    return response.data;
  },
  createQuestion: async (todoId, data) => {
    const response = await api.post(`/todos/${todoId}/questions`, data);
    return response.data;
  },
  updateQuestion: async (id, data) => {
    const response = await api.put(`/questions/${id}`, data);
    return response.data;
  },
  deleteQuestion: async (id) => {
    const response = await api.delete(`/questions/${id}`);
    return response.data;
  },
};

export const shareService = {
  getSharedCodes: async () => {
    const response = await api.get('/shared-codes');
    return response.data;
  },
  createSharedCode: async (title, code) => {
    const response = await api.post('/shared-codes', { title, code });
    return response.data;
  },
  deleteSharedCode: async (id) => {
    const response = await api.delete(`/shared-codes/${id}`);
    return response.data;
  },
};

export default api;
