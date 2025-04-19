class CanvasAPI {
  constructor(domain, token) {
    this.domain = domain;
    this.token = token;
    this.baseUrl = `https://${domain}/api/v1`;
  }

  async fetchWithAuth(url, options = {}) {
    const headers = {
      Authorization: `Bearer ${this.token}`,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response;
  }

  async getCourses() {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseUrl}/users/self/favorites/courses?enrollment_state=active&per_page=100`
      );
      return await response.json();
    } catch (error) {
      console.error("Error fetching courses:", error);
      throw error;
    }
  }

  async uploadFile(courseId, file, onProgress) {
    try {
      // Step 1: Get a file upload URL
      const quotaParams = new URLSearchParams({
        name: file.name,
        size: file.size,
        content_type: file.type,
        parent_folder_path: "/",
      });

      const uploadUrlResponse = await this.fetchWithAuth(
        `${this.baseUrl}/courses/${courseId}/files?${quotaParams}`
      );

      const uploadData = await uploadUrlResponse.json();

      // Step 2: Upload the file to the provided URL
      const formData = new FormData();

      // Add all required parameters from the upload_params
      Object.keys(uploadData.upload_params).forEach((key) => {
        formData.append(key, uploadData.upload_params[key]);
      });

      // Add the file as the last parameter
      formData.append("file", file);

      // Upload the file
      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadData.upload_url);

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      // Return a promise for the upload completion
      return new Promise((resolve, reject) => {
        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(formData);
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  }
}

// This will be accessible from popup.js
window.CanvasAPI = CanvasAPI;
