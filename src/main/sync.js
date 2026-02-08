import { google } from 'googleapis'
import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import http from 'http'
import url from 'url'
import { shell } from 'electron'

class DriveSyncManager {
  constructor() {
    this.drive = null
    this.oauth2Client = null
    this.configPath = null
    this.rootFolderId = null
    this.syncFolderId = null
    this.syncFolderName = 'Hypernote'
  }

  async loadConfig(userDataPath) {
    this.configPath = path.join(userDataPath, 'sync-drive-config.json')
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
          // Initialize drive if we have tokens
          this.drive = google.drive({ version: 'v3', auth: this.oauth2Client })
        }
      }
      return config
    } catch {
      return {} // No config found
    }
  }

  async saveConfig(config) {
    if (this.configPath) {
      // Merge with existing config to not lose tokens if we are just updating IDs
      let current = {}
      try {
        const data = await fs.readFile(this.configPath, 'utf-8')
        current = JSON.parse(data)
      } catch {
        // Ignore missing config
      }

      const newConfig = { ...current, ...config }
      await fs.writeFile(this.configPath, JSON.stringify(newConfig, null, 2), 'utf-8')
    }
  }

  getAuthUrl(clientId, clientSecret) {
    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob')

    // Scopes needed for sync
    const scopes = [
      'https://www.googleapis.com/auth/drive.file', // Access only files created by app or selected
      // Actually, for a sync folder we might need full drive access or drive.file if we create the folder.
      // safely use drive.file if we create the Hypernote folder.
      // But if user wants to see files, we might need drive (broad).
      // Let's stick to drive.file and create the folder ourselves.
      'https://www.googleapis.com/auth/drive.file'
    ]

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

    // Save tokens and IDs
    await this.saveConfig({
      clientId: this.oauth2Client._clientId,
      clientSecret: this.oauth2Client._clientSecret,
      tokens
    })

    return true
  }

  async startAuthFlow(clientId, clientSecret) {
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        try {
          if (req.url.startsWith('/callback')) {
            const qs = new url.URL(req.url, 'http://127.0.0.1').searchParams
            const code = qs.get('code')

            if (code) {
              res.end('Authentication successful! You can close this window now.')
              server.close()

              // Verify code
              try {
                const { tokens } = await this.oauth2Client.getToken(code)
                this.oauth2Client.setCredentials(tokens)
                this.drive = google.drive({ version: 'v3', auth: this.oauth2Client })

                await this.saveConfig({
                  clientId,
                  clientSecret,
                  tokens
                })
                resolve(true)
              } catch (e) {
                reject(e)
              }
            }
          }
        } catch (e) {
          res.end('Authentication failed.')
          server.close()
          reject(e)
        }
      })

      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port
        const redirectUri = `http://127.0.0.1:${port}/callback`

        this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

        const scopes = ['https://www.googleapis.com/auth/drive.file']
        const authUrl = this.oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: scopes
        })

        shell.openExternal(authUrl)
      })

      server.on('error', (e) => {
        reject(e)
      })
    })
  }

  async getSyncFolder() {
    if (!this.drive) throw new Error('Drive not initialized')

    // Check if we already have the folder ID cached or in config?
    // For now, let's look it up every time to be safe, or cache in memory
    if (this.syncFolderId) return this.syncFolderId

    // Find folder named 'Hypernote' in root
    // query: "name = 'Hypernote' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    const res = await this.drive.files.list({
      q: `name = '${this.syncFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    })

    if (res.data.files.length > 0) {
      this.syncFolderId = res.data.files[0].id
      return this.syncFolderId
    } else {
      // Create it
      const fileMetadata = {
        name: this.syncFolderName,
        mimeType: 'application/vnd.google-apps.folder'
      }
      const folder = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id'
      })
      this.syncFolderId = folder.data.id
      return this.syncFolderId
    }
  }

  async sync(localDir) {
    if (!this.drive) {
      throw new Error('Google Drive Sync not configured.')
    }

    const parentId = await this.getSyncFolder()

    // 1. Get Remote State
    // We need a recursive map of remote files.
    // Flat map: relativePath -> { id, updated, name }
    const remoteFiles = new Map()
    await this.listRemoteFiles(parentId, '', remoteFiles)

    // 2. Get Local State
    const localFiles = await this.getLocalFiles(localDir)

    const changes = {
      uploaded: [],
      downloaded: [],
      errors: []
    }

    // 3. Upload local -> remote
    for (const [relPath, stats] of localFiles) {
      const remote = remoteFiles.get(relPath)
      const localMtime = stats.mtimeMs

      // If remote doesn't exist OR local is newer (simple check)
      // Note: Drive 'modifiedTime' is ISO string.
      if (!remote || localMtime > remote.updated + 1000) {
        // 1 sec buffer
        try {
          await this.uploadFile(localDir, relPath, parentId, remote ? remote.id : null)
          changes.uploaded.push(relPath)
        } catch (e) {
          console.error(`Failed to upload ${relPath}`, e)
          changes.errors.push(`Upload failed: ${relPath}`)
        }
      }
    }

    // 4. Download remote -> local
    for (const [relPath, remote] of remoteFiles) {
      const local = localFiles.get(relPath)

      // If local doesn't exist OR remote is newer
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

    const mimeType = 'text/markdown' // Assume MD mostly, or detect

    // Ensure parent folders exist remotely
    // logic: split relPath, traverse/create folders
    const parts = relPath.split('/')
    const fileName = parts.pop()
    let parentId = rootFolderId

    // traverse/create folders
    for (const part of parts) {
      parentId = await this.getOrCreateFolder(parentId, part)
    }

    const media = {
      mimeType,
      body: fsSync.createReadStream(fullPath)
    }

    if (existingFileId) {
      await this.drive.files.update({
        fileId: existingFileId,
        resource: {
          modifiedTime: new Date(await (await fs.stat(fullPath)).mtime).toISOString()
        },
        media: media,
        fields: 'id'
      })
    } else {
      await this.drive.files.create({
        resource: {
          name: fileName,
          parents: [parentId],
          modifiedTime: new Date(await (await fs.stat(fullPath)).mtime).toISOString()
        },
        media: media,
        fields: 'id'
      })
    }
  }

  async getOrCreateFolder(parentId, name) {
    // Check existence
    const res = await this.drive.files.list({
      q: `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
      spaces: 'drive'
    })

    if (res.data.files.length > 0) {
      return res.data.files[0].id
    }

    // Create
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
    const dir = path.dirname(fullPath)
    await fs.mkdir(dir, { recursive: true })

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
        .catch(reject)
    })

    // Update local mtime
    await fs.utimes(fullPath, new Date(remoteTimeMs), new Date(remoteTimeMs))
  }

  async getLocalFiles(dir, baseDir = dir) {
    let results = new Map()
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relPath = path.relative(baseDir, fullPath)
      const normalizedRelPath = relPath.split(path.sep).join('/')

      if (entry.isDirectory()) {
        const subResults = await this.getLocalFiles(fullPath, baseDir)
        subResults.forEach((v, k) => results.set(k, v))
      } else if (entry.isFile() && !entry.name.startsWith('.')) {
        const stats = await fs.stat(fullPath)
        results.set(normalizedRelPath, {
          path: fullPath,
          mtimeMs: stats.mtime.getTime()
        })
      }
    }
    return results
  }
}

export default new DriveSyncManager()
