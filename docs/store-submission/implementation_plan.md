# Bitbucket Sync Implementation Plan

This plan outlines the steps to add Bitbucket synchronization to Hypernote. We will refactor the existing sync system to support multiple providers and implement Bitbucket file-based sync.

## User Review Required

> [!IMPORTANT]
> To use Bitbucket sync, you will need to:
> 1. Create a **Bitbucket OAuth Consumer** in your Bitbucket settings.
> 2. Grant it **Repository Write** and **Account Read** permissions.
> 3. Provide a **Workspace** and **Repository name** for the notes.

## Proposed Changes

### Sync Infrastructure

#### [MODIFY] [sync.js](file:///Users/nickshell/Hypernote/src/main/sync.js)
- Refactor `DriveSyncManager` into a generic `SyncManager` that can load different providers.
- Implement `BitbucketProvider` using Bitbucket's REST API for file uploads and downloads.
- Use a unified configuration format for different providers.

### Application Integration

#### [MODIFY] [index.js](file:///Users/nickshell/Hypernote/src/main/index.js)
- Update IPC handlers to support provider selection (Drive vs. Bitbucket).
- Add specific handlers for Bitbucket-specific settings (Repo, Workspace).

### User Interface

#### [MODIFY] [SyncModal.jsx](file:///Users/nickshell/Hypernote/src/renderer/src/components/SyncModal.jsx)
- Add a provider selection toggle (Google Drive / Bitbucket).
- Show provider-specific configuration fields.
- Update instructions for obtaining Bitbucket credentials.

## Verification Plan

### Automated Tests
- Mock Bitbucket API responses to verify sync logic (upload/download decision making).

### Manual Verification
- Authorize with a test Bitbucket account.
- Sync a folder to a Bitbucket repository.
- Modify a file locally, sync, and verify the change in Bitbucket.
- Modify a file in Bitbucket (via web UI), sync, and verify local update.
