/* ---------- GIST SETTINGS UI ---------- */

function createGistSettingsModal() {
  const modal = document.createElement('div');
  modal.className = 'notes-modal';
  modal.innerHTML = `
    <div class="notes-modal-content" style="max-width: 500px;">
      <div class="notes-modal-header">
        <h3>Налаштування GitHub Gist</h3>
        <button class="notes-modal-close">&times;</button>
      </div>
      <div class="notes-modal-body">
        <div class="gist-settings-section">
          <label class="gist-settings-label">
            <input type="checkbox" id="gist-enabled" ${gistStorage.config.enabled ? 'checked' : ''}>
            Увімкнути синхронізацію з GitHub Gist
          </label>
        </div>

        <div class="gist-settings-section">
          <label>GitHub Personal Access Token:</label>
          <input type="password" id="gist-token" class="gist-settings-input" 
                 placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" 
                 value="${gistStorage.config.token || ''}">
          <small class="gist-settings-hint">
            Створіть токен на <a href="https://github.com/settings/tokens/new" target="_blank">github.com/settings/tokens</a>
            <br>Потрібні права: <code>gist</code>
          </small>
        </div>

        <div class="gist-settings-section">
          <label>Gist ID (необов'язково):</label>
          <input type="text" id="gist-id" class="gist-settings-input" 
                 placeholder="Залиште порожнім для створення нового" 
                 value="${gistStorage.config.gistId || ''}">
          <small class="gist-settings-hint">
            Якщо у вас вже є Gist з нотатками, вставте його ID
          </small>
        </div>

        <div class="gist-settings-actions">
          <button id="gist-test-btn" class="gist-btn gist-btn-secondary">Перевірити з'єднання</button>
          <button id="gist-load-btn" class="gist-btn gist-btn-secondary">Завантажити з Gist</button>
          <button id="gist-sync-btn" class="gist-btn gist-btn-secondary">Синхронізувати зараз</button>
        </div>

        <div id="gist-status" class="gist-status"></div>
      </div>
      <div class="notes-modal-footer">
        <button id="gist-save-btn" class="gist-btn gist-btn-primary">Зберегти</button>
        <button id="gist-cancel-btn" class="gist-btn">Скасувати</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('.notes-modal-close');
  const cancelBtn = modal.querySelector('#gist-cancel-btn');
  const saveBtn = modal.querySelector('#gist-save-btn');
  const testBtn = modal.querySelector('#gist-test-btn');
  const loadBtn = modal.querySelector('#gist-load-btn');
  const syncBtn = modal.querySelector('#gist-sync-btn');
  const statusEl = modal.querySelector('#gist-status');

  const enabledCheckbox = modal.querySelector('#gist-enabled');
  const tokenInput = modal.querySelector('#gist-token');
  const gistIdInput = modal.querySelector('#gist-id');

  function showStatus(message, type = 'info') {
    statusEl.textContent = message;
    statusEl.className = `gist-status gist-status-${type}`;
    statusEl.style.display = 'block';
  }

  function hideStatus() {
    statusEl.style.display = 'none';
  }

  closeBtn.onclick = cancelBtn.onclick = () => {
    modal.remove();
  };

  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  testBtn.onclick = async () => {
    hideStatus();
    const token = tokenInput.value.trim();
    if (!token) {
      showStatus('Введіть токен', 'error');
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Перевірка...';

    try {
      const tempStorage = new GistStorage();
      tempStorage.config.token = token;
      const user = await tempStorage.testConnection();
      showStatus(`✓ З'єднання успішне! Користувач: ${user.login}`, 'success');
    } catch (error) {
      showStatus(`✗ Помилка: ${error.message}`, 'error');
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Перевірити з\'єднання';
    }
  };

  loadBtn.onclick = async () => {
    hideStatus();
    const token = tokenInput.value.trim();
    const gistId = gistIdInput.value.trim();

    if (!token || !gistId) {
      showStatus('Введіть токен та Gist ID', 'error');
      return;
    }

    if (!confirm('Це замінить всі поточні нотатки даними з Gist. Продовжити?')) {
      return;
    }

    loadBtn.disabled = true;
    loadBtn.textContent = 'Завантаження...';

    try {
      const tempStorage = new GistStorage();
      tempStorage.config.token = token;
      tempStorage.config.gistId = gistId;
      tempStorage.config.enabled = true;
      
      await tempStorage.loadFromGistAndApply();
      showStatus('✓ Дані успішно завантажено!', 'success');
      
      setTimeout(() => {
        if (typeof renderNotesUI === 'function') renderNotesUI();
      }, 500);
    } catch (error) {
      showStatus(`✗ Помилка: ${error.message}`, 'error');
    } finally {
      loadBtn.disabled = false;
      loadBtn.textContent = 'Завантажити з Gist';
    }
  };

  syncBtn.onclick = async () => {
    hideStatus();
    const token = tokenInput.value.trim();

    if (!token) {
      showStatus('Введіть токен', 'error');
      return;
    }

    syncBtn.disabled = true;
    syncBtn.textContent = 'Синхронізація...';

    try {
      const tempStorage = new GistStorage();
      tempStorage.config.token = token;
      tempStorage.config.gistId = gistIdInput.value.trim();
      tempStorage.config.enabled = true;
      
      await tempStorage.syncToGist();
      
      if (tempStorage.config.gistId && !gistIdInput.value.trim()) {
        gistIdInput.value = tempStorage.config.gistId;
      }
      
      showStatus('✓ Синхронізація успішна!', 'success');
    } catch (error) {
      showStatus(`✗ Помилка: ${error.message}`, 'error');
    } finally {
      syncBtn.disabled = false;
      syncBtn.textContent = 'Синхронізувати зараз';
    }
  };

  saveBtn.onclick = () => {
    const config = {
      enabled: enabledCheckbox.checked,
      token: tokenInput.value.trim(),
      gistId: gistIdInput.value.trim()
    };

    gistStorage.saveConfig(config);

    if (config.enabled) {
      gistStorage.startAutoSync();
      showToast('Синхронізація з Gist увімкнена');
    } else {
      gistStorage.stopAutoSync();
      showToast('Синхронізація з Gist вимкнена');
    }

    setTimeout(() => modal.remove(), 1000);
  };

  return modal;
}

function addGistSettingsButton() {
  const btn = document.getElementById('notes-gist-settings-btn');
  if (!btn) return;

  btn.onclick = () => createGistSettingsModal();

  window.addEventListener('gist-sync-status', (e) => {
    const { status, message } = e.detail;
    
    btn.className = 'notes-gist-settings-btn';

    switch (status) {
      case 'idle':
        btn.title = 'Налаштування синхронізації';
        break;
      case 'syncing':
      case 'loading':
        btn.classList.add('gist-btn-syncing');
        btn.title = status === 'syncing' ? 'Синхронізація...' : 'Завантаження...';
        break;
      case 'success':
        btn.classList.add('gist-btn-success');
        const lastSync = e.detail.lastSync;
        btn.title = lastSync ? `Синхронізовано: ${new Date(lastSync).toLocaleString('uk-UA')}` : 'Синхронізовано';
        setTimeout(() => {
          btn.className = 'notes-gist-settings-btn';
          btn.title = 'Налаштування синхронізації';
        }, 3000);
        break;
      case 'error':
        btn.classList.add('gist-btn-error');
        btn.title = `Помилка: ${message}`;
        break;
    }
  });
}
