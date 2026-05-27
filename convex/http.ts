import { httpRouter } from "convex/server";
import { buildRouter } from "./gateway";
import { handlers } from "./handlers";

// The entire HTTP contract is built from the typed operation registry (@soma/contract) + the
// typed handler map. To add an endpoint: add a registry entry and a handler — not here.
const router = httpRouter();
buildRouter(router, handlers);
export default router;
