import config from './config.js';

const clientId = config.clientId;
const scope = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_NAME = 'MyFolder';

let accessToken = null;
let folderId = null;
let tokenClient = null;

function initializeOAuth() {
    if (!window.google?.accounts?.oauth2) {
        console.error('Google OAuth2 client not loaded');
        return;
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scope,
        callback: async (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                accessToken = tokenResponse.access_token;
                console.log("Access Token obtained");
                
                await checkFolderExists();
                document.getElementById("upload").style.display = "inline";
            } else {
                console.error('Failed to retrieve access token');
            }
        },
        error_callback: (error) => {
            console.error('OAuth error:', error);
        }
    });

    document.getElementById("login").addEventListener("click", () => {
        tokenClient.requestAccessToken();
    });
}


// check if folder exists
async function checkFolderExists() {
    try {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?` +
            `q=name='${encodeURIComponent(FOLDER_NAME)}'` +
            ` and mimeType='application/vnd.google-apps.folder'` +
            ` and trashed=false`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        if (data.files?.length > 0) {
            folderId = data.files[0].id;
            console.log('Folder exists:', folderId);
        } else {
            await createFolder();
        }
    } catch (error) {
        console.error('Folder check failed:', error);
        alert('Please sign in again');
        accessToken = null;
    }
}

// create folder if it doesn't exist
async function createFolder() {
    try {
        const response = await fetch(
            'https://www.googleapis.com/drive/v3/files',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder'
                })
            }
        );

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        folderId = data.id;
        console.log('Folder created:', folderId);
    } catch (error) {
        console.error('Folder creation failed:', error);
        throw error;
    }
}

// handles file upload
async function uploadFile() {
    if (!accessToken) {
        alert('Please sign in first');
        return;
    }

    if (!folderId) {
        alert('Folder not ready yet');
        return;
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const metadata = {
            name: file.name,
            parents: [folderId]
        };

        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('file', file);

        try {
            const response = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: formData
                }
            );

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('Upload successful:', data);
            alert(`File uploaded: ${data.name}`);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please try again.');
        }
    };

    fileInput.click();
}

document.addEventListener('DOMContentLoaded', () => {

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
        setTimeout(initializeOAuth, 100);
    };
    document.head.appendChild(script);

    document.getElementById('upload').addEventListener('click', uploadFile);
});
