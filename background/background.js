// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'canvasApiRequest') {
        // For potential future cross-origin requests that need background handling
        fetch(message.url, message.options)
            .then(response => response.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        
        return true; // Required for async sendResponse
    }
});