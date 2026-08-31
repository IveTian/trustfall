export type AppBindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
};

export type SessionPayload = {
  user: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
  };
  session: {
    id: string;
    userId: string;
  };
};

export type AppEnv = {
  Bindings: AppBindings;
  Variables: {
    session: SessionPayload | null;
  };
};
