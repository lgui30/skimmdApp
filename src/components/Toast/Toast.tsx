import { useEffect, useState } from "react";

interface ToastItem {
  id: string;
  message: string;
}

let addToast: (message: string) => void = () => {};

export function toast(message: string) {
  addToast(message);
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    addToast = (message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2000);
    };
    return () => {
      addToast = () => {};
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.message}
        </div>
      ))}
    </div>
  );
}
