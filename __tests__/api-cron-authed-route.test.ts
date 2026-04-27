/**
 * Integration tests for POST /api/cron — authenticated paths.
 *
 * The unauth paths (401) are already covered in api-misc-route.test.ts.
 * This file focuses on the success path (200) and the error path (500)
 * which require CRON_SECRET to be defined so the auth gate passes.
 *
 * @/lib/env is mocked to inject a test CRON_SECRET.
 * @/lib/cron is mocked so we can control runAllJobs behaviour without
 * triggering real push-notification jobs.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

vi.mock("@/lib/env", async (orig) => {
  const actual = await orig<typeof import("@/lib/env")>();
  return {
    ...actual,
    serverEnv: { ...actual.serverEnv, CRON_SECRET: "test-cron-secret" },
  };
});

vi.mock("@/lib/cron", async (orig) => {
  const actual = await orig<typeof import("@/lib/cron")>();
  return {
    ...actual,
    runAllJobs: vi.fn().mockResolvedValue([]),
  };
});

import { runAllJobs } from "@/lib/cron";
import { POST } from "@/app/api/cron/route";

const mockRunAllJobs = vi.mocked(runAllJobs);

beforeEach(() => {
  mockRunAllJobs.mockReset();
  mockRunAllJobs.mockResolvedValue([]);
});

function cronReq(token?: string): Request {
  return new Request("http://localhost/api/cron", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

describe("POST /api/cron (authenticated)", () => {
  it("returns 200 with { jobs } when the correct CRON_SECRET is provided", async () => {
    const fakeJobs = [{ name: "testJob", sent: 1, failed: 0, durationMs: 10, skipped: false }];
    mockRunAllJobs.mockResolvedValueOnce(fakeJobs as never);

    const res = await POST(cronReq("test-cron-secret") as never);
    expect(res.status).toBe(200);
    const body = await res.json() as { jobs: unknown[] };
    expect(Array.isArray(body.jobs)).toBe(true);
    expect(body.jobs).toHaveLength(1);
  });

  it("returns 500 when runAllJobs throws an unexpected error", async () => {
    mockRunAllJobs.mockRejectedValueOnce(new Error("dispatcher exploded"));

    const res = await POST(cronReq("test-cron-secret") as never);
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Internal server error");
  });

  it("still returns 401 when the Bearer token does not match CRON_SECRET", async () => {
    const res = await POST(cronReq("wrong-secret") as never);
    expect(res.status).toBe(401);
    expect(mockRunAllJobs).not.toHaveBeenCalled();
  });
});
