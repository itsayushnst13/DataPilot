import axios from "axios";
export const api = axios.create({ baseURL: "/api/v1", timeout: 20000 });
api.interceptors.request.use(config => {
  const token = localStorage.getItem("datapilot_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const unwrap = response => response.data.data;
