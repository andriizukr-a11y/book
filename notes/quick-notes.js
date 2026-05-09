/* ---------- QUICK NOTES ---------- */

const QUICK_NOTES_STORAGE_KEY = 'quick_notes_data';
const QUICK_NOTES_TOPICS_KEY = 'quick_notes_topics';
const QUICK_NOTES_ACTIVE_KEY = 'quick_notes_active_topic';
const QUICK_NOTES_TIMESTAMPS_KEY = 'quick_notes_timestamps';
const QUICK_NOTES_SAVE_DELAY = 500;

let quickNotesActiveTopic = null;
let quickNotesSaveTimer = null;

function getQuickNotesData() {
  try {
    return JSON.parse(localStorage.getItem(QUICK_NOTES_STORAGE_KEY)) || {};
  } catch { return {}; }
}

function saveQuickNotesData(data) {
  localStorage.setItem(QUICK_NOTES_STORAGE_KEY, JSON.stringify(data));
}

function getQuickNotesTopics() {
  try {
    const topics = JSON.parse(localStorage.getItem(QUICK_NOTES_TOPICS_KEY));
    if (topics && topics.length) return topics;
  } catch {}
  return ['Загальне'];
}

function saveQuickNotesTopics(topics) {
  localStorage.setItem(QUICK_NOTES_TOPICS_KEY, JSON.stringify(topics));
}

function getQuickNotesTimestamps() {
  try {
    return JSON.parse(localStorage.getItem(QUICK_NOTES_TIMESTAMPS_KEY)) || {};
  } catch { return {}; }
}

function saveQuickNotesTimestamps(ts) {
  localStorage.setItem(QUICK_NOTES_TIMESTAMPS_KEY, JSON.stringify(ts));
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'щойно';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} хв тому`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} год тому`;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  if (d.getFullYear() === now.getFullYear()) {
    return `${day}.${month} ${hours}:${minutes}`;
  }
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function initQuickNotes() {
  const output = document.getElementById('output-quick-notes');
  if (!output) return;

  const topics = getQuickNotesTopics();
  quickNotesActiveTopic = localStorage.getItem(QUICK_NOTES_ACTIVE_KEY) || topics[0];
  if (!topics.includes(quickNotesActiveTopic)) {
    quickNotesActiveTopic = topics[0];
  }

  renderQuickNotesUI(output);
}

function renderQuickNotesUI(container) {
  const topics = getQuickNotesTopics();
  const data = getQuickNotesData();
  const content = data[quickNotesActiveTopic] || '';

  const timestamps = getQuickNotesTimestamps();
  let topicsHtml = topics.map(t => {
    const activeClass = t === quickNotesActiveTopic ? ' active' : '';
    const ts = timestamps[t];
    const dateTitle = ts ? ` title="Змінено: ${formatDate(ts)}"` : '';
    const safeName = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    return `<span class="quick-notes-topic${activeClass}" data-topic="${safeName}"${dateTitle}><span class="quick-notes-topic-name">${safeName}</span></span>`;
  }).join('');

  const safeContent = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  container.innerHTML = `
    <div class="quick-notes-container">
      <div class="quick-notes-topics-bar">
        <div class="quick-notes-topics-list" id="quick-notes-topics-list">
          ${topicsHtml}
        </div>
        <button class="quick-notes-add-topic" id="quick-notes-add-topic" title="Додати тему">+</button>
      </div>
      <textarea class="quick-notes-textarea" id="quick-notes-textarea" placeholder="Пишіть нотатки..." rows="1">${safeContent}</textarea>
      <div class="quick-notes-status" id="quick-notes-status"></div>
    </div>
  `;

  bindQuickNotesEvents(container);
}

function bindQuickNotesEvents(container) {
  const textarea = container.querySelector('#quick-notes-textarea');
  const addBtn = container.querySelector('#quick-notes-add-topic');
  const statusEl = container.querySelector('#quick-notes-status');

  autoResize(textarea);
  textarea.addEventListener('input', () => {
    autoResize(textarea);
    clearTimeout(quickNotesSaveTimer);
    statusEl.textContent = 'Збереження...';
    statusEl.className = 'quick-notes-status saving';
    quickNotesSaveTimer = setTimeout(() => {
      saveCurrentQuickNote(textarea.value);
      statusEl.textContent = 'Збережено';
      statusEl.className = 'quick-notes-status saved';
      setTimeout(() => {
        if (statusEl.textContent === 'Збережено') {
          statusEl.textContent = '';
          statusEl.className = 'quick-notes-status';
        }
      }, 1500);
    }, QUICK_NOTES_SAVE_DELAY);
  });

  addBtn.addEventListener('click', () => {
    if (addBtn.querySelector('input')) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'quick-notes-topic-input';
    input.placeholder = 'Нова тема...';

    const commit = () => {
      let name = input.value.trim();
      input.remove();
      addBtn.style.display = '';
      if (!name) return;
      const topics = getQuickNotesTopics();
      if (topics.includes(name)) {
        alert('Така тема вже існує');
        return;
      }
      topics.push(name);
      saveQuickNotesTopics(topics);
      quickNotesActiveTopic = name;
      localStorage.setItem(QUICK_NOTES_ACTIVE_KEY, quickNotesActiveTopic);
      renderQuickNotesUI(container);
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { input.remove(); addBtn.style.display = ''; }
    });
    input.addEventListener('blur', commit);

    addBtn.style.display = 'none';
    addBtn.parentElement.appendChild(input);
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  });

  container.querySelectorAll('.quick-notes-topic').forEach(chip => {
    chip.addEventListener('click', () => {
      if (chip.classList.contains('active')) return;
      saveCurrentQuickNoteSilent();
      quickNotesActiveTopic = chip.dataset.topic;
      localStorage.setItem(QUICK_NOTES_ACTIVE_KEY, quickNotesActiveTopic);
      renderQuickNotesUI(container);
    });

    chip.addEventListener('contextmenu', e => {
      e.preventDefault();
      const topic = chip.dataset.topic;
      const topics = getQuickNotesTopics();
      if (topics.length <= 1) {
        alert('Не можна видалити останню тему');
        return;
      }
      showQuickNotesConfirm(container, `Видалити тему "${topic}"?`, () => {
        deleteQuickNoteTopic(topic, container);
      });
    });

    chip.addEventListener('dblclick', e => {
      e.preventDefault();
      e.stopPropagation();
      if (chip.querySelector('input')) return;
      const oldName = chip.dataset.topic;
      const nameEl = chip.querySelector('.quick-notes-topic-name');
      if (!nameEl) return;

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'quick-notes-topic-input';
      input.value = oldName;

      const commit = () => {
        const trimmed = input.value.trim();
        input.remove();
        nameEl.style.display = '';
        if (!trimmed || trimmed === oldName) return;
        const topics = getQuickNotesTopics();
        if (topics.includes(trimmed)) {
          alert('Така тема вже існує');
          return;
        }
        const idx = topics.indexOf(oldName);
        topics[idx] = trimmed;
        saveQuickNotesTopics(topics);
        const data = getQuickNotesData();
        if (data[oldName]) {
          data[trimmed] = data[oldName];
          delete data[oldName];
          saveQuickNotesData(data);
        }
        const ts = getQuickNotesTimestamps();
        if (ts[oldName]) {
          ts[trimmed] = ts[oldName];
          delete ts[oldName];
          saveQuickNotesTimestamps(ts);
        }
        if (quickNotesActiveTopic === oldName) {
          quickNotesActiveTopic = trimmed;
          localStorage.setItem(QUICK_NOTES_ACTIVE_KEY, quickNotesActiveTopic);
        }
        renderQuickNotesUI(container);
      };

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); input.removeEventListener('blur', commit); commit(); }
        if (e.key === 'Escape') { input.remove(); nameEl.style.display = ''; }
      });
      input.addEventListener('blur', commit);

      nameEl.style.display = 'none';
      chip.appendChild(input);
      setTimeout(() => {
        input.focus();
        input.select();
      }, 0);
    });
  });
}

function saveCurrentQuickNote(content) {
  const data = getQuickNotesData();
  data[quickNotesActiveTopic] = content;
  saveQuickNotesData(data);
  const ts = getQuickNotesTimestamps();
  ts[quickNotesActiveTopic] = Date.now();
  saveQuickNotesTimestamps(ts);
  updateQuickNoteTopicTooltip(quickNotesActiveTopic);
}

function saveCurrentQuickNoteSilent() {
  const textarea = document.querySelector('#quick-notes-textarea');
  if (textarea) {
    const data = getQuickNotesData();
    data[quickNotesActiveTopic] = textarea.value;
    saveQuickNotesData(data);
    const ts = getQuickNotesTimestamps();
    ts[quickNotesActiveTopic] = Date.now();
    saveQuickNotesTimestamps(ts);
  }
}

function updateQuickNoteTopicTooltip(topic) {
  const chip = document.querySelector(`.quick-notes-topic[data-topic="${CSS.escape(topic)}"]`);
  if (chip) {
    const ts = getQuickNotesTimestamps();
    if (ts[topic]) {
      chip.title = `Змінено: ${formatDate(ts[topic])}`;
    }
  }
}

function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

function showQuickNotesConfirm(container, message, onConfirm) {
  const existing = container.querySelector('.notes-confirm-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'notes-confirm-overlay';
  overlay.innerHTML = `
    <div class="notes-confirm-box">
      <div class="notes-confirm-msg">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      <div class="notes-confirm-btns">
        <button class="notes-confirm-cancel">Скасувати</button>
        <button class="notes-confirm-ok">Видалити</button>
      </div>
    </div>
  `;

  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector('.notes-confirm-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('.notes-confirm-ok').addEventListener('click', () => {
    overlay.remove();
    onConfirm();
  });
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') overlay.remove();
  });

  container.appendChild(overlay);
  overlay.querySelector('.notes-confirm-cancel').focus();
}

function deleteQuickNoteTopic(topic, container) {
  const topics = getQuickNotesTopics().filter(t => t !== topic);
  saveQuickNotesTopics(topics);
  const data = getQuickNotesData();
  delete data[topic];
  saveQuickNotesData(data);
  const ts = getQuickNotesTimestamps();
  delete ts[topic];
  saveQuickNotesTimestamps(ts);
  if (quickNotesActiveTopic === topic) {
    quickNotesActiveTopic = topics[0];
    localStorage.setItem(QUICK_NOTES_ACTIVE_KEY, quickNotesActiveTopic);
  }
  renderQuickNotesUI(container);
}
