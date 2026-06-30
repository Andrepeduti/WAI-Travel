import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { supabase } from "../supabase/client";
import { getRedirectUrl } from '../../lib/utils';

type OAuthProvider = "google" | "apple";

interface SignInResult {
  error?: Error | null;
  redirected?: boolean;
}

// Inicializa o GoogleAuth na web (no mobile é inicializado via capacitor.config.ts)
if (!Capacitor.isNativePlatform()) {
  GoogleAuth.initialize({
    clientId: 'SEU_WEB_CLIENT_ID_AQUI.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
}

async function signInWithOAuth(
  provider: OAuthProvider,
  opts?: { redirect_uri?: string }
): Promise<SignInResult> {
  try {
    if (Capacitor.isNativePlatform()) {
      // ==========================================
      // FLUXO NATIVO MOBILE (iOS / Android)
      // ==========================================
      if (provider === 'google') {
        const googleUser = await GoogleAuth.signIn();
        if (googleUser.authentication.idToken) {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: googleUser.authentication.idToken,
          });
          if (error) return { error };
          return { redirected: false };
        } else {
          return { error: new Error('Não foi possível obter o ID Token do Google') };
        }
      } 
      
      if (provider === 'apple') {
        const appleUser = await SignInWithApple.authorize({
          clientId: 'com.waitravel.app', // Ajuste caso seu Service ID no Supabase seja diferente
          redirectURI: opts?.redirect_uri ?? 'https://waitravel.com/login', // Fallback
          scopes: 'email name',
        });
        
        if (appleUser.response && appleUser.response.identityToken) {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: appleUser.response.identityToken,
          });
          if (error) return { error };
          return { redirected: false };
        } else {
          return { error: new Error('Não foi possível obter o Identity Token da Apple') };
        }
      }
    }

    // ==========================================
    // FLUXO WEB BROWSER / PWA (OAuth Tradicional)
    // ==========================================
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // Fallback usando a função que resolve para com.waitravel.app://login no mobile, 
        // ou URL web caso contrário
        redirectTo: opts?.redirect_uri ?? getRedirectUrl('login'),
      },
    });

    if (error) {
      return { error };
    }

    if (data?.url) {
      return { redirected: true };
    }

    return {};
  } catch (err: any) {
    return { error: err };
  }
}

export async function signInWithGoogle(redirectUri?: string): Promise<SignInResult> {
  return signInWithOAuth("google", { redirect_uri: redirectUri });
}

export async function signInWithApple(redirectUri?: string): Promise<SignInResult> {
  return signInWithOAuth("apple", { redirect_uri: redirectUri });
}

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: OAuthProvider,
      opts?: { redirect_uri?: string }
    ) => signInWithOAuth(provider, opts),
  },
};
