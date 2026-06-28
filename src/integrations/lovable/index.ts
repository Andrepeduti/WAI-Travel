/**
 * OAuth integration using native Supabase Auth.
 * Replaces the previous @lovable.dev/cloud-auth-js dependency.
 */
import { supabase } from "../supabase/client";

type OAuthProvider = "google" | "apple";

interface SignInResult {
  error?: Error | null;
  redirected?: boolean;
}

async function signInWithOAuth(
  provider: OAuthProvider,
  opts?: { redirect_uri?: string }
): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: opts?.redirect_uri ?? `${window.location.origin}/login`,
    },
  });

  if (error) {
    return { error };
  }

  // Supabase OAuth always redirects the browser to the provider's consent page.
  // If `data.url` is returned, the redirect is about to happen.
  if (data?.url) {
    return { redirected: true };
  }

  return {};
}

export async function signInWithGoogle(redirectUri?: string): Promise<SignInResult> {
  return signInWithOAuth("google", { redirect_uri: redirectUri });
}

export async function signInWithApple(redirectUri?: string): Promise<SignInResult> {
  return signInWithOAuth("apple", { redirect_uri: redirectUri });
}

// Backward-compatible export that matches the old `lovable` object shape
// so AuthFlow.tsx can keep using `lovable.auth.signInWithOAuth(...)`.
export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: OAuthProvider,
      opts?: { redirect_uri?: string }
    ) => signInWithOAuth(provider, opts),
  },
};
