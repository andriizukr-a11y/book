/* ---------- FILE API STORAGE ---------- */

const FILE_CONFIG_KEY = 'file_config';
const FILE_SYNC_INTERVAL = 30000; // 30 seconds
const FILE_DEBOUNCE_MS = 2000; // 2 seconds debounce for immediate sync

class FileStorage {
  constructor() {
    this.config = this.loadConfig();
    this.syncTimer = null;
    this.debounceTimer = null;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.pendingChanges = false;
    this.fileHandle = null;
    this._suppressAutoSync = false;
  }

  loadConfig() {
    try {
      const config = JSON.parse(localStorage.getItem(FILE_CONFIG_KEY));
      return config || { enabled: false, fileName: 'tab-links-notes.json' };
    } catch {
      return { enabled: false, fileName: 'tab-links-notes.json' };
    }
  }

  saveConfig(config) {
    this.config = config;
    localStorage.setItem(FILE_CONFIG_KEY, JSON.stringify(config));
  }

  isEnabled() {
    return this.config.enabled;
  }

  async requestFileAccess() {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: this.config.fileName || 'tab-links-notes.json',
        types: [
          {
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] }
          }
        ]
      });
      
      this.fileHandle = fileHandle;
      return fileHandle;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Вибір файлу скасовано');
      }
      throw error;
    }
  }

  async openFileForReading() {
    try {
      const fileHandle = await window.showOpenFilePicker({
        types: [
          {
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] }
          }
        ],
        multiple: false
      });
      
      this.fileHandle = fileHandle[0];
      return fileHandle[0];
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Вибір файлу скасовано');
      }
      throw error;
    }
  }

  async saveToFile(data) {
    if (!this.fileHandle) {
      throw new Error('Доступ до файлу не надано');
    }

    try {
      const writable = await this.fileHandle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      return true;
    } catch (error) {
      throw new Error(`Помилка при збереженні файлу: ${error.message}`);
    }
  }

  async loadFromFile() {
    if (!this.fileHandle) {
      throw new Error('Доступ до файлу не надано');
    }

    try {
      const file = await this.fileHandle.getFile();
      const content = await file.text();
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Помилка при завантаженні файлу: ${error.message}`);
    }
  }

  async syncToFile() {
    if (!this.isEnabled() || this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    this.updateSyncStatus('syncing');

    try {
      const data = {
        notes: getNotesData(),
        topics: getNotesTopics(),
        timestamps: getNotesTimestamps(),
        groups: getNotesGroups(),
        topicGroups: getTopicGroups(),
        mainGroup: getMainGroupName(),
        collapsedGroups: getCollapsedGroups(),
        activeTopic: notesActiveTopic,
        lastSync: new Date().toISOString()
      };

      await this.saveToFile(data);

      this.lastSyncTime = new Date();
      this.pendingChanges = false;
      this.updateSyncStatus('success');
      
      setTimeout(() => this.updateSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('File sync error:', error);
      this.updateSyncStatus('error', error.message);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  async loadFromFileAndApply() {
    if (!this.isEnabled()) {
      throw new Error('Синхронізація файлів не увімкнена');
    }

    this.updateSyncStatus('loading');
    gistStorage._suppressAutoSync = true;
    fileStorage._suppressAutoSync = true;

    try {
      const data = await this.loadFromFile();

      // Apply loaded data directly to localStorage (bypass markPendingChanges)
      if (data.notes) localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(data.notes));
      if (data.topics) localStorage.setItem(NOTES_TOPICS_KEY, JSON.stringify(data.topics));
      if (data.timestamps) localStorage.setItem(NOTES_TIMESTAMPS_KEY, JSON.stringify(data.timestamps));
      if (data.groups) localStorage.setItem(NOTES_GROUPS_KEY, JSON.stringify(data.groups));
      if (data.topicGroups) localStorage.setItem(NOTES_TOPIC_GROUPS_KEY, JSON.stringify(data.topicGroups));
      if (data.mainGroup) localStorage.setItem(NOTES_MAIN_GROUP_KEY, data.mainGroup);
      if (data.collapsedGroups) localStorage.setItem(NOTES_COLLAPSED_KEY, JSON.stringify(data.collapsedGroups));
      if (data.activeTopic) {
        notesActiveTopic = data.activeTopic;
        localStorage.setItem(NOTES_ACTIVE_KEY, data.activeTopic);
      }

      this.lastSyncTime = new Date();
      this.updateSyncStatus('success');
      
      setTimeout(() => this.updateSyncStatus('idle'), 2000);
      
      return data;
    } catch (error) {
      console.error('File load error:', error);
      this.updateSyncStatus('error', error.message);
      throw error;
    } finally {
      gistStorage._suppressAutoSync = false;
      fileStorage._suppressAutoSync = false;
    }
  }

  markPendingChanges() {
    if (this._suppressAutoSync) return;
    this.pendingChanges = true;
    this.scheduleImmediateSync();
  }

  scheduleImmediateSync() {
    if (!this.isEnabled() || !this.fileHandle || this._suppressAutoSync) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      if (this.pendingChanges && !this.isSyncing) {
        this.syncToFile().catch(err => {
          console.error('Immediate file sync failed:', err);
        });
      }
    }, FILE_DEBOUNCE_MS);
  }

  startAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    if (!this.isEnabled()) {
      return;
    }

    this.syncTimer = setInterval(() => {
      if (this.pendingChanges && !this.isSyncing) {
        this.syncToFile().catch(err => {
          console.error('Auto-sync failed:', err);
        });
      }
    }, FILE_SYNC_INTERVAL);
  }

  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  updateSyncStatus(status, message = '') {
    const event = new CustomEvent('file-sync-status', {
      detail: { status, message, lastSync: this.lastSyncTime }
    });
    window.dispatchEvent(event);
  }

  async testConnection() {
    if (!this.fileHandle) {
      throw new Error('Файл не вибрано');
    }

    try {
      const file = await this.fileHandle.getFile();
      return { name: file.name, size: file.size };
    } catch (error) {
      throw new Error('Помилка доступу до файлу');
    }
  }
}

// Global instance
const fileStorage = new FileStorage();
