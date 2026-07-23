import { ApiService } from './api.service';
import { PlanType } from '../shared/features';

export interface UserData {
  name: string;
  email: string;
  plan: PlanType;
  expiresAt: string | null;
  features: any;
}

// The OAuth client ID from Google Cloud Console (Chrome Extension type)
const GOOGLE_CLIENT_ID = '933580198425-doe4ufalqg4m73qje93h5ckq1ua0o3t3.apps.googleusercontent.com';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'profile',
  'email'
].join(' ');

export const AuthService = {
  async loginWithGoogle(): Promise<{ token: string; plan: PlanType; email?: string; name?: string; picture?: string }> {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.identity) {
        return reject(new Error('Not running in extension environment'));
      }

      // Get the Chrome-managed redirect URL for this extension
      const redirectUrl = chrome.identity.getRedirectURL();

      // Build the Google OAuth URL DIRECTLY — no backend needed for this step!
      // This eliminates the "Authorization page could not be loaded" error caused
      // by the backend being asleep on Render's free tier.
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUrl,
        response_type: 'code',
        scope: GOOGLE_SCOPES,
        access_type: 'offline',
        prompt: 'consent',
      });

      const authUrl = `https://accounts.google.com/o/oauth2/auth?${params.toString()}`;

      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive: true },
        async (responseUrl) => {
          if ((chrome.runtime as any).lastError || !responseUrl) {
            return reject(new Error((chrome.runtime as any).lastError?.message || 'Authentication cancelled by user.'));
          }

          try {
            const url = new URL(responseUrl);
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');

            if (error) {
              throw new Error(`Google OAuth error: ${error}`);
            }

            if (!code) {
              throw new Error('No authorization code received from Google');
            }

            // Exchange the authorization code with the backend for a JWT.
            // The backend calls Google's token endpoint to get access + refresh tokens.
            // This is the ONLY step that requires the backend to be awake.
            const result = await ApiService.post<any>('/auth/google/code', {
              code,
              redirectUri: redirectUrl,
            });

            if (!result?.token) {
              throw new Error('No token returned from server');
            }

            chrome.storage.local.set({ jwtToken: result.token });
            resolve({
              token: result.token,
              plan: result.plan || 'FREE',
              email: result.email,
              name: result.name,
              picture: result.picture,
            });
          } catch (err: any) {
            reject(new Error(err.message));
          }
        }
      );
    });
  },

  async getMe(token: string): Promise<UserData> {
    return await ApiService.get<UserData>('/auth/me', token);
  },

  async logout(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove(['jwtToken']);
    }
  }
};
