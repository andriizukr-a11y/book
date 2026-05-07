/* ---------- NOTES UI ---------- */

const SAVE_DELAY = 500;

let notesActiveTopic = null;
let notesSaveTimer = null;
let notesStatusTimers = [];
let notesSyncError = null;

function getNotesWarningHtml() {
  if (notesSyncError) {
    return `<div class="notes-local-warning notes-sync-error">⚠ Помилка синхронізації: ${escapeHtml(notesSyncError)}. <a href="#" id="notes-setup-sync">Налаштувати</a></div>`;
  }
  if (gistStorage.config.enabled && !gistStorage.config.token) {
    return '<div class="notes-local-warning notes-sync-error">⚠ Помилка синхронізації Gist: не вказано токен. <a href="#" id="notes-setup-sync">Налаштувати</a></div>';
  }
  if (fileStorage.config.enabled && !fileStorage.fileHandle) {
    return '<div class="notes-local-warning notes-sync-error">⚠ Помилка синхронізації файлу: файл не вибрано. <a href="#" id="notes-setup-sync">Налаштувати</a></div>';
  }
  if (!gistStorage.isEnabled() && !fileStorage.isEnabled()) {
    return '<div class="notes-local-warning">⚠ Нотатки зберігаються лише в браузері. <a href="#" id="notes-setup-sync">Налаштувати синхронізацію</a></div>';
  }
  return '';
}

function renderNotesUI(container) {
  notesStatusTimers.forEach(clearTimeout);
  notesStatusTimers = [];

  const groups = getNotesGroups();
  const topics = getNotesTopics();
  const topicGroups = getTopicGroups();
  const data = getNotesData();
  const content = deserializeChecklists(data[notesActiveTopic] || '');

  let groupsHtml = groups.map(g => {
    const groupTopics = topics.filter(t => {
      const tg = topicGroups[t] || getMainGroupName();
      return groups.includes(tg) ? tg === g : g === getMainGroupName();
    });
    const topicsHtml = groupTopics.map(t => {
      const activeClass = t === notesActiveTopic ? ' active' : '';
      return `<div class="notes-topic-item${activeClass}" data-topic="${escapeHtml(t)}" draggable="true"><span class="notes-topic-name">${escapeHtml(t) || '(empty)'}</span></div>`;
    }).join('');
    const collapsedClass = getCollapsedGroups().includes(g) ? ' collapsed' : '';
    return `
      <div class="notes-group${collapsedClass}" data-group="${escapeHtml(g)}" draggable="true">
        <div class="notes-group-header">
          <span class="notes-group-arrow"></span>
          <span class="notes-group-name">${escapeHtml(g)}</span>
          <span class="notes-group-count">${groupTopics.length}</span>
        </div>
        <div class="notes-group-topics">${topicsHtml}</div>
      </div>`;
  }).join('');

  const savedSidebarWidth = localStorage.getItem('notes_sidebar_width') || 240;
  const clampedSidebarWidth = Math.max(180, Math.min(400, parseInt(savedSidebarWidth)));
  const savedLayoutWidth = localStorage.getItem('notes_layout_width') || 900;
  const clampedLayoutWidth = Math.max(600, Math.min(window.innerWidth * 0.95, parseInt(savedLayoutWidth)));

  container.innerHTML = `
    <div class="notes-layout" style="width: ${clampedLayoutWidth}px">
      <div class="notes-sidebar" style="width: ${clampedSidebarWidth}px">
        <div class="notes-sidebar-list" id="notes-sidebar-list">
          ${groupsHtml}
        </div>
        <div class="notes-sidebar-actions">
          <div class="notes-gist-settings-btn" id="notes-gist-settings-btn" title="Налаштування синхронізації">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </div>
          <div class="notes-group-add" id="notes-group-add" title="Нова група">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
        </div>
        <div class="notes-sidebar-resizer" id="notes-sidebar-resizer"></div>
      </div>
      <div class="notes-editor">
        ${getNotesWarningHtml()}
        <div class="notes-ctx-toolbar" id="notes-ctx-toolbar">
          <button class="notes-tb-btn" data-cmd="bold" title="Жирний (Ctrl+B)"><b>B</b></button>
          <button class="notes-tb-btn" data-cmd="italic" title="Курсив (Ctrl+I)"><i>I</i></button>
          <button class="notes-tb-btn" data-cmd="underline" title="Підкреслений (Ctrl+U)"><u>U</u></button>
          <button class="notes-tb-btn" data-cmd="strikeThrough" title="Закреслений"><s>S</s></button>
          <span class="notes-tb-sep"></span>
          <button class="notes-tb-btn" data-cmd="insertUnorderedList" title="Маркований список">•</button>
          <button class="notes-tb-btn" data-cmd="insertOrderedList" title="Нумерований список">#</button>
          <span class="notes-tb-sep"></span>
          <button class="notes-tb-btn notes-ctx-checklist-btn" id="notes-ctx-checklist" title="Чекліст (Ctrl+Shift+C)">☑</button>
        </div>
        <div class="notes-textarea" id="notes-textarea" contenteditable="true" placeholder="Почніть писати...">${content}</div>
        <div class="notes-status" id="notes-status">${getEditTime()}</div>
      </div>
      <div class="notes-layout-resizer" id="notes-layout-resizer"></div>
    </div>
  `;

  bindNotesEvents(container);
  if (typeof addGistSettingsButton === 'function') {
    setTimeout(() => addGistSettingsButton(), 0);
  }
}

function saveCurrentNote(content) {
  const data = getNotesData();
  data[notesActiveTopic] = serializeChecklists(content);
  saveNotesData(data);
  const ts = getNotesTimestamps();
  ts[notesActiveTopic] = Date.now();
  saveNotesTimestamps(ts);
}

function saveCurrentNoteSilent() {
  const editor = document.querySelector('#notes-textarea');
  if (editor) {
    const data = getNotesData();
    const oldContent = data[notesActiveTopic] || '';
    const newContent = serializeChecklists(editor.innerHTML);
    if (oldContent === newContent) return;
    data[notesActiveTopic] = newContent;
    saveNotesData(data);
    const ts = getNotesTimestamps();
    ts[notesActiveTopic] = Date.now();
    saveNotesTimestamps(ts);
  }
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
  const tg = getTopicGroups();
  delete tg[topic];
  saveTopicGroups(tg);
  if (notesActiveTopic === topic) {
    notesActiveTopic = topics[0];
    localStorage.setItem(NOTES_ACTIVE_KEY, notesActiveTopic);
  }
  renderNotesUI(container);
}
