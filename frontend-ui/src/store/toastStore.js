import { create } from 'zustand'

let nextId = 1
const timers = new Map()

export const useToastStore = create((set) => ({
  toasts: [],

  // type: 'success' | 'danger' | 'warning' | 'info'
  addToast: (message, type = 'success', duration = 3500) => {
    const id = nextId++
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }))
    const tid = setTimeout(() => {
      timers.delete(id)
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, duration)
    timers.set(id, tid)
  },

  removeToast: (id) => {
    clearTimeout(timers.get(id))
    timers.delete(id)
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
}))
