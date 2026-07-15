import type { Database } from "./core/db";
import type { AiRouter } from "./modules/ai/router";
import type { AiProviderId } from "@shared/types";

/** Shared services threaded through IPC handlers and background loops. */
export interface AppContext {
  db: Database;
  router: AiRouter;
  getApiKey: (provider: AiProviderId | string) => string | null;
}
