import { google } from 'googleapis'
import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import { shell } from 'electron'

class DriveSyncManager {
  constructor() {
    this.drive = null
    this.oauth2Client = null
    this.syncFolderName = 'Hypernote'
    this.syncFolderId = null
    this.configPath = null
  }

  async loadConfig(userDataPath) {
    this.configPath = path.join(userDataPath, 'sync-config.json')
    try {
      const data = await fs.readFile(this.configPath, 'utf-8')
      const config = JSON.parse(data)
      if (config.clientId && config.clientSecret) {
        this.oauth2Client = new google.auth.OAuth2(
          config.clientId,
          config.clientSecret,
          'urn:ietf:wg:oauth:2.0:oob'
        )
        if (config.tokens) {
          this.oauth2Client.setCredentials(config.tokens)
          this.drive = google.drive({ version: 'v3', auth: this.oauth2Client })
        }
      }
      return config
    } catch (e) {
      return null
    }
  }

  async saveConfig(config) {
    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2))
  }

  getAuthUrl(clientId, clientSecret) {
    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob')
    const scopes = ['https://www.googleapis.com/auth/drive.file']
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes
    })
  }

  async exchangeCode(code) {
    if (!this.oauth2Client) {
      throw new Error('OAuth Client not initialized. Call getAuthUrl first.')
    }
    const { tokens } = await this.oauth2Client.getToken(code)
    this.oauth2Client.setCredentials(tokens)
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client })
    await this.saveConfig({
      clientId: this.oauth2Client._clientId,
      clientSecret: this.oauth2Client._clientSecret,
      tokens
    })
    return true
  }

  async getSyncFolder() {
    if (!this.drive) return null
    if (this.syncFolderId) return this.syncFolderId

    const res = await this.drive.files.list({
      q: `name = '${this.syncFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    })

    if (res.data.files.length > 0) {
      this.syncFolderId = res.data.files[0].id
      return this.syncFolderId
    } else {
      const folder = await this.drive.files.create({
        resource: {
          name: this.syncFolderName,
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      })
      this.syncFolderId = folder.data.id
      return this.syncFolderId
    }
  }

  async sync(localDir) {
    if (!this.drive) throw new Error('Google Drive not configured')

    const parentId = await this.getSyncFolder()
    const remoteFiles = new Map()
    await this.listRemoteFiles(parentId, '', remoteFiles)

    const localFiles = await this.getLocalFiles(localDir)
    const changes = {
      uploaded: [],
      downloaded: [],
      errors: []
    }

    // Upload local changes
    for (const [relPath, stats] of localFiles) {
      const remote = remoteFiles.get(relPath)
      if (!remote || stats.mtimeMs > remote.updated + 1000) {
        try {
          await this.uploadFile(localDir, relPath, parentId, remote ? remote.id : null)
          changes.uploaded.push(relPath)
        } catch (e) {
          console.error(`Failed to upload ${relPath}`, e)
          changes.errors.push(`Upload failed: ${relPath}`)
        }
      }
    }

    // Download remote changes
    for (const [relPath, remote] of remoteFiles) {
      const local = localFiles.get(relPath)
      if (!local || remote.updated > local.mtimeMs + 1000) {
        try {
          await this.downloadFile(localDir, relPath, remote.id, remote.updated)
          changes.downloaded.push(relPath)
        } catch (e) {
          console.error(`Failed to download ${relPath}`, e)
          changes.errors.push(`Download failed: ${relPath}`)
        }
      }
    }

    return changes
  }

  async listRemoteFiles(folderId, currentPath, map) {
    const res = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, modifiedTime)',
      pageSize: 1000
    })

    for (const file of res.data.files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        const newPath = currentPath ? `${currentPath}/${file.name}` : file.name
        await this.listRemoteFiles(file.id, newPath, map)
      } else {
        const relPath = currentPath ? `${currentPath}/${file.name}` : file.name
        map.set(relPath, {
          id: file.id,
          name: file.name,
          updated: new Date(file.modifiedTime).getTime()
        })
      }
    }
  }

  async uploadFile(baseDir, relPath, rootFolderId, existingFileId) {
    const fullPath = path.join(baseDir, relPath)
    const parts = relPath.split('/')
    const fileName = parts.pop()
    let parentId = rootFolderId

    // Ensure directory structure exists
    for (const part of parts) {
      parentId = await this.getOrCreateFolder(parentId, part)
    }

    const media = {
      mimeType: 'text/markdown',
      body: fsSync.createReadStream(fullPath)
    }

    const stats = await fs.stat(fullPath)
    const modifiedTime = stats.mtime.toISOString()

    if (existingFileId) {
      await this.drive.files.update({
        fileId: existingFileId,
        resource: {
          modifiedTime
        },
        media: media,
        fields: 'id'
      })
    } else {
      await this.drive.files.create({
        resource: {
          name: fileName,
          parents: [parentId],
          modifiedTime
        },
        media: media,
        fields: 'id'
      })
    }
  }

  async getOrCreateFolder(parentId, name) {
    const res = await this.drive.files.list({
      q: `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)'
    })

    if (res.data.files.length > 0) {
      return res.data.files[0].id
    }

    const folder = await this.drive.files.create({
      resource: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      },
      fields: 'id'
    })

    return folder.data.id
  }

  async downloadFile(baseDir, relPath, fileId, remoteTimeMs) {
    const fullPath = path.join(baseDir, relPath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })

    const dest = fsSync.createWriteStream(fullPath)
    await new Promise((resolve, reject) => {
      this.drive.files
        .get({ fileId, alt: 'media' }, { responseType: 'stream' })
        .then((res) => {
          res.data
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .pipe(dest)
        })
        .catch((err) => reject(err))
    })

    // Set file mtime to match remote
    const mtime = new Date(remoteTimeMs)
    await fs.utimes(fullPath, mtime, mtime)
  }

  async getLocalFiles(dir, baseDir = dir) {
    let results = new Map()
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relPath = path.relative(baseDir, fullPath).split(path.sep).join('/')

      if (entry.isDirectory()) {
        const subResults = await this.getLocalFiles(fullPath, baseDir)
        subResults.forEach((v, k) => results.set(k, v))
      } else if (entry.isFile() && !entry.name.startsWith('.')) {
        const stats = await fs.stat(fullPath)
        results.set(relPath, {
          path: fullPath,
          mtimeMs: stats.mtime.getTime()
        })
      }
    }
    return results
  }
}

export default new DriveSyncManager()
