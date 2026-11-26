/**
 * Path parameters that are row ids. A non-UUID id used to reach Postgres,
 * which rejects it ("invalid input syntax for type uuid"), and the route
 * answered 500. Such an id cannot name a row: it is a 404.
 */

import { NextResponse } from "next/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 404 response when `id` is not a UUID, otherwise null.
 * NextResponse so handlers typed `Promise<NextResponse>` can return it too.
 *
 * @param id - the [id] path parameter
 * @returns a 404 response, or null when the id is well-formed
 */
export function invalidIdResponse(id: string): NextResponse | null {
  return UUID.test(id) ? null : NextResponse.json({ error: "Not found" }, { status: 404 });
}

/**
 * Whether a string is a UUID (for ids in query strings and bodies).
 *
 * @param value - the string to check
 * @returns true for a well-formed UUID
 */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
