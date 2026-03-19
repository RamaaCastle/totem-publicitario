'use client';

// Minimal toaster — can be replaced with a proper library like sonner
import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

let addToast: (toast: Omit<Toast, 'id'>) => void = () => {};

export function toast(message: string, type: 'success' | 'error' = 'success') {
  addToast({ message, type });
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    addToast = ({ message, type }) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white max-w-sm ${
            t.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {t.type === 'success'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />
          }
          <span className="flex-1">{t.message}</span>
          <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}>
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
