import toast from 'react-hot-toast';
import { useCallback } from 'react';

const toastStyle = (accentColor: string): React.CSSProperties => ({
  background: 'var(--toast-bg)',
  color: 'var(--toast-text)',
  fontWeight: '600',
  borderLeft: `3px solid ${accentColor}`,
  borderRadius: '12px',
  padding: '12px 16px',
  boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
})

export function useToast() {
  const success = useCallback((message: string) => {
    return toast.success(message, {
      duration: 4000,
      position: 'top-center',
      style: toastStyle('#10b981'),
      iconTheme: { primary: '#10b981', secondary: 'var(--toast-bg)' },
    });
  }, []);

  const error = useCallback((message: string) => {
    return toast.error(message, {
      duration: 5000,
      position: 'top-center',
      style: toastStyle('#ef4444'),
      iconTheme: { primary: '#ef4444', secondary: 'var(--toast-bg)' },
    });
  }, []);

  const loading = useCallback((message: string) => {
    return toast.loading(message, {
      position: 'top-center',
      style: toastStyle('#94a3b8'),
    });
  }, []);

  const dismiss = useCallback((toastId?: string) => {
    toast.dismiss(toastId);
  }, []);

  const promise = useCallback(<T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => {
    return toast.promise(promise, messages, {
      position: 'top-center',
      style: toastStyle('#94a3b8'),
    });
  }, []);

  return { success, error, loading, dismiss, promise };
}
