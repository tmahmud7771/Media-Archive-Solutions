# Media Archive Solutions

Media Archive Solutions is a Node.js and Express based file management tool for organizing and sharing large video files. The app uses EJS templates and Tailwind CSS for the interface and stores uploaded items in the local `uploads/` directory.

## Features
- **Authentication with roles**: Built‑in `admin` and `client` accounts with session handling. Only administrators can upload or delete content.
- **Upload support**: Admins can upload video or ZIP files up to 8 GB and create new folders in any directory.
- **File browsing and preview**: Navigate folders, preview video files in the browser and download single files.
- **Folder downloads**: Entire folders can be downloaded as ZIP archives while Socket.IO reports progress to the client.

## Default credentials
The default accounts are defined in `auth/auth.js` and can be changed there:
- **admin** / `RaPidPr2000`
- **client** / `rapidPr2025`

## Requirements
- Node.js (18.x or later recommended)
- npm

## Installation
1. Clone the repository and install dependencies:
   ```bash
   git clone <repo-url>
   cd Media-Archive-Solutions
   npm install
   ```
2. Start the development server with automatic restarts:
   ```bash
   npm run dev
   ```
   or start without watchers:
   ```bash
   npm start
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser and log in with one of the accounts above. Uploaded files appear under the `uploads/` directory.

## Running on Ubuntu
1. Install Node.js and npm if needed:
   ```bash
   sudo apt update
   sudo apt install nodejs npm
   ```
2. Follow the installation steps above.

## Running on Windows
1. Install Node.js from [nodejs.org](https://nodejs.org/).
2. Open PowerShell, then run the installation steps listed earlier.

## What you can do with the app
- Manage video archives on your own server.
- Upload, preview and download media files with a browser.
- Share folders easily by generating zip archives on demand.
- Restrict destructive actions such as uploads or deletions to administrators.

