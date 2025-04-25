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

            // Store the file
            uploadedFile = file;
    
        } catch (error) {
            console.error('Upload error:', error);
            showStatus('Upload failed: ' + error.message, 'error');
            uploadButton.disabled = false;
        }
    });

    // Display File preview in the View File tab 
    const viewTabContent = document.getElementById('view-tab-content');
    
    fileInput.addEventListener('change', function (event) {
      uploadedFile = event.target.files[0];
    
      // Clear previous preview
      viewTabContent.innerHTML = '<h2>Uploaded File</h2>';
    
      if(!uploadedFile) { //check if a file has been uploaded
        viewTabContent.innerHTML += '<p>No file has been uploaded yet.</p>';
        return;
      }
    
      const fileType = uploadedFile.type; //get type of uploaded file
    
      if(fileType.startsWith('image/')) { //images
        const img = document.createElement('img'); //create element in memory
        img.src = URL.createObjectURL(uploadedFile); //set source to temp. local URL of uploaded file
        img.alt = uploadedFile.name; //alt. text if image cannot/does not load
        img.style.maxWidth = '100%'; //size image for container
        viewTabContent.appendChild(img); //add image to page(i.e. display it in extension)
    
      }
       else if(uploadedFile.name.toLowerCase().endsWith('.pdf')) { //pdfs
        const obj = document.createElement('object');
        obj.data = URL.createObjectURL(uploadedFile);
        obj.type = 'application/pdf'; //specify object type for browser viewer
        obj.width = '100%';
        obj.height = '500px'; 
        viewTabContent.appendChild(obj);
    
      } 
      else if(fileType.startsWith('video/')) { //videos
        const video = document.createElement('video');
        video.controls = true; //enable playback controls 
        video.width = 320;
        video.height = 240;
        video.src = URL.createObjectURL(uploadedFile);
        viewTabContent.appendChild(video);
    
      } 
      else { //file type not compatible with browser viewer, preview not available
        viewTabContent.innerHTML += '<p>Preview not available for this file type.</p>';
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
//fayek is here