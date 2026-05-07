/* ---------- NOTES ---------- */

const NOTES_STORAGE_KEY = 'notes_data';
const NOTES_TOPICS_KEY = 'notes_topics';
const NOTES_ACTIVE_KEY = 'notes_active_topic';
const NOTES_TIMESTAMPS_KEY = 'notes_timestamps';
const SAVE_DELAY = 500;

let notesActiveTopic = null;
let notesSaveTimer = null;

function getNotesData() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)) || {};
  } catch { return {}; }
}

function saveNotesData(data) {
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(data));
}

function getNotesTopics() {
  try {
    const topics = JSON.parse(localStorage.getItem(NOTES_TOPICS_KEY));
    if (topics && topics.length) return topics;
  } catch {}
  return ['Загальне'];
}

function saveNotesTopics(topics) {
  localStorage.setItem(NOTES_TOPICS_KEY, JSON.stringify(topics));
}

function getNotesTimestamps() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_TIMESTAMPS_KEY)) || {};
  } catch { return {}; }
}

function saveNotesTimestamps(ts) {
  localStorage.setItem(NOTES_TIMESTAMPS_KEY, JSON.stringify(ts));
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

function initNotes() {
  const output = document.getElementById('output-notes');
  if (!output) return;

  const topics = getNotesTopics();
  notesActiveTopic = localStorage.getItem(NOTES_ACTIVE_KEY) || topics[0];
  if (!topics.includes(notesActiveTopic)) {
    notesActiveTopic = topics[0];
  }

  renderNotesUI(output);
}

function renderNotesUI(container) {
  const topics = getNotesTopics();
  const data = getNotesData();
  const content = data[notesActiveTopic] || '';

  const timestamps = getNotesTimestamps();
  let topicsHtml = topics.map(t => {
    const activeClass = t === notesActiveTopic ? ' active' : '';
    const ts = timestamps[t];
    const dateTitle = ts ? ` title="Змінено: ${formatDate(ts)}"` : '';
    return `<span class="notes-topic${activeClass}" data-topic="${escapeHtml(t)}"${dateTitle}>${escapeHtml(t)}</span>`;
  }).join('');

  container.innerHTML = `
    <div class="notes-container">
      <div class="notes-topics-bar">
        <div class="notes-topics-list" id="notes-topics-list">
          ${topicsHtml}
        </div>
        <button class="notes-add-topic" id="notes-add-topic" title="Додати тему">+</button>
      </div>
      <textarea class="notes-textarea" id="notes-textarea" placeholder="Пишіть нотатки..." rows="1">${escapeHtml(content)}</textarea>
      <div class="notes-status" id="notes-status"></div>
    </div>
  `;

  bindNotesEvents(container);
}

function bindNotesEvents(container) {
  const textarea = container.querySelector('#notes-textarea');
  const addBtn = container.querySelector('#notes-add-topic');
  const statusEl = container.querySelector('#notes-status');

  autoResize(textarea);
  textarea.addEventListener('input', () => {
    autoResize(textarea);
    clearTimeout(notesSaveTimer);
    statusEl.textContent = 'Збереження...';
    statusEl.className = 'notes-status saving';
    notesSaveTimer = setTimeout(() => {
      saveCurrentNote(textarea.value);
      statusEl.textContent = 'Збережено';
      statusEl.className = 'notes-status saved';
      setTimeout(() => {
        if (statusEl.textContent === 'Збережено') {
          statusEl.textContent = '';
          statusEl.className = 'notes-status';
        }
      }, 1500);
    }, SAVE_DELAY);
  });

  addBtn.addEventListener('click', () => {
    const name = prompt('Назва нової теми:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    const topics = getNotesTopics();
    if (topics.includes(trimmed)) {
      alert('Така тема вже існує');
      return;
    }
    topics.push(trimmed);
    saveNotesTopics(topics);
    notesActiveTopic = trimmed;
    localStorage.setItem(NOTES_ACTIVE_KEY, notesActiveTopic);
    renderNotesUI(container);
  });

  container.querySelectorAll('.notes-topic').forEach(chip => {
    chip.addEventListener('click', () => {
      if (chip.classList.contains('active')) return;
      saveCurrentNoteSilent();
      notesActiveTopic = chip.dataset.topic;
      localStorage.setItem(NOTES_ACTIVE_KEY, notesActiveTopic);
      renderNotesUI(container);
    });

    chip.addEventListener('contextmenu', e => {
      e.preventDefault();
      const topic = chip.dataset.topic;
      const topics = getNotesTopics();
      if (topics.length <= 1) {
        alert('Не можна видалити останню тему');
        return;
      }
      if (confirm(`Видалити тему "${topic}"?`)) {
        deleteTopic(topic, container);
      }
    });

    chip.addEventListener('dblclick', e => {
      const oldName = chip.dataset.topic;
      const newName = prompt('Нова назва теми:', oldName);
      if (!newName || !newName.trim() || newName.trim() === oldName) return;
      const trimmed = newName.trim();
      const topics = getNotesTopics();
      if (topics.includes(trimmed)) {
        alert('Така тема вже існує');
        return;
      }
      const idx = topics.indexOf(oldName);
      topics[idx] = trimmed;
      saveNotesTopics(topics);
      const data = getNotesData();
      if (data[oldName]) {
        data[trimmed] = data[oldName];
        delete data[oldName];
        saveNotesData(data);
      }
      if (notesActiveTopic === oldName) {
        notesActiveTopic = trimmed;
        localStorage.setItem(NOTES_ACTIVE_KEY, notesActiveTopic);
      }
      renderNotesUI(container);
    });
  });
}

function saveCurrentNote(content) {
  const data = getNotesData();
  data[notesActiveTopic] = content;
  saveNotesData(data);
  const ts = getNotesTimestamps();
  ts[notesActiveTopic] = Date.now();
  saveNotesTimestamps(ts);
  updateTopicTooltip(notesActiveTopic);
}

function saveCurrentNoteSilent() {
  const textarea = document.querySelector('#notes-textarea');
  if (textarea) {
    const data = getNotesData();
    data[notesActiveTopic] = textarea.value;
    saveNotesData(data);
    const ts = getNotesTimestamps();
    ts[notesActiveTopic] = Date.now();
    saveNotesTimestamps(ts);
  }
}

function updateTopicTooltip(topic) {
  const chip = document.querySelector(`.notes-topic[data-topic="${CSS.escape(topic)}"]`);
  if (chip) {
    const ts = getNotesTimestamps();
    if (ts[topic]) {
      chip.title = `Змінено: ${formatDate(ts[topic])}`;
    }
  }
}

function autoResize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

function deleteTopic(topic, container) {
  const topics = getNotesTopics().filter(t => t !== topic);
  saveNotesTopics(topics);
  const data = getNotesData();
  delete data[topic];
  saveNotesData(data);
  const ts = getNotesTimestamps();
  delete ts[topic];
  saveNotesTimestamps(ts);
  if (notesActiveTopic === topic) {
    notesActiveTopic = topics[0];
    localStorage.setItem(NOTES_ACTIVE_KEY, notesActiveTopic);
  }
  renderNotesUI(container);
}
