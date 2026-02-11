import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "https://full-stack-chat-app-2-backend.onrender.com/api",
  withCredentials: true,
});
