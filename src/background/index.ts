// GMailer Background Service Worker (Thin Client)

chrome.runtime.onInstalled.addListener(() => {
  console.log("GMailer Extension Installed");
});

const action = (chrome as any).action || (chrome as any).browserAction;

if (action) {
  action.onClicked.addListener(() => {
    chrome.tabs.create({ url: "index.html" });
  });
}

// Listen for messages from the React UI
chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
  // We keep GET_AUTH_TOKEN in case the UI still uses chrome.identity for any frontend-only Google integrations,
  // but primary auth is now handled by the backend.
  if (request.type === "GET_AUTH_TOKEN") {
    chrome.identity.getAuthToken({ interactive: request.interactive }, function (token) {
      const runtime = chrome.runtime as any;
      if (runtime.lastError || !token) {
        console.error("Auth Error:", JSON.stringify(runtime.lastError));
        sendResponse({ success: false, error: runtime.lastError?.message || 'Failed to get token' });
        return;
      }
      
      fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(userInfo => {
        sendResponse({ success: true, token, userInfo });
      })
      .catch(err => {
        sendResponse({ success: true, token, error: "Could not fetch user info" });
      });
    });
    
    return true; 
  }
});
