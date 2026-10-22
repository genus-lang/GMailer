// GMailer Background Service Worker (Thin Client)

const BACKEND_URL = 'https://gmailer-3zlj.onrender.com';

chrome.runtime.onInstalled.addListener(() => {
  console.log("GMailer Extension Installed");
  // Set up keep-alive alarm to prevent Render backend from sleeping
  chrome.alarms.create('keepAlive', { periodInMinutes: 14 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('keepAlive', { periodInMinutes: 14 });
});

// Ping the backend every 14 minutes to keep it warm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    fetch(`${BACKEND_URL}/`).catch(() => {
      // Silently ignore - this is just a keep-alive ping
    });
  }
});

// Open the extension's full-page UI when the toolbar icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});

// Listen for messages from the React UI
chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: any) => {
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
