import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const saveAccessToken = (access_token) => {
  localStorage.setItem('access_token', access_token);
};

export const removeAccessToken = () => {
  localStorage.removeItem('access_token');
};

export const getAccessToken = () => {
  return localStorage.getItem('access_token');
};

client.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export const login = async (username, password) => {
  const { data } = await client.post('/login', {
    username,
    password,
  });

  saveAccessToken(data.access_token);
  return data.user;
};

export const logout = () => {
  removeAccessToken();
};

export const getUser = async () => {
  const { data } = await client.get('/user');
  return data;
};

export const getUsers = async () => {
  const { data } = await client.get('/users');
  return data;
};

export const createUser = async (userData) => {
  const { data } = await client.post('/users', userData);
  return data;
};

export const updateUser = async (userId, userData) => {
  const { data } = await client.post(`/users/${userId}`, userData);
  return data;
};

export const deleteUser = async (userId) => {
  await client.delete(`/users/${userId}`);
};

export const detectTeeth = async (image, jawType) => {
  const { data } = await client.post('/detect', {
    image,
    jaw_type: jawType,
  });
  return data;
};

export const exportImage = async (image, detections) => {
  const { data } = await client.post('/export', {
    image,
    detections,
  });
  return data;
};

export const createCollage = async (before, after) => {
  const { data } = await client.post('/images/collage', { before, after });
  return data;
};

export const prepareCollage = async (before, after, autoAlign = true) => {
  const { data } = await client.post('/images/prepare', { before, after, auto_align: autoAlign });
  return data;
};

export const getLabelTypes = async () => {
  const { data } = await client.get('/label-types');
  return data;
};

export const createLabelType = async (labelData) => {
  const { data } = await client.post('/label-types', labelData);
  return data;
};

export const updateLabelType = async (labelId, labelData) => {
  const { data } = await client.post(`/label-types/${labelId}`, labelData);
  return data;
};

export const deleteLabelType = async (labelId) => {
  await client.delete(`/label-types/${labelId}`);
};

export const listCollageCases = async (offset = 0, mode = 'website', source_case_id) =>
  (await client.get('/images/cases', { params: { offset, limit: 24, mode, source_case_id } })).data;
export const getCollageCase = async (id) => (await client.get(`/images/cases/${id}`)).data;
export const saveCollageCase = async (id, payload) =>
  (await (id ? client.put(`/images/cases/${id}`, payload) : client.post('/images/cases', payload)))
    .data;
export const getCollageDraft = async (mode = 'website') =>
  (await client.get('/images/draft', { params: { mode } })).data;
export const saveCollageDraft = async (state) => (await client.put('/images/draft', state)).data;
