import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Toast message that clears itself. The design-system Toast renders whatever
 * message it is handed for as long as it is non-null; the timing policy is an
 * app concern, so it lives here.
 */
export function useToast(): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((next: string) => {
    clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), 4000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return [message, show];
}
