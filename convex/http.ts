import { httpRouter } from "convex/server";
import { buildRouter } from "./gateway";

// The entire HTTP contract is built from the operation registry (packages/contract). To add an
// endpoint: add a registry op (+ its port adapter method, or a gateway handler) — not here.
const router = httpRouter();
buildRouter(router);
export default router;
