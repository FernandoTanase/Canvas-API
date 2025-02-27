# Canvas API Chrome Extension

## Overview
This project is a Chrome extension designed to interact with the Canvas API used by universities. The extension aims to provide users with a streamlined interface to access and manage their Canvas-related tasks directly from their browser.

## Project Structure
The project consists of the following files and directories:

- **manifest.json**: Configuration file for the Chrome extension, including metadata and permissions.
- **popup/**: Contains files related to the popup window that appears when the extension icon is clicked.
  - **popup.html**: Structure of the popup window.
  - **popup.css**: Styles for the popup window.
  - **popup.js**: JavaScript functionality for the popup window.
- **content/**: Contains the content script that interacts with web pages.
  - **content.js**: A blank content script for future modifications.
- **background/**: Background script for managing events and state.
  - **background.js**: Handles background tasks for the extension.
- **icons/**: Contains temporary icon images for the extension.
  - **icon16.png**: 16x16 pixel icon.
  - **icon48.png**: 48x48 pixel icon.
  - **icon128.png**: 128x128 pixel icon.
- **utils/**: Utility functions for interacting with the Canvas API.
  - **api.js**: Placeholder for API utility functions.
- **README.md**: Documentation for the project.

## Setup Instructions
1. Clone the repository to your local machine.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top right corner.
4. Click on "Load unpacked" and select the project directory.
5. The extension should now be loaded and ready for use.

## Future Development
This extension is a work in progress. Future updates will include:
- Enhanced functionality for interacting with the Canvas API.
- Improved UI/UX for the popup window.
- Additional features based on user feedback.

## Contributing
Contributions are welcome! Please feel free to submit issues or pull requests to improve the extension.