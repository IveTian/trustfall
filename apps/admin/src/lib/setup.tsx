import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api.ts';

type SetupState = {
  /** `null` while the initial check is still in flight. */
  initialized: boolean | null;
  /** Flips the cached answer once the owner account exists, without a refetch. */
  markInitialized: () => void;
};

const SetupContext = createContext<SetupState>({
  initialized: null,
  markInitialized: () => {},
});

/**
 * Holds the setup answer above the router so finishing setup can update it in
 * place. Reading it inside the route element would reset the answer on every
 * navigation and bounce a fresh owner back to the setup form.
 */
export function SetupProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState<boolean | null>(null);

  useEffect(() => {
    void api<{ initialized: boolean }>('/api/setup')
      .then((result) => setInitialized(result.initialized))
      .catch(() => setInitialized(false));
  }, []);

  const value = useMemo<SetupState>(
    () => ({ initialized, markInitialized: () => setInitialized(true) }),
    [initialized],
  );

  return <SetupContext value={value}>{children}</SetupContext>;
}

export function useSetup() {
  return useContext(SetupContext);
}
