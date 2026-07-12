import { ApiService } from './api.service';
import { PlanType } from '../shared/features';

export interface UserData {
  name: string;
  email: string;
  plan: PlanType;
  expiresAt: string | null;
  features: any;
}

export const AuthService = {
  async loginWithGoogle(): Promise<{ token: string; plan: PlanType; email?: string; name?: string; picture?: string }> {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.identity) {
         return reject(new Error('Not running in extension environment'));
      }

      const redirectUrl = chrome.identity.getRedirectURL(); // e.g., https://<id>.chromiumapp.org/
      const authUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/google?ext=${encodeURIComponent(redirectUrl)}`;

      chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      }, async (responseUrl) => {
        if ((chrome.runtime as any).lastError || !responseUrl) {
          return reject(new Error((chrome.runtime as any).lastError?.message || 'Authentication cancelled by user.'));
        }

        try {
          const url = new URL(responseUrl);
          const jwtToken = url.searchParams.get('token');
          
          if (!jwtToken) {
            throw new Error('No token found in response');
          }

          chrome.storage.local.set({ jwtToken });

          try {
            const userData = await ApiService.get<UserData>('/auth/me', jwtToken);
            resolve({ token: jwtToken, plan: userData.plan || 'FREE', email: userData.email });
          } catch (e) {
            resolve({ token: jwtToken, plan: 'FREE', email: 'user@gmail.com' });
          }
        } catch (err: any) {
          reject(new Error(err.message));
        }
      });
    });
  },

  async getMe(token: string): Promise<UserData> {
    return await ApiService.get<UserData>('/me', token);
  },

  async logout(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove(['jwtToken']);
    }
    // Optional: ApiService.post('/logout')
  }
};
