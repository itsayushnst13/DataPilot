import axios from "axios";
export const api = axios.create({ baseURL: "/api/v1", timeout: 20000, withCredentials: true });
export const unwrap = response => response.data.data;
