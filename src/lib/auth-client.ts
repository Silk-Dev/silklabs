import { createAuthClient } from "better-auth/react"

// Official Better Auth client — no manual fetch wrappers.
// baseURL auto-detects from window.location.origin (matches the server's
// BETTER_AUTH_URL / trustedOrigins in both dev and production).
export const authClient = createAuthClient()
