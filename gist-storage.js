/* ---------- GITHUB GIST STORAGE ---------- */

const GIST_CONFIG_KEY = 'gist_config';
const GIST_SYNC_INTERVAL = 30000; // 30 seconds
const GIST_DEBOUNCE_MS = 2000; // 2 seconds debounce for immediate sync

class GistStorage {
  constructor() {
    this.config = this.loadConfig();
    this.syncTimer = null;
    this.debounceTimer = null;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.pendingChanges = false;
  }

  loadConfig() {
    try {
      const config = JSON.parse(localStorage.getItem(GIST_CONFIG_KEY));
      return config || { token: '', gistId: '137d2db17448a9e988cf472452f77672', enabled: false };
    } catch {
      return { token: '', gistId: '137d2db17448a9e988cf472452f77672', enabled: false };
    }
  }

  saveConfig(config) {
    this.config = config;
    localStorage.setItem(GIST_CONFIG_KEY, JSON.stringify(config));
  }

  isEnabled() {
    return this.config.enabled && this.config.token;
  }

  async createGist(data) {
    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `token ${this.config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Tab Links - Notes Data',
        public: false,
        files: {
          'notes-data.json': {
            content: JSON.stringify(data, null, 2)
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create gist');
    }

    const gist = await response.json();
    return gist.id;
  }

  async updateGist(data) {
    if (!this.config.gistId) {
      throw new Error('No gist ID configured');
    }

    const response = await fetch(`https://api.github.com/gists/${this.config.gistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${this.config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: {
          'notes-data.json': {
            content: JSON.stringify(data, null, 2)
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update gist');
    }

    return await response.json();
  }

  async loadFromGist() {
    if (!this.config.gistId) {
      throw new Error('No gist ID configured');
    }

    const response = await fetch(`https://api.github.com/gists/${this.config.gistId}`, {
      headers: {
        'Authorization': `token ${this.config.token}`,
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load gist');
    }

    const gist = await response.json();
    const file = gist.files['notes-data.json'];
    
    if (!file) {
      throw new Error('Notes data file not found in gist');
    }

    console.log('Gist file truncated:', file.truncated, 'content length:', file.size, 'raw_url:', file.raw_url);

    let content = file.content;

    if (file.truncated) {
      console.log('Fetching full content via raw API...');
      const rawResponse = await fetch(`https://api.github.com/gists/${this.config.gistId}`, {
        headers: {
          'Authorization': `token ${this.config.token}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      });
      if (!rawResponse.ok) throw new Error('Failed to load full gist content');
      content = await rawResponse.text();
      console.log('Raw content length:', content.length);
    }

    console.log('Parsing JSON, content preview:', content.substring(0, 200));
    return JSON.parse(content);
  }

  async syncToGist() {
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

      if (!this.config.gistId) {
        // Create new gist
        const gistId = await this.createGist(data);
        this.saveConfig({ ...this.config, gistId });
      } else {
        // Update existing gist
        await this.updateGist(data);
      }

      this.lastSyncTime = new Date();
      this.pendingChanges = false;
      this.updateSyncStatus('success');
      
      setTimeout(() => this.updateSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Gist sync error:', error);
      this.updateSyncStatus('error', error.message);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  async loadFromGistAndApply() {
    if (!this.isEnabled()) {
      throw new Error('Gist storage is not enabled');
    }

    this.updateSyncStatus('loading');

    try {
      const data = await this.loadFromGist();
      console.log('Gist data loaded:', Object.keys(data), 'topics:', data.topics, 'groups:', data.groups);

      // Apply loaded data
      if (data.notes) { saveNotesData(data.notes); console.log('Notes saved, count:', Object.keys(data.notes).length); }
      else console.log('No notes in data');
      if (data.topics) saveNotesTopics(data.topics);
      if (data.timestamps) saveNotesTimestamps(data.timestamps);
      if (data.groups) saveNotesGroups(data.groups);
      if (data.topicGroups) saveTopicGroups(data.topicGroups);
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
      console.error('Gist load error:', error);
      this.updateSyncStatus('error', error.message);
      throw error;
    }
  }

  markPendingChanges() {
    this.pendingChanges = true;
    this.scheduleImmediateSync();
  }

  scheduleImmediateSync() {
    if (!this.isEnabled()) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      if (this.pendingChanges && !this.isSyncing) {
        this.syncToGist().catch(err => {
          console.error('Immediate sync failed:', err);
        });
      }
    }, GIST_DEBOUNCE_MS);
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
        this.syncToGist().catch(err => {
          console.error('Auto-sync failed:', err);
        });
      }
    }, GIST_SYNC_INTERVAL);
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
    const event = new CustomEvent('gist-sync-status', {
      detail: { status, message, lastSync: this.lastSyncTime }
    });
    window.dispatchEvent(event);
  }

  async testConnection() {
    if (!this.config.token) {
      throw new Error('No token configured');
    }

    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${this.config.token}`,
      }
    });

    if (!response.ok) {
      throw new Error('Invalid token or connection failed');
    }

    const user = await response.json();
    return user;
  }
}

// Global instance
const gistStorage = new GistStorage();
