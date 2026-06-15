import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import axios from 'axios'
import { isEmpty } from 'lodash'
import emptyDish from '@/assets/emptyplate.jpg'
import plateFork from '@/assets/platefork.png'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
})

export const apiUrl = import.meta.env.VITE_SERVER_URL

export const mediaUrl = import.meta.env.VITE_MEDIA_URL

axiosInstance.interceptors.request.use(
  (config) => {
    // If you want to add token or modify headers globally
    const user = localStorage.getItem('saucy-user-token')
    const lang = localStorage.getItem('i18nextLng')

    if (user) {
      config.headers.Authorization = `Bearer ${user}`
      // config.url = `${config.url}?lang=${lang}`
      config.headers['lang'] = lang || 'en-GB'
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

export const renderMediaUrl = (path: string, type?: 'menuItem') => {
  if (!path || isEmpty(path)) return type === 'menuItem' ? emptyDish : plateFork
  if (path.startsWith('http')) return path

  return mediaUrl + path
}
