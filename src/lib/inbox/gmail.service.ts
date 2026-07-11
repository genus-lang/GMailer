// src/lib/inbox/gmail.service.ts

export const JOB_INBOX_QUERY = `
  (
    subject:interview OR 
    subject:application OR 
    subject:resume OR 
    subject:hiring OR 
    subject:assessment OR 
    subject:"coding round" OR 
    subject:rejected OR 
    subject:offer OR 
    subject:opportunity OR 
    "next steps" OR 
    "schedule"
  )
  -label:promotions 
  -label:social 
  -label:updates
`.replace(/\s+/g, ' ').trim();

/**
 * Helper to get a valid token. Must be run in context where chrome.identity is available (background or popup).
 */
export async function getValidToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!chrome || !chrome.identity) {
      // Mock for development without extension context
      resolve('mock_token');
      return;
    }
    chrome.identity.getAuthToken({ interactive: false }, (token: any) => {
      const runtime = chrome.runtime as any;
      if (runtime.lastError || !token) {
        reject(runtime.lastError || new Error("Failed to get token"));
      } else {
        resolve(token);
      }
    });
  });
}

/**
 * Fetch a list of threads matching the job query.
 */
export async function fetchJobThreads(pageToken?: string, maxResults = 20) {
  const token = await getValidToken();
  if (token === 'mock_token') return { threads: [], nextPageToken: null };

  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/threads');
  url.searchParams.append('q', JOB_INBOX_QUERY);
  url.searchParams.append('maxResults', maxResults.toString());
  if (pageToken) url.searchParams.append('pageToken', pageToken);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch job threads');
  }

  const data = await response.json();
  return {
    threads: data.threads || [],
    nextPageToken: data.nextPageToken || null
  };
}

/**
 * Fetch full details for a specific thread.
 */
export async function fetchThreadDetails(threadId: string) {
  const token = await getValidToken();
  if (token === 'mock_token') return null;

  const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch thread ${threadId}`);
  }

  return response.json();
}

/**
 * Modify thread labels (e.g. mark read/unread, star).
 */
export async function modifyThreadLabels(threadId: string, addLabelIds: string[], removeLabelIds: string[]) {
  const token = await getValidToken();
  if (token === 'mock_token') return;

  const url = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/modify`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ addLabelIds, removeLabelIds })
  });

  if (!response.ok) {
    throw new Error(`Failed to modify thread labels ${threadId}`);
  }
}
