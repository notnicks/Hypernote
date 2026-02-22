# Hypernote Development Walkthrough

This walkthrough covers the recent major updates to Hypernote, including the About page, Microsoft Store preparation, and Bitbucket Sync support.

## 1. Bitbucket Sync Integration
We've added support for Bitbucket as a synchronization provider, allowing users to sync their notes to a Bitbucket repository.

### Key Features:
- **Multi-Provider Support**: Switch between Google Drive and Bitbucket seamlessly.
- **Bitbucket OAuth**: Secure authentication using Bitbucket's OAuth2 flow.
- **Repository Sync**: Automatic upload/download of markdown files to a specified Bitbucket repository.

````carousel
![Sync Modal - Provider Selection](file:///Users/nickshell/Hypernote/screenshots/sync_modal_providers.png)
<!-- slide -->
![Sync Modal - Bitbucket Settings](file:///Users/nickshell/Hypernote/screenshots/sync_modal_bitbucket.png)
````

## 2. About Page
A new "About" page has been added to provide application info and credits.

- **Dynamic Versions**: Shows Electron, Node, and Chrome versions.
- **Project Info**: Links to the project website and GitHub.

## 3. Microsoft Store Preparation
The application is now configured for MSIX (AppX) packaging, required for Microsoft Store submission.

- **`electron-builder.yml`**: Configured with AppX targets and placeholders for publisher identity.
- **Build Automation**: Generating `.exe` and `.appx` installers via `npm run build:win`.

## Verification Details
- **Sync Logic**: Refactored `sync.js` to use a provider-based architecture.
- **Security**: Moved sensitive tokens to provider-specific configuration files in `userData`.
- **UI**: Updated `SyncModal.jsx` with a responsive tab-based design for provider settings.
