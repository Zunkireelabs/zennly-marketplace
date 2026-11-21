import { z } from "zod";

/**
 * An id from the studio's booking system (branch, service, org). They are Postgres uuids, but not
 * all are RFC 4122 v1-v5: local and seeded rows use ids like b0000000-0000-0000-0000-000000000001,
 * which zod v4's z.string().uuid() rejects (it enforces version and variant bits). Accept the
 * 8-4-4-4-12 hex shape only. Our own request ids are real v4 uuids and keep z.string().uuid().
 */
export const engineId = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
