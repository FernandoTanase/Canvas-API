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
    let uploadedFileUrl = null; // Variable to store the file URL

    // Load saved settings
    chrome.storage.sync.get(['apiToken', 'canvasDomain'], function(items) {
        if (items.apiToken && items.canvasDomain) {
            apiTokenInput.value = items.apiToken;
            canvasDomainInput.value = items.canvasDomain;
            initializeApi(items.canvasDomain, items.apiToken);
        }
    });

    // Save settings
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

    // Initialize the API and load courses
    function initializeApi(domain, token) {
        canvasApi = new window.CanvasAPI(domain, token);
        loadCourses();
    }

    // Load courses from Canvas
    async function loadCourses() {
        if (!canvasApi) return;
        
        try {
            showStatus('Loading courses...', 'info');
            const courses = await canvasApi.getCourses();
            
            // Clear existing options except the first one
            while (courseSelect.options.length > 1) {
                courseSelect.remove(1);
            }
            
            // Add courses to dropdown
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

    // Enable/disable upload button based on selections
    function updateUploadButtonState() {
        uploadButton.disabled = !courseSelect.value || !fileInput.files.length;
    }

    courseSelect.addEventListener('change', updateUploadButtonState);
    fileInput.addEventListener('change', updateUploadButtonState);

    // Show image preview when a file is selected
    fileInput.addEventListener('change', function() {
        const file = fileInput.files[0];
        if (file && file.type.startsWith('image/')) {
            const imageUrl = URL.createObjectURL(file);
            uploadedImage.src = imageUrl;
            uploadedImage.style.display = 'block'; // Show the image preview
        } else {
            uploadedImage.style.display = 'none'; // Hide the image preview if not an image
        }
    });

    // Tab functionality
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const target = button.getAttribute('data-tab');
    
            // Set tab content
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById(target).classList.add('active');
    
            // Set tab button active
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    // Handle file upload
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
            fileInput.value = ''; // Clear file input
            updateUploadButtonState();

            // Store the file URL (do not display it yet)
            if (file.type.startsWith('image/')) {
                uploadedFileUrl = URL.createObjectURL(file);
            }
    
        } catch (error) {
            console.error('Upload error:', error);
            showStatus('Upload failed: ' + error.message, 'error');
            uploadButton.disabled = false;
        }
    });

    // Display image in the View Photo tab when clicked
    document.querySelector('[data-tab="view-tab"]').addEventListener('click', function() {
        if (uploadedFileUrl) {
            uploadedImage.src = uploadedFileUrl; // Show the uploaded image
            uploadedImage.style.display = 'block'; // Make sure it is visible
        }
    });

    // Display status messages
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = type || '';
    }

    closeButton.addEventListener('click', function() {
        window.close();
    });
});
