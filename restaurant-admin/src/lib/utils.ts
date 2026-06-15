import axios from "axios";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import emptyDish from "@/assets/emptydish.jpg";
import emptyDrink from "@/assets/generic-drink.jpg";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_SERVER_URL,
});



axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const lang = localStorage.getItem("i18nextLng");
    config.headers['lang'] = lang;
    config.withCredentials = true
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const mediaUrl = import.meta.env.VITE_APP_MEDIA_URL;

export const renderMediaUrl = (path: string, type?: string) => {
  if (!path) return type === "drink" ? emptyDrink : emptyDish;
  if (path.startsWith("http")) return path;

  return mediaUrl + path;
};