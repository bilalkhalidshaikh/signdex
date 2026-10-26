export type ToastVariant = "success" | "error" | "info" | "signal";

export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

type Listener = (t: ToastMessage) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function toast(t: Omit<ToastMessage, "id" | "variant"> & { variant?: ToastVariant }) {
  const message: ToastMessage = { id: ++counter, variant: "info", ...t };
  listeners.forEach((l) => l(message));
}

export function subscribeToasts(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
