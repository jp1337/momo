/**
 * Zod schemas for the WebAuthn / Passkey API surface.
 *
 * Kept in a dedicated file because the `RegistrationResponseJSON` and
 * `AuthenticationResponseJSON` shapes defined by @simplewebauthn are a bit
 * bulky and we don't want to pollute `lib/validators/index.ts` with them.
 *
 * The schemas are deliberately permissive on the WebAuthn response shape —
 * detailed signature verification is the job of
 * `@simplewebauthn/server::verifyRegistrationResponse` /
 * `verifyAuthenticationResponse`. Zod's job here is only to reject
 * obviously malformed JSON before it reaches the verifier.
 */

import { z } from "zod";

/** base64url-shaped string (letters, digits, -, _). */
const base64url = z
  .string()
  .min(1)
  .max(10_000)
  .regex(/^[A-Za-z0-9_-]*$/, "Must be base64url");

/** Transport values accepted by WebAuthn — mirrors `AuthenticatorTransportFuture`. */
const TransportSchema = z.enum([
  "ble",
  "cable",
  "hybrid",
  "internal",
  "nfc",
  "smart-card",
  "usb",
]);

/** Shape of `RegistrationResponseJSON.response` from the browser. */
const AuthenticatorAttestationResponseJSONSchema = z
  .object({
    clientDataJSON: base64url,
    attestationObject: base64url,
    transports: z.array(TransportSchema).max(16).optional(),
    authenticatorData: base64url.optional(),
    publicKey: base64url.optional(),
    publicKeyAlgorithm: z.number().optional(),
  })
  .passthrough();

/** Shape of `AuthenticationResponseJSON.response` from the browser. */
const AuthenticatorAssertionResponseJSONSchema = z
  .object({
    clientDataJSON: base64url,
    authenticatorData: base64url,
    signature: base64url,
    userHandle: base64url.optional(),
  })
  .passthrough();

const ClientExtensionResultsSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .default({});

/** Full `RegistrationResponseJSON` with the Momo display-name on top. */
export const RegistrationVerifyInputSchema = z.object({
  /** User-supplied display label (may be empty — then stored as null). */
  name: z.string().trim().max(80).optional().nullable(),
  response: z
    .object({
      id: base64url,
      rawId: base64url,
      type: z.literal("public-key"),
      response: AuthenticatorAttestationResponseJSONSchema,
      authenticatorAttachment: z
        .enum(["platform", "cross-platform"])
        .optional(),
      clientExtensionResults: ClientExtensionResultsSchema,
    })
    .passthrough(),
});

export type RegistrationVerifyInput = z.infer<
  typeof RegistrationVerifyInputSchema
>;

/** Full `AuthenticationResponseJSON`. */
export const AuthenticationVerifyInputSchema = z.object({
  response: z
    .object({
      id: base64url,
      rawId: base64url,
      type: z.literal("public-key"),
      response: AuthenticatorAssertionResponseJSONSchema,
      authenticatorAttachment: z
        .enum(["platform", "cross-platform"])
        .optional(),
      clientExtensionResults: ClientExtensionResultsSchema,
    })
    .passthrough(),
});

export type AuthenticationVerifyInput = z.infer<
  typeof AuthenticationVerifyInputSchema
>;

/** Body for PATCH /api/auth/passkey/[id] — rename a credential. */
export const RenamePasskeyInputSchema = z.object({
  name: z.string().trim().min(1, "Name must not be empty").max(80),
});

export type RenamePasskeyInput = z.infer<typeof RenamePasskeyInputSchema>;
