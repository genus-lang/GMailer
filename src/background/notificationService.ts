/**
 * Chrome Notification Service
 * Abstraction over chrome.notifications API
 */

export type NotificationType = 'basic' | 'image' | 'list' | 'progress';

export interface NotificationOptions {
  type?: NotificationType;
  iconUrl?: string;
  title: string;
  message: string;
  contextMessage?: string;
  buttons?: { title: string; iconUrl?: string }[];
  requireInteraction?: boolean;
}

export async function showNotification(id: string, options: NotificationOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.notifications) {
      console.warn('Notifications API not available', options);
      resolve(id);
      return;
    }

    const defaultIcon = 'icon.png'; // Make sure this exists in public/

    const createOptions: chrome.notifications.NotificationOptions = {
      type: options.type || 'basic',
      iconUrl: options.iconUrl || defaultIcon,
      title: options.title,
      message: options.message,
      contextMessage: options.contextMessage,
      requireInteraction: options.requireInteraction,
      buttons: options.buttons as any, // TS mismatch with chrome types
    };

    chrome.notifications.create(id, createOptions, (createdId) => {
      const runtime = chrome.runtime as any;
      const lastError = runtime.lastError;
      if (lastError) {
        console.error('Notification Error', lastError);
        reject(lastError);
      } else {
        resolve(createdId);
      }
    });
  });
}
