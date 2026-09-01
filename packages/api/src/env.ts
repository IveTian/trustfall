/**
 * The Worker environment. Bindings come from `wrangler types` (generated into
 * worker-configuration.d.ts from wrangler.jsonc); secrets and vars come from the
 * root env.d.ts. Adding a binding means editing wrangler.jsonc, nothing else.
 */
export type AppBindings = Env;

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
