// === popup.js ===
document.addEventListener('DOMContentLoaded', function() {
    const closeButton = document.getElementById('close-button');
    const saveSettingsButton = document.getElementById('save-settings');
    const apiTokenInput = document.getElementById('api-token');
    const canvasDomainInput = document.getElementById('canvas-domain');
    const courseSelect = document.getElementById('course-select');
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    const statusMessage = document.getElementById('status-message');
    const uploadedImage = document.getElementById('uploaded-image');

    let canvasApi = null;
    let uploadedFile = null; 

    chrome.storage.sync.get(['apiToken', 'canvasDomain'], function(items) {
        if (items.apiToken && items.canvasDomain) {
            apiTokenInput.value = items.apiToken;
            canvasDomainInput.value = items.canvasDomain;
            initializeApi(items.canvasDomain, items.apiToken);
        }
    });

    saveSettingsButton.addEventListener('click', function() {
        const apiToken = apiTokenInput.value.trim();
        const canvasDomain = canvasDomainInput.value.trim();

        if (!apiToken || !canvasDomain) {
            showStatus('Please enter both API token and Canvas domain', 'error');
            return;
        }

        chrome.storage.sync.set({
            apiToken: apiToken,
            canvasDomain: canvasDomain
        }, function() {
            showStatus('Settings saved!', 'success');
            initializeApi(canvasDomain, apiToken);
        });
    });

    function initializeApi(domain, token) {
        canvasApi = new window.CanvasAPI(domain, token);
        loadCourses();
    }

    async function loadCourses() {
        if (!canvasApi) return;
        try {
            showStatus('Loading courses...', 'info');
            const courses = await canvasApi.getCourses();
            while (courseSelect.options.length > 1) {
                courseSelect.remove(1);
            }
            courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = course.name;
                courseSelect.appendChild(option);
            });
            showStatus('Courses loaded successfully', 'success');
        } catch (error) {
            console.error('Error loading courses:', error);
            showStatus('Failed to load courses. Please check your API credentials.', 'error');
        }
    }

    function updateUploadButtonState() {
        uploadButton.disabled = !courseSelect.value || !fileInput.files.length;
    }

    courseSelect.addEventListener('change', updateUploadButtonState);
    fileInput.addEventListener('change', updateUploadButtonState);

    fileInput.addEventListener('change', function() {
        const file = fileInput.files[0];
        if (file && file.type.startsWith('image/')) {
            const imageUrl = URL.createObjectURL(file);
            uploadedImage.src = imageUrl;
            uploadedImage.style.display = 'block';
        } else {
            uploadedImage.style.display = 'none';
        }
    });

    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const target = button.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    uploadButton.addEventListener('click', async function() {
        if (!canvasApi) {
            showStatus('Please set up API credentials first', 'error');
            return;
        }

        const courseId = courseSelect.value;
        const file = fileInput.files[0];

        if (!courseId || !file) {
            showStatus('Please select a course and a file', 'error');
            return;
        }

        try {
            uploadButton.disabled = true;
            showStatus('Uploading file...', 'info');

            const result = await canvasApi.uploadFile(courseId, file, (progress) => {
                showStatus(`Uploading: ${Math.round(progress)}%`, 'info');
            });

            showStatus('File uploaded successfully!', 'success');
            fileInput.value = '';
            updateUploadButtonState();
            uploadedFile = file;

            if (document.getElementById('share-point').checked) {
                showStatus('Also uploading to SharePoint...', 'info');
                try {
                    const folderName = document.getElementById("folder-name").value.trim() || "SharedFromCanvas";
                    const sharepointAccessToken = await getSharePointAccessToken();
                    const driveId = await getSharePointDriveId(sharepointAccessToken);
                    await createSharePointFolderIfNotExists(driveId, folderName, sharepointAccessToken);
                    await uploadFileToSharePoint(driveId, folderName, uploadedFile, sharepointAccessToken);
                    showStatus('✅ Also uploaded to SharePoint!', 'success');
                } catch (err) {
                    console.error("SharePoint Upload Failed:", err);
                    showStatus("SharePoint upload failed", "error");
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            showStatus('Upload failed: ' + error.message, 'error');
            uploadButton.disabled = false;
        }
    });

    const viewTabContent = document.getElementById('view-tab-content');
    fileInput.addEventListener('change', function (event) {
        uploadedFile = event.target.files[0];
        viewTabContent.innerHTML = '<h2>Uploaded File</h2>';
        if (!uploadedFile) {
            viewTabContent.innerHTML += '<p>No file has been uploaded yet.</p>';
            return;
        }
        const fileType = uploadedFile.type;
        if (fileType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(uploadedFile);
            img.alt = uploadedFile.name;
            img.style.maxWidth = '100%';
            viewTabContent.appendChild(img);
        } else if (uploadedFile.name.toLowerCase().endsWith('.pdf')) {
            const obj = document.createElement('object');
            obj.data = URL.createObjectURL(uploadedFile);
            obj.type = 'application/pdf';
            obj.width = '100%';
            obj.height = '500px';
            viewTabContent.appendChild(obj);
        } else if (fileType.startsWith('video/')) {
            const video = document.createElement('video');
            video.controls = true;
            video.width = 320;
            video.height = 240;
            video.src = URL.createObjectURL(uploadedFile);
            viewTabContent.appendChild(video);
        } else {
            viewTabContent.innerHTML += '<p>Preview not available for this file type.</p>';
        }
    });

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = type || '';
    }

    closeButton.addEventListener('click', function() {
        window.close();
    });
});

// === SharePoint Helper Functions ===

async function getSharePointAccessToken() {
    const msalConfig = {
        auth: {
            clientId: "42d4bf53-30f7-4522-ba5e-83a5dff792d6",
            authority: "https://login.microsoftonline.com/2b30530b-69b6-4457-b818-481cb53d42ae"
        }
    };
    const msalInstance = new msal.PublicClientApplication(msalConfig);
    const loginResponse = await msalInstance.loginPopup({
        scopes: ["Sites.ReadWrite.All", "Files.ReadWrite.All"]
    });
    const tokenResponse = await msalInstance.acquireTokenSilent({
        scopes: ["Sites.ReadWrite.All", "Files.ReadWrite.All"],
        account: loginResponse.account
    });
    return tokenResponse.accessToken;
}

async function getSharePointDriveId(token) {
    const siteResp = await fetch("https://graph.microsoft.com/v1.0/sites/luky.sharepoint.com:/sites/CS498T1", {
        headers: { Authorization: `Bearer ${token}` }
    });
    const siteId = (await siteResp.json()).id;

    const driveResp = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drive`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return (await driveResp.json()).id;
}

async function createSharePointFolderIfNotExists(driveId, folderName, token) {
    await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: folderName,
            folder: {},
            "@microsoft.graph.conflictBehavior": "replace"
        })
    });
}

async function uploadFileToSharePoint(driveId, folderName, file, token) {
    const uploadUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${encodeURIComponent(folderName + "/" + file.name)}:/content`;
    await fetch(uploadUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: file
    });
}