import axios from "axios";

const client = axios.create({
  baseURL: "https://teeth.ddaily.ru/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const saveAccessToken = (access_token) => {
  localStorage.setItem("access_token", access_token);
};

export const removeAccessToken = () => {
  localStorage.removeItem("access_token");
};

export const getAccessToken = () => {
  return localStorage.getItem("access_token");
};

client.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const login = async (username, password) => {
  const { data } = await client.post("/login", {
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
  const { data } = await client.get("/user");
  return data;
};

export const getUsers = async () => {
  const { data } = await client.get("/users");
  return data;
};

export const createUser = async (userData) => {
  const { data } = await client.post("/users", userData);
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
  const { data } = await client.post("/detect", {
    image,
    jaw_type: jawType,
  });
  return data;
};

export const exportImage = async (image, detections) => {
  const { data } = await client.post("/export", {
    image,
    detections,
  });
  return data;
};
