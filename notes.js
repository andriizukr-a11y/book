/* ---------- NOTES ---------- */

const NOTES_STORAGE_KEY = 'notes_data';
const NOTES_TOPICS_KEY = 'notes_topics';
const NOTES_ACTIVE_KEY = 'notes_active_topic';
const NOTES_TIMESTAMPS_KEY = 'notes_timestamps';
const NOTES_GROUPS_KEY = 'notes_groups';
const NOTES_TOPIC_GROUPS_KEY = 'notes_topic_groups';
const NOTES_MAIN_GROUP_KEY = 'notes_main_group';
const NOTES_COLLAPSED_KEY = 'notes_collapsed_groups';
const SAVE_DELAY = 500;

let notesActiveTopic = null;
let notesSaveTimer = null;

function getNotesData() {
  try { return JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveNotesData(data) { localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(data)); }

function getNotesTopics() {
  try {
    const topics = JSON.parse(localStorage.getItem(NOTES_TOPICS_KEY));
    if (topics && topics.length) return topics;
  } catch {}
  return [getMainGroupName()];
}
function saveNotesTopics(topics) { localStorage.setItem(NOTES_TOPICS_KEY, JSON.stringify(topics)); }

function getNotesTimestamps() {
  try { return JSON.parse(localStorage.getItem(NOTES_TIMESTAMPS_KEY)) || {}; }
  catch { return {}; }
}
function saveNotesTimestamps(ts) { localStorage.setItem(NOTES_TIMESTAMPS_KEY, JSON.stringify(ts)); }

function getNotesGroups() {
  try {
    const g = JSON.parse(localStorage.getItem(NOTES_GROUPS_KEY));
    if (g && g.length) {
      const mainGroupName = getMainGroupName();
      const hasMainGroup = g.includes(mainGroupName);
      
      // Ensure main group exists and remove duplicates
      if (!hasMainGroup) {
        // Check for old hardcoded "Загальне" and replace it
        const oldIndex = g.indexOf('Загальне');
        if (oldIndex !== -1 && mainGroupName !== 'Загальне') {
          g[oldIndex] = mainGroupName;
        } else {
          g.unshift(mainGroupName);
        }
        saveNotesGroups(g);
      } else {
        // Remove any duplicates of the main group
        const filteredGroups = g.filter((name, index) => name !== mainGroupName || index === g.indexOf(mainGroupName));
        if (filteredGroups.length !== g.length) {
          saveNotesGroups(filteredGroups);
          return filteredGroups;
        }
      }
      return g;
    }
  } catch {}
  return [getMainGroupName()];
}
function saveNotesGroups(groups) { localStorage.setItem(NOTES_GROUPS_KEY, JSON.stringify(groups)); }

function getTopicGroups() {
  try { 
    const tg = JSON.parse(localStorage.getItem(NOTES_TOPIC_GROUPS_KEY)) || {};
    
    // Migrate old hardcoded "Загальне" to the configurable main group name
    const mainGroupName = getMainGroupName();
    let needsSave = false;
    
    for (const topic in tg) {
      if (tg[topic] === 'Загальне' && mainGroupName !== 'Загальне') {
        tg[topic] = mainGroupName;
        needsSave = true;
      }
    }
    
    if (needsSave) {
      saveTopicGroups(tg);
    }
    
    return tg;
  } catch { return {}; }
}
function saveTopicGroups(map) { localStorage.setItem(NOTES_TOPIC_GROUPS_KEY, JSON.stringify(map)); }

function getTopicGroup(topic) { return getTopicGroups()[topic] || getMainGroupName(); }

function getCollapsedGroups() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_COLLAPSED_KEY)) || [];
  } catch { return []; }
}

function saveCollapsedGroups(arr) {
  localStorage.setItem(NOTES_COLLAPSED_KEY, JSON.stringify(arr));
}

function getMainGroupName() {
  try {
    const name = localStorage.getItem(NOTES_MAIN_GROUP_KEY);
    if (name && name.trim()) return name.trim();
  } catch {}
  return 'Загальне';
}

function setMainGroupName(name) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  localStorage.setItem(NOTES_MAIN_GROUP_KEY, trimmed);
  return true;
}

function getEditTime() {
  const ts = getNotesTimestamps();
  const stamp = ts[notesActiveTopic];
  return stamp ? `${formatDate(stamp)}` : '';
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
      return `<div class="notes-topic-item${activeClass}" data-topic="${escapeHtml(t)}" draggable="true"><span class="notes-topic-name">${escapeHtml(t)}</span></div>`;
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

  container.innerHTML = `
    <div class="notes-layout">
      <div class="notes-sidebar">
        <div class="notes-sidebar-list" id="notes-sidebar-list">
          ${groupsHtml}
          <div class="notes-group-add" id="notes-group-add" title="Нова група">+</div>
        </div>
      </div>
      <div class="notes-editor">
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
    </div>
  `;

  bindNotesEvents(container);
}

function bindNotesEvents(container) {
  const editor = container.querySelector('#notes-textarea');
  const statusEl = container.querySelector('#notes-status');
  const ctxToolbar = container.querySelector('#notes-ctx-toolbar');

  // Placeholder management
  function updatePlaceholder() {
    const isEmpty = isEditorEmpty(editor);
    editor.classList.toggle('empty', isEmpty);
  }

  function isEditorEmpty(editor) {
    const content = editor.innerHTML.trim();
    if (!content || content === '<br>') return true;
    
    // Check if content contains only empty tags
    const temp = document.createElement('div');
    temp.innerHTML = content;
    const text = temp.textContent.trim();
    return text === '';
  }

  // Initial placeholder state
  updatePlaceholder();

  // --- Floating context toolbar ---
  function updateCtxToolbarState() {
    ctxToolbar.querySelectorAll('.notes-tb-btn').forEach(btn => {
      const cmd = btn.dataset.cmd;
      if (cmd) btn.classList.toggle('active', document.queryCommandState(cmd));
    });
  }

  function positionCtxToolbar() {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) {
      ctxToolbar.classList.remove('visible');
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      ctxToolbar.classList.remove('visible');
      return;
    }

    // Don't show for image selections
    const ancestor = range.commonAncestorContainer;
    if (ancestor.nodeName === 'IMG' || (ancestor.nodeType === Node.ELEMENT_NODE && ancestor.querySelector('img'))) {
      ctxToolbar.classList.remove('visible');
      return;
    }

    const tw = ctxToolbar.offsetWidth;
    const th = ctxToolbar.offsetHeight;
    const gap = 10;

    let left = rect.left + rect.width / 2 - tw / 2;
    let top = rect.top - th - gap;

    if (top < 8) top = rect.bottom + gap;
    if (left < 8) left = 8;
    if (left + tw > window.innerWidth - 8) left = window.innerWidth - tw - 8;

    ctxToolbar.style.left = left + 'px';
    ctxToolbar.style.top = top + 'px';
    ctxToolbar.classList.add('visible');
    updateCtxToolbarState();
  }

  function hideCtxToolbar() {
    ctxToolbar.classList.remove('visible');
  }

  // Show on selection
  editor.addEventListener('mouseup', () => {
    setTimeout(positionCtxToolbar, 0);
  });
  editor.addEventListener('keyup', e => {
    if (e.shiftKey || e.key.startsWith('Arrow')) {
      setTimeout(positionCtxToolbar, 0);
    }
  });

  // Hide on blur / click outside
  document.addEventListener('mousedown', e => {
    if (!ctxToolbar.contains(e.target) && !editor.contains(e.target)) {
      hideCtxToolbar();
    }
  });

  // Hide on scroll
  editor.addEventListener('scroll', hideCtxToolbar);
  window.addEventListener('scroll', hideCtxToolbar, true);

  // Formatting buttons
  ctxToolbar.querySelectorAll('.notes-tb-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      document.execCommand(cmd, false, null);
      editor.focus();
      setTimeout(positionCtxToolbar, 0);
    });
  });

  // Checklist button
  const ctxChecklistBtn = container.querySelector('#notes-ctx-checklist');
  ctxChecklistBtn.addEventListener('mousedown', e => {
    e.preventDefault();
    editor.focus();
    insertChecklistItem(editor);
    hideCtxToolbar();
  });

  // Handle keyboard shortcuts
  editor.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
    if (e.ctrlKey && e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
    if (e.ctrlKey && e.key === 'u') { e.preventDefault(); document.execCommand('underline'); }
    if (e.ctrlKey && e.shiftKey && e.key === 'C') { e.preventDefault(); insertChecklistItem(editor); }
    if (e.key === 'Enter' && !e.shiftKey) {
      const checklistItem = e.target.closest('.notes-checklist-item');
      if (!checklistItem) {
        e.preventDefault();
        document.execCommand('insertLineBreak');
      }
    }
  });

  // Checklist: Space triggers conversion
  editor.addEventListener('keydown', e => {
    if (e.key === ' ') { handleChecklistSpace(editor, e); }
    if (e.key === 'Enter' && !e.shiftKey) { handleChecklistEnter(editor, e); }
    if (e.key === 'Backspace') { handleChecklistBackspace(editor, e); }
  });

  // Checklist: click to toggle
  editor.addEventListener('click', e => {
    handleChecklistClick(editor, e);
  });

  // Paste images from clipboard
  editor.addEventListener('paste', e => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = () => {
          const sel = window.getSelection();
          if (!sel.rangeCount) return;
          const range = sel.getRangeAt(0);
          range.deleteContents();

          const img = document.createElement('img');
          img.src = reader.result;
          img.alt = 'Зображення';

          const wrapper = document.createElement('div');
          wrapper.className = 'notes-img-wrapper';
          wrapper.appendChild(img);
          wrapper.appendChild(document.createElement('br'));

          range.insertNode(wrapper);
          range.setStartAfter(wrapper);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);

          editor.dispatchEvent(new Event('input', { bubbles: true }));
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  });

  editor.addEventListener('input', () => {
    updatePlaceholder();
    clearTimeout(notesSaveTimer);
    statusEl.textContent = 'Збереження...';
    statusEl.className = 'notes-status saving';
    notesSaveTimer = setTimeout(() => {
      wrapImages(editor);
      saveCurrentNote(editor.innerHTML);
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

  // Group collapse
  container.querySelectorAll('.notes-group-header').forEach(header => {
    header.addEventListener('click', () => {
      const group = header.parentElement;
      const collapsed = group.classList.toggle('collapsed');
      const groupName = group.dataset.group;
      const arr = getCollapsedGroups();
      if (collapsed) {
        if (!arr.includes(groupName)) arr.push(groupName);
      } else {
        const idx = arr.indexOf(groupName);
        if (idx !== -1) arr.splice(idx, 1);
      }
      saveCollapsedGroups(arr);
    });
  });

  // Group rename (middle-click)
  container.querySelectorAll('.notes-group-header').forEach(header => {
    header.addEventListener('auxclick', e => {
      if (e.button !== 1) return;
      e.preventDefault();
      e.stopPropagation();
      const groupEl = header.parentElement;
      if (header.querySelector('.notes-topic-input')) return;
      const oldName = groupEl.dataset.group;
      const nameEl = header.querySelector('.notes-group-name');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'notes-topic-input';
      input.value = oldName;

      const commit = () => {
        const trimmed = input.value.trim();
        input.remove();
        nameEl.style.display = '';
        if (!trimmed || trimmed === oldName) return;
        
        if (oldName === getMainGroupName()) {
          setMainGroupName(trimmed);
          const tg = getTopicGroups();
          for (const k in tg) { if (tg[k] === oldName) tg[k] = trimmed; }
          saveTopicGroups(tg);
          const groups = getNotesGroups();
          const index = groups.indexOf(oldName);
          if (index !== -1) {
            groups[index] = trimmed;
            saveNotesGroups(groups);
          }
        } else {
          const groups = getNotesGroups();
          if (groups.includes(trimmed)) return;
          const idx = groups.indexOf(oldName);
          groups[idx] = trimmed;
          saveNotesGroups(groups);
          const tg = getTopicGroups();
          for (const k in tg) { if (tg[k] === oldName) tg[k] = trimmed; }
          saveTopicGroups(tg);
        }
        renderNotesUI(container);
      };

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { input.remove(); nameEl.style.display = ''; }
      });
      input.addEventListener('blur', commit);

      nameEl.style.display = 'none';
      nameEl.parentElement.appendChild(input);
      input.focus();
    });
  });

  // Helper: open topic input for a group
  function startAddTopic(groupEl) {
    if (groupEl.querySelector('.notes-topic-input')) return;
    const groupName = groupEl.dataset.group;
    const topicsContainer = groupEl.querySelector('.notes-group-topics');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'notes-topic-input';
    input.placeholder = 'Нова тема...';

    const commit = () => {
      const name = input.value.trim();
      input.remove();
      if (!name) return;
      const topics = getNotesTopics();
      if (topics.includes(name)) { showToast('Така тема вже існує'); return; }
      topics.push(name);
      saveNotesTopics(topics);
      const tg = getTopicGroups();
      tg[name] = groupName;
      saveTopicGroups(tg);
      notesActiveTopic = name;
      localStorage.setItem(NOTES_ACTIVE_KEY, notesActiveTopic);
      renderNotesUI(container);
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { input.remove(); }
    });
    input.addEventListener('blur', commit);

    topicsContainer.appendChild(input);
    input.focus();
  }

  // Count click — expand group if collapsed, then add topic
  container.querySelectorAll('.notes-group-count').forEach(count => {
    count.addEventListener('click', e => {
      e.stopPropagation();
      const groupEl = count.closest('.notes-group');
      if (groupEl.querySelector('.notes-topic-input')) return;
      if (groupEl.classList.contains('collapsed')) {
        groupEl.classList.remove('collapsed');
        const groupName = groupEl.dataset.group;
        const arr = getCollapsedGroups();
        const idx = arr.indexOf(groupName);
        if (idx !== -1) arr.splice(idx, 1);
        saveCollapsedGroups(arr);
      }
      startAddTopic(groupEl);
    });
  });

  // Click on empty space in group topics — add topic
  container.querySelectorAll('.notes-group-topics').forEach(topicsContainer => {
    topicsContainer.addEventListener('click', e => {
      if (e.target !== topicsContainer) return;
      startAddTopic(topicsContainer.closest('.notes-group'));
    });
  });

  // Subtle new group
  const groupAdd = container.querySelector('#notes-group-add');
  groupAdd.addEventListener('click', () => {
    if (groupAdd.querySelector('input')) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'notes-group-add-input';
    input.placeholder = 'Назва групи';

    const commit = () => {
      const name = input.value.trim();
      input.remove();
      groupAdd.style.display = '';
      if (!name) return;
      const groups = getNotesGroups();
      if (groups.includes(name)) { showToast('Така група вже існує'); return; }
      groups.push(name);
      saveNotesGroups(groups);
      renderNotesUI(container);
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { input.remove(); groupAdd.style.display = ''; }
    });
    input.addEventListener('blur', commit);

    groupAdd.style.display = 'none';
    groupAdd.parentElement.appendChild(input);
    input.focus();
  });

  // Group dblclick — add topic
  container.querySelectorAll('.notes-group').forEach(group => {
    group.addEventListener('dblclick', e => {
      if (e.target.closest('.notes-topic-item') || e.target.closest('.notes-topic-input')) return;
      startAddTopic(group);
    });
  });


  // Group contextmenu (delete)
  container.querySelectorAll('.notes-group-header').forEach(header => {
    header.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      const groupEl = header.parentElement;
      const groupName = groupEl.dataset.group;
      const groups = getNotesGroups();
      if (groupName === getMainGroupName()) { showToast(`Не можна видалити групу «${getMainGroupName()}»`); return; }
      if (groups.length <= 1) { showToast('Не можна видалити останню групу'); return; }
      showConfirm(`Видалити групу «${groupName}»? Усі теми перейдуть у «${getMainGroupName()}».`, () => {
        const newGroups = groups.filter(g => g !== groupName);
        saveNotesGroups(newGroups);
        const tg = getTopicGroups();
        for (const k in tg) { if (tg[k] === groupName) tg[k] = getMainGroupName(); }
        saveTopicGroups(tg);
        renderNotesUI(container);
      });
    });
  });

  // Group drag-and-drop
  let draggedGroup = null;
  container.querySelectorAll('.notes-group').forEach(group => {
    group.addEventListener('dragstart', e => {
      if (e.target.closest('.notes-topic-item')) return;
      draggedGroup = group;
      group.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    group.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    group.addEventListener('dragenter', e => {
      if (draggedGroup && group !== draggedGroup) group.classList.add('drag-over');
      if (draggedTopic && !group.contains(draggedTopic)) group.classList.add('topic-drag-over');
    });
    group.addEventListener('dragleave', e => {
      if (!group.contains(e.relatedTarget)) {
        group.classList.remove('drag-over');
        group.classList.remove('topic-drag-over');
      }
    });
    group.addEventListener('drop', e => {
      e.stopPropagation();
      if (draggedTopic) {
        const newGroup = group.dataset.group;
        const topicsContainer = group.querySelector('.notes-group-topics');
        topicsContainer.appendChild(draggedTopic);
        const tg = getTopicGroups();
        tg[draggedTopic.dataset.topic] = newGroup;
        saveTopicGroups(tg);
        const allTopics = [...container.querySelectorAll('.notes-topic-item')].map(el => el.dataset.topic);
        saveNotesTopics(allTopics);
        return;
      }
      if (!draggedGroup || draggedGroup === group) return;
      const list = container.querySelector('#notes-sidebar-list');
      const items = [...list.querySelectorAll('.notes-group')];
      const di = items.indexOf(draggedGroup);
      const ti = items.indexOf(group);
      if (di < ti) list.insertBefore(draggedGroup, group.nextSibling);
      else list.insertBefore(draggedGroup, group);
      saveNotesGroups([...list.querySelectorAll('.notes-group')].map(el => el.dataset.group));
    });
    group.addEventListener('dragend', () => {
      group.classList.remove('dragging');
      container.querySelectorAll('.notes-group').forEach(el => {
        el.classList.remove('drag-over');
        el.classList.remove('topic-drag-over');
      });
      draggedGroup = null;
    });
  });

  let draggedTopic = null;

  container.querySelectorAll('.notes-topic-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.classList.contains('active')) return;
      saveCurrentNoteSilent();
      notesActiveTopic = item.dataset.topic;
      localStorage.setItem(NOTES_ACTIVE_KEY, notesActiveTopic);
      renderNotesUI(container);
    });

    item.addEventListener('dragstart', e => {
      draggedTopic = item;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    item.addEventListener('dragenter', e => {
      if (item !== draggedTopic) item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', e => {
      e.stopPropagation();
      if (draggedTopic === item) return;
      const targetGroup = item.closest('.notes-group');
      const topicsContainer = targetGroup.querySelector('.notes-group-topics');
      const items = [...topicsContainer.querySelectorAll('.notes-topic-item')];
      const di = items.indexOf(draggedTopic);
      const ti = items.indexOf(item);
      if (di === -1) {
        topicsContainer.insertBefore(draggedTopic, item);
      } else {
        if (di < ti) topicsContainer.insertBefore(draggedTopic, item.nextSibling);
        else topicsContainer.insertBefore(draggedTopic, item);
      }
      const newGroup = targetGroup.dataset.group;
      const tg = getTopicGroups();
      tg[draggedTopic.dataset.topic] = newGroup;
      saveTopicGroups(tg);
      const allTopics = [...container.querySelectorAll('.notes-topic-item')].map(el => el.dataset.topic);
      saveNotesTopics(allTopics);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      container.querySelectorAll('.notes-topic-item').forEach(el => el.classList.remove('drag-over'));
      container.querySelectorAll('.notes-group').forEach(el => el.classList.remove('topic-drag-over'));
      draggedTopic = null;
    });

    item.addEventListener('contextmenu', e => {
      e.preventDefault();
      const topic = item.dataset.topic;
      const topics = getNotesTopics();
      if (topics.length <= 1) {
        showToast('Не можна видалити останню тему');
        return;
      }
      showConfirm(`Видалити тему «${topic}»?`, () => {
        deleteTopic(topic, container);
      });
    });

    item.addEventListener('dblclick', e => {
      if (item.querySelector('.notes-topic-input')) return;
      const oldName = item.dataset.topic;
      const nameEl = item.querySelector('.notes-topic-name');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'notes-topic-input';
      input.value = oldName;

      const commit = () => {
        const trimmed = input.value.trim();
        input.remove();
        nameEl.style.display = '';
        if (!trimmed || trimmed === oldName) return;
        const topics = getNotesTopics();
        if (topics.includes(trimmed)) return;
        const idx = topics.indexOf(oldName);
        topics[idx] = trimmed;
        saveNotesTopics(topics);
        const data = getNotesData();
        if (data[oldName]) { data[trimmed] = data[oldName]; delete data[oldName]; saveNotesData(data); }
        const ts = getNotesTimestamps();
        if (ts[oldName]) { ts[trimmed] = ts[oldName]; delete ts[oldName]; saveNotesTimestamps(ts); }
        const tg = getTopicGroups();
        if (tg[oldName]) { tg[trimmed] = tg[oldName]; delete tg[oldName]; saveTopicGroups(tg); }
        if (notesActiveTopic === oldName) {
          notesActiveTopic = trimmed;
          localStorage.setItem(NOTES_ACTIVE_KEY, notesActiveTopic);
        }
        renderNotesUI(container);
      };

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { input.remove(); nameEl.style.display = ''; }
      });
      input.addEventListener('blur', commit);

      nameEl.style.display = 'none';
      nameEl.parentNode.insertBefore(input, nameEl.nextSibling);
      input.focus();
    });
  });
}

function saveCurrentNote(content) {
  const data = getNotesData();
  data[notesActiveTopic] = serializeChecklists(content);
  saveNotesData(data);
  const ts = getNotesTimestamps();
  ts[notesActiveTopic] = Date.now();
  saveNotesTimestamps(ts);
  const statusEl = document.getElementById('notes-status');
  if (statusEl) statusEl.textContent = getEditTime();
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

function showConfirm(message, onConfirm) {
  const existing = document.querySelector('.notes-confirm-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'notes-confirm-overlay';
  overlay.innerHTML = `
    <div class="notes-confirm-box">
      <div class="notes-confirm-msg">${escapeHtml(message)}</div>
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

  document.querySelector('.notes-layout').appendChild(overlay);
  overlay.querySelector('.notes-confirm-cancel').focus();
}

/* ---------- CHECKLISTS ---------- */

function serializeChecklists(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  const items = div.querySelectorAll('.notes-checklist-item');
  items.forEach((item, index) => {
    const cb = item.querySelector('.notes-checklist');
    const textEl = item.querySelector('.notes-checklist-text');
    if (!cb || !textEl) return;
    const checked = cb.classList.contains('checked');
    const text = textEl.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/&nbsp;/g, ' ').trim();
    const marker = checked ? '- [x]' : '- [ ]';
    const replacement = document.createTextNode(marker + ' ' + text);
    item.replaceWith(replacement);
    if (index < items.length - 1) {
      replacement.after(document.createElement('br'));
    }
  });
  return div.innerHTML;
}

function deserializeChecklists(html) {
  const normalized = html.replace(/<br\s*\/?>/gi, '\n');
  return normalized.replace(/(^|\n)-\s*\[(\s*)\]\s*(.*)$/gmi, (_, newline, check, text) => {
    const checked = check.toLowerCase() === 'x';
    const escapedText = text.replace(/\n/g, '<br>');
    return `${newline}<div class="notes-checklist-item"><span class="notes-checklist${checked ? ' checked' : ''}" contenteditable="false"></span><span class="notes-checklist-text">${escapedText}</span></div>`;
  });
}

function getChecklistItem(el) {
  if (el.nodeType === Node.TEXT_NODE) el = el.parentNode;
  return el ? el.closest('.notes-checklist-item') : null;
}

function getChecklistText(el) {
  const item = getChecklistItem(el);
  return item ? item.querySelector('.notes-checklist-text') : null;
}

function isEmptyChecklist(textEl) {
  if (!textEl) return true;
  const html = textEl.innerHTML.replace(/<br\s*\/?>/gi, '').replace(/&nbsp;/g, '').trim();
  return html === '' || html === '<br>';
}

function focusChecklistText(textEl, atStart = true) {
  if (!textEl) return;
  const range = document.createRange();
  const sel = window.getSelection();
  if (atStart) {
    range.setStart(textEl, 0);
  } else {
    if (textEl.childNodes.length) {
      const last = textEl.childNodes[textEl.childNodes.length - 1];
      if (last.nodeType === Node.TEXT_NODE) {
        range.setStart(last, last.textContent.length);
      } else {
        range.setStartAfter(last);
      }
    } else {
      range.setStart(textEl, 0);
    }
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function insertChecklistItem(editor, checked = false, text = '') {
  const sel = window.getSelection();
  const range = sel.getRangeAt(0);
  
  const item = document.createElement('div');
  item.className = 'notes-checklist-item';
  item.innerHTML = `<span class="notes-checklist${checked ? ' checked' : ''}" contenteditable="false"></span><span class="notes-checklist-text">${text || '<br>'}</span>`;
  
  range.insertNode(item);
  range.setStartAfter(item);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  
  const textEl = item.querySelector('.notes-checklist-text');
  if (textEl) focusChecklistText(textEl, true);
  
  return item;
}

function handleChecklistEnter(editor, e) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  
  const node = sel.anchorNode;
  const textEl = getChecklistText(node);
  if (!textEl) return;
  
  e.preventDefault();
  
  if (isEmptyChecklist(textEl)) {
    const item = getChecklistItem(textEl);
    const div = document.createElement('div');
    div.innerHTML = '<br>';
    item.replaceWith(div);
    const range = document.createRange();
    range.setStart(div, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    return;
  }
  
  const item = getChecklistItem(textEl);
  const newItem = document.createElement('div');
  newItem.className = 'notes-checklist-item';
  newItem.innerHTML = '<span class="notes-checklist" contenteditable="false"></span><span class="notes-checklist-text"><br></span>';
  
  item.after(newItem);
  const newText = newItem.querySelector('.notes-checklist-text');
  if (newText) focusChecklistText(newText, true);
}

function handleChecklistBackspace(editor, e) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  
  const range = sel.getRangeAt(0);
  const node = sel.anchorNode;
  const textEl = getChecklistText(node);
  if (!textEl) return;
  
  if (!isEmptyChecklist(textEl)) return;
  if (range.startOffset !== 0) return;
  
  e.preventDefault();
  
  const item = getChecklistItem(textEl);
  const div = document.createElement('div');
  div.innerHTML = '<br>';
  item.replaceWith(div);
  
  const newRange = document.createRange();
  newRange.setStart(div, 0);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

function handleChecklistSpace(editor, e) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return;
  
  const text = node.textContent;
  const offset = range.startOffset;
  const beforeCursor = text.substring(0, offset);
  const lineStart = beforeCursor.lastIndexOf('\n') + 1;
  const lineContent = beforeCursor.substring(lineStart);
  
  const match = lineContent.match(/^-\s*\[(\s*)\]\s$/);
  if (!match) return;
  
  e.preventDefault();
  
  const isChecked = match[1].toLowerCase() === 'x';
  const afterCursor = text.substring(offset);
  
  const parent = node.parentNode;
  const beforeText = text.substring(0, lineStart);
  
  node.textContent = beforeText + afterCursor;
  range.setStart(node, lineStart);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  
  const item = document.createElement('div');
  item.className = 'notes-checklist-item';
  item.innerHTML = `<span class="notes-checklist${isChecked ? ' checked' : ''}" contenteditable="false"></span><span class="notes-checklist-text"><br></span>`;
  
  range.insertNode(item);
  range.setStartAfter(item);
  sel.removeAllRanges();
  sel.addRange(range);
  
  const textEl = item.querySelector('.notes-checklist-text');
  if (textEl) focusChecklistText(textEl, true);
}

function handleChecklistClick(editor, e) {
  const cb = e.target.closest('.notes-checklist');
  if (!cb) return;
  
  e.preventDefault();
  cb.classList.toggle('checked');
  
  const item = getChecklistItem(cb);
  const textEl = item ? item.querySelector('.notes-checklist-text') : null;
  if (textEl) focusChecklistText(textEl, true);
  
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

function wrapImages(editor) {
  editor.querySelectorAll('img:not(.notes-img-wrapper img)').forEach(img => {
    if (img.closest('.notes-img-wrapper')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'notes-img-wrapper';
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);
  });
}

function showToast(message) {
  const existing = document.querySelector('.notes-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'notes-toast';
  toast.textContent = message;
  document.querySelector('.notes-layout').appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}
