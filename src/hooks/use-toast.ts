"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createContext, useContext }                 from "react";

// ── Toast types ───────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "warning" | "info" | "loading";

export interface ToastItem {
  id:        string;
  title:     string;
  body?:     string;
  variant:   ToastVariant;
  duration?: number;           // ms; 0 = persistent
  action?:   { label: string; onClick: () => void };
  onDismiss?: () => void;
}

type ToastInput = Omit<ToastItem, "id">;

// ── Global toast state (singleton) ───────────────────────────────

type Listener = (toasts: ToastItem[]) => void;

class ToastStore {
  private toasts:    ToastItem[] = [];
  private listeners: Set<Listener> = new Set();
  private timers:    Map<string, ReturnType<typeof setTimeout>> = new Map();

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private emit() {
    this.listeners.forEach((fn) => fn([...this.toasts]));
  }

  add(input: ToastInput): string {
    const id = Math.random().toString(36).slice(2, 9);
    const toast: ToastItem = { id, duration: 4000, ...input };
    this.toasts = [toast, ...this.toasts].slice(0, 5);
    this.emit();

    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => this.remove(id), toast.duration);
      this.timers.set(id, timer);
    }

    return id;
  }

  remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    const timer = this.timers.get(id);
    if (timer) { clearTimeout(timer); this.timers.delete(id); }
    this.emit();
  }

  update(id: string, patch: Partial<ToastItem>) {
    this.toasts = this.toasts.map((t) => t.id === id ? { ...t, ...patch } : t);
    this.emit();
  }

  getAll(): ToastItem[] { return [...this.toasts]; }
}

export const toastStore = new ToastStore();

// ── Public API ────────────────────────────────────────────────────

export const toast = {
  success: (title: string, opts?: Partial<ToastInput>) =>
    toastStore.add({ title, variant: "success", ...opts }),
  error:   (title: string, opts?: Partial<ToastInput>) =>
    toastStore.add({ title, variant: "error", duration: 6000, ...opts }),
  warning: (title: string, opts?: Partial<ToastInput>) =>
    toastStore.add({ title, variant: "warning", ...opts }),
  info:    (title: string, opts?: Partial<ToastInput>) =>
    toastStore.add({ title, variant: "info", ...opts }),
  loading: (title: string, opts?: Partial<ToastInput>) =>
    toastStore.add({ title, variant: "loading", duration: 0, ...opts }),
  dismiss: (id: string) => toastStore.remove(id),
  update:  (id: string, patch: Partial<ToastItem>) => toastStore.update(id, patch),
  promise: async <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string | ((data: T) => string); error: string | ((err: unknown) => string) },
  ): Promise<T> => {
    const id = toast.loading(messages.loading);
    try {
      const data = await promise;
      const successMsg = typeof messages.success === "function" ? messages.success(data) : messages.success;
      toastStore.update(id, { title: successMsg, variant: "success", duration: 4000 });
      setTimeout(() => toastStore.remove(id), 4000);
      return data;
    } catch (err) {
      const errMsg = typeof messages.error === "function" ? messages.error(err) : messages.error;
      toastStore.update(id, { title: errMsg, variant: "error", duration: 6000 });
      setTimeout(() => toastStore.remove(id), 6000);
      throw err;
    }
  },
};

// ── React hook ────────────────────────────────────────────────────

export function useToastState() {
  const [items, setItems] = useState<ToastItem[]>(() => toastStore.getAll());

  useEffect(() => {
    return toastStore.subscribe(setItems);
  }, []);

  return items;
}