/* ---------- GIST SETTINGS UI ---------- */

function createGistSettingsModal() {
  const modal = document.createElement('div');
  modal.className = 'notes-modal';
  modal.innerHTML = `
    <div class="notes-modal-content" style="max-width: 500px;">
      <div class="notes-modal-header">
        <h3>Налаштування синхронізації</h3>
        <button class="notes-modal-close">&times;</button>
      </div>
      <div class="notes-modal-body">
        <div class="gist-settings-section">
          <label>Зберігати дані:</label>
          <div style="margin: 10px 0;">
            <label class="gist-settings-label">
              <input type="radio" name="sync-method" value="browser" ${!gistStorage.config.enabled && !fileStorage.config.enabled ? 'checked' : ''}>
              Тільки в браузері (localStorage)
            </label>
            <label class="gist-settings-label">
              <input type="radio" name="sync-method" value="gist" ${gistStorage.config.enabled ? 'checked' : ''}>
              GitHub Gist
            </label>
            <label class="gist-settings-label">
              <input type="radio" name="sync-method" value="file" ${fileStorage.config.enabled ? 'checked' : ''}>
              Локальний файл (File API)
            </label>
          </div>
        </div>

        <div id="gist-section" style="display: ${gistStorage.config.enabled ? 'block' : 'none'};">
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
          <div id="gist-link-container" style="margin-top: 5px;">
            <a id="gist-link" href="#" target="_blank" style="font-size: 13px; color: #007bff; text-decoration: none;">
              ↗ Відкрити Gist
            </a>
          </div>
        </div>

          <div class="gist-settings-actions">
            <button id="gist-test-btn" class="gist-btn gist-btn-secondary">Перевірити з'єднання</button>
            <button id="gist-load-btn" class="gist-btn gist-btn-secondary">Завантажити з Gist</button>
            <button id="gist-sync-btn" class="gist-btn gist-btn-secondary">Синхронізувати зараз</button>
          </div>

          <div id="gist-status" class="gist-status"></div>
        </div>

        <div id="file-section" style="display: ${fileStorage.config.enabled ? 'block' : 'none'};">
          <div class="gist-settings-section">
            <label>Назва файлу:</label>
            <input type="text" id="file-name" class="gist-settings-input" 
                   placeholder="tab-links-notes.json" 
                   value="${fileStorage.config.fileName || 'tab-links-notes.json'}">
            <small class="gist-settings-hint">
              Файл буде збережено в папці, яку ви виберете
            </small>
          </div>

          <div class="gist-settings-actions">
            <button id="file-select-btn" class="gist-btn gist-btn-secondary">Вибрати файл</button>
            <button id="file-load-btn" class="gist-btn gist-btn-secondary">Завантажити з файлу</button>
            <button id="file-sync-btn" class="gist-btn gist-btn-secondary">Синхронізувати зараз</button>
          </div>

          <div id="file-status" class="gist-status"></div>
        </div>
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
  
  const syncMethodRadios = modal.querySelectorAll('input[name="sync-method"]');
  const gistSection = modal.querySelector('#gist-section');
  const fileSection = modal.querySelector('#file-section');

  const testBtn = modal.querySelector('#gist-test-btn');
  const loadBtn = modal.querySelector('#gist-load-btn');
  const syncBtn = modal.querySelector('#gist-sync-btn');
  const statusEl = modal.querySelector('#gist-status');

  const fileSelectBtn = modal.querySelector('#file-select-btn');
  const fileLoadBtn = modal.querySelector('#file-load-btn');
  const fileSyncBtn = modal.querySelector('#file-sync-btn');
  const fileStatusEl = modal.querySelector('#file-status');

  const tokenInput = modal.querySelector('#gist-token');
  const gistIdInput = modal.querySelector('#gist-id');
  const gistLink = modal.querySelector('#gist-link');
  const gistLinkContainer = modal.querySelector('#gist-link-container');
  
  const fileNameInput = modal.querySelector('#file-name');

  function showStatus(message, type = 'info') {
    statusEl.textContent = message;
    statusEl.className = `gist-status gist-status-${type}`;
    statusEl.style.display = 'block';
  }

  function hideStatus() {
    statusEl.style.display = 'none';
  }

  function showFileStatus(message, type = 'info') {
    fileStatusEl.textContent = message;
    fileStatusEl.className = `gist-status gist-status-${type}`;
    fileStatusEl.style.display = 'block';
  }

  function hideFileStatus() {
    fileStatusEl.style.display = 'none';
  }

  function updateGistLink() {
    const gistId = gistIdInput.value.trim();
    if (gistId) {
      gistLink.href = `https://gist.github.com/${gistId}`;
      gistLinkContainer.style.display = 'block';
    } else {
      gistLinkContainer.style.display = 'none';
    }
  }

  // Initialize gist link
  updateGistLink();
  gistIdInput.addEventListener('input', updateGistLink);

  syncMethodRadios.forEach(radio => {
    radio.onchange = (e) => {
      if (e.target.value === 'gist') {
        gistSection.style.display = 'block';
        fileSection.style.display = 'none';
      } else if (e.target.value === 'file') {
        gistSection.style.display = 'none';
        fileSection.style.display = 'block';
      } else {
        gistSection.style.display = 'none';
        fileSection.style.display = 'none';
      }
    };
  });

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
        if (typeof renderNotesUI === 'function') {
          const container = document.getElementById('output-notes');
          if (container) renderNotesUI(container);
        }
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
        updateGistLink();
      }

      showStatus('✓ Синхронізація успішна!', 'success');
    } catch (error) {
      showStatus(`✗ Помилка: ${error.message}`, 'error');
    } finally {
      syncBtn.disabled = false;
      syncBtn.textContent = 'Синхронізувати зараз';
    }
  };

  fileSelectBtn.onclick = async () => {
    hideFileStatus();
    fileSelectBtn.disabled = true;
    fileSelectBtn.textContent = 'Вибір...';

    try {
      await fileStorage.requestFileAccess();
      fileNameInput.value = fileStorage.fileHandle.name;
      showFileStatus(`✓ Файл вибрано: ${fileStorage.fileHandle.name}`, 'success');
    } catch (error) {
      showFileStatus(`✗ Помилка: ${error.message}`, 'error');
    } finally {
      fileSelectBtn.disabled = false;
      fileSelectBtn.textContent = 'Вибрати файл';
    }
  };

  fileLoadBtn.onclick = async () => {
    hideFileStatus();

    // Якщо файл не вибрано, відкриваємо діалог відкриття файлу
    if (!fileStorage.fileHandle) {
      fileLoadBtn.disabled = true;
      fileLoadBtn.textContent = 'Вибір файлу...';

      try {
        await fileStorage.openFileForReading();
        fileNameInput.value = fileStorage.fileHandle.name;
      } catch (error) {
        showFileStatus(`✗ Помилка вибору файлу: ${error.message}`, 'error');
        fileLoadBtn.disabled = false;
        fileLoadBtn.textContent = 'Завантажити з файлу';
        return;
      }
    }

    if (!confirm('Це замінить всі поточні нотатки даними з файлу. Продовжити?')) {
      fileLoadBtn.disabled = false;
      fileLoadBtn.textContent = 'Завантажити з файлу';
      return;
    }

    fileLoadBtn.disabled = true;
    fileLoadBtn.textContent = 'Завантаження...';

    try {
      await fileStorage.loadFromFileAndApply();
      showFileStatus('✓ Дані успішно завантажено!', 'success');
      
      setTimeout(() => {
        if (typeof renderNotesUI === 'function') {
          const container = document.getElementById('output-notes');
          if (container) renderNotesUI(container);
        }
      }, 500);
    } catch (error) {
      showFileStatus(`✗ Помилка: ${error.message}`, 'error');
    } finally {
      fileLoadBtn.disabled = false;
      fileLoadBtn.textContent = 'Завантажити з файлу';
    }
  };

  fileSyncBtn.onclick = async () => {
    hideFileStatus();

    if (!fileStorage.fileHandle) {
      showFileStatus('Спочатку виберіть файл', 'error');
      return;
    }

    fileSyncBtn.disabled = true;
    fileSyncBtn.textContent = 'Синхронізація...';

    try {
      fileStorage.config.enabled = true;
      await fileStorage.syncToFile();
      showFileStatus('✓ Синхронізація успішна!', 'success');
    } catch (error) {
      showFileStatus(`✗ Помилка: ${error.message}`, 'error');
    } finally {
      fileSyncBtn.disabled = false;
      fileSyncBtn.textContent = 'Синхронізувати зараз';
    }
  };

  saveBtn.onclick = () => {
    const syncMethod = modal.querySelector('input[name="sync-method"]:checked').value;
    
    if (syncMethod === 'browser') {
      gistStorage.saveConfig({ enabled: false, token: gistStorage.config.token, gistId: gistStorage.config.gistId });
      fileStorage.saveConfig({ enabled: false, fileName: fileStorage.config.fileName });
      gistStorage.stopAutoSync();
      fileStorage.stopAutoSync();
      showToast('Дані зберігаються тільки в браузері');
    } else if (syncMethod === 'gist') {
      const config = {
        enabled: true,
        token: tokenInput.value.trim(),
        gistId: gistIdInput.value.trim()
      };

      gistStorage.saveConfig(config);
      fileStorage.saveConfig({ enabled: false, fileName: fileStorage.config.fileName });

      gistStorage.startAutoSync();
      fileStorage.stopAutoSync();
      showToast('Синхронізація з Gist увімкнена');
    } else {
      const config = {
        enabled: true,
        fileName: fileNameInput.value.trim() || 'tab-links-notes.json'
      };

      fileStorage.saveConfig(config);
      gistStorage.saveConfig({ enabled: false, token: gistStorage.config.token, gistId: gistStorage.config.gistId });

      if (fileStorage.fileHandle) {
        fileStorage.startAutoSync();
        gistStorage.stopAutoSync();
        showToast('Синхронізація з файлом увімкнена');
      } else {
        showToast('Спочатку виберіть файл');
        return;
      }
    }

    setTimeout(() => modal.remove(), 1000);
  };

  return modal;
}

function addGistSettingsButton() {
  const btn = document.getElementById('notes-gist-settings-btn');
  if (!btn) return;

  btn.onclick = () => createGistSettingsModal();

  const updateButtonStatus = (e) => {
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
  };

  window.addEventListener('gist-sync-status', updateButtonStatus);
  window.addEventListener('file-sync-status', updateButtonStatus);

  // Show error if sync method is enabled but not properly configured
  if (gistStorage.config.enabled && !gistStorage.config.token) {
    btn.classList.add('gist-btn-error');
    btn.title = 'Помилка: Gist увімкнено, але токен не вказано';
  } else if (fileStorage.config.enabled && !fileStorage.fileHandle) {
    btn.classList.add('gist-btn-error');
    btn.title = 'Помилка: синхронізацію з файлом увімкнено, але файл не вибрано';
  }
}
