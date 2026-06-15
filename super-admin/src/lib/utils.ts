import { clsx, type ClassValue } from "clsx";
import axios from "axios";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_SERVER_URL,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || (localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user") || "{}")?.token : null);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.withCredentials = true
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const curerntMonthData = new Date()


export const allMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]