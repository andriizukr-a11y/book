/* ---------- TASKS ---------- */

const TASKS_STORAGE_KEY = 'tasks_data';
const TASKS_DATE_KEY = 'tasks_last_date';

function getTasksData() {
  try {
    return JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY)) || [];
  } catch { return []; }
}

function saveTasksData(data) {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(data));
}

function initTasks() {
  const output = document.getElementById('output-tasks');
  if (!output) return;
  checkDailyReset();
  renderTasksUI(output);
  scheduleMidnightReset();
}

function checkDailyReset() {
  const today = new Date().toDateString();
  const lastDate = localStorage.getItem(TASKS_DATE_KEY);
  if (lastDate !== today) {
    const tasks = getTasksData();
    let changed = false;
    tasks.forEach(t => { if (t.done) { t.done = false; changed = true; } });
    if (changed) saveTasksData(tasks);
    localStorage.setItem(TASKS_DATE_KEY, today);
  }
}

function scheduleMidnightReset() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight - now;
  setTimeout(() => {
    checkDailyReset();
    const output = document.getElementById('output-tasks');
    if (output) renderTasksUI(output);
    scheduleMidnightReset();
  }, msUntilMidnight);
}

function renderTasksUI(container) {
  const tasks = getTasksData();

  const tasksHtml = tasks.map((task, index) => {
    const checked = task.done ? ' checked' : '';
    const textClass = task.done ? ' done' : '';
    return `
      <div class="task-item" data-index="${index}">
        <label class="task-checkbox-label">
          <input type="checkbox" class="task-checkbox"${checked}>
          <span class="task-checkmark"></span>
        </label>
        <span class="task-text${textClass}">${escapeHtml(task.text)}</span>
        <button class="task-delete" title="Видалити">&times;</button>
      </div>
    `;
  }).join('');

  const emptyHtml = tasks.length === 0
    ? '<div class="no-results">Немає завдань</div>'
    : '';

  const doneCount = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;
  const progressHtml = totalCount > 0
    ? `<div class="tasks-progress">
        <div class="tasks-progress-bar">
          <div class="tasks-progress-fill" style="width:${Math.round((doneCount / totalCount) * 100)}%"></div>
        </div>
        <span class="tasks-progress-text">${doneCount} з ${totalCount}</span>
      </div>`
    : '';

  const wasFocused = document.activeElement && document.activeElement.id === 'tasks-add-input';

  container.innerHTML = `
    <div class="tasks-container">
      ${progressHtml}
      <div class="tasks-list" id="tasks-list">
        ${tasksHtml}
        ${emptyHtml}
      </div>
      <div class="tasks-add-wrapper">
        <textarea class="tasks-add-input" id="tasks-add-input" placeholder="Нове завдання..." autocomplete="off" rows="1"></textarea>
      </div>
    </div>
  `;

  if (wasFocused) {
    const newInput = container.querySelector('#tasks-add-input');
    if (newInput) setTimeout(() => newInput.focus(), 0);
  }

  bindTasksEvents(container);
}

function bindTasksEvents(container) {
  const addInput = container.querySelector('#tasks-add-input');

  function addTasks() {
    const raw = addInput.value.trim();
    if (!raw) return;
    const lines = raw.split(/\n/).map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;
    const tasks = getTasksData();
    lines.forEach(text => tasks.push({ text, done: false }));
    saveTasksData(tasks);
    addInput.value = '';
    addInput.style.height = 'auto';
    renderTasksUI(container);
    container.querySelector('#tasks-add-input')?.focus();
  }

  addInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTasks();
    }
  });

  addInput.addEventListener('paste', () => {
    setTimeout(() => {
      if (addInput.value.includes('\n')) {
        addTasks();
      }
    }, 0);
  });

  addInput.addEventListener('input', () => {
    addInput.style.height = 'auto';
    addInput.style.height = addInput.scrollHeight + 'px';
  });

  container.querySelectorAll('.task-item').forEach(item => {
    let clickTimer = null;

    item.addEventListener('click', e => {
      if (e.target.closest('.task-delete') || e.target.closest('.task-checkbox-label') || e.target.closest('.task-edit-input')) return;
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
        return;
      }
      clickTimer = setTimeout(() => {
        clickTimer = null;
        const index = parseInt(item.dataset.index);
        const tasks = getTasksData();
        if (tasks[index]) {
          tasks[index].done = !tasks[index].done;
          saveTasksData(tasks);
          renderTasksUI(container);
        }
      }, 250);
    });
  });

  container.querySelectorAll('.task-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const index = parseInt(cb.closest('.task-item').dataset.index);
      const tasks = getTasksData();
      if (tasks[index]) {
        tasks[index].done = cb.checked;
        saveTasksData(tasks);
        renderTasksUI(container);
      }
    });
  });

  container.querySelectorAll('.task-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.closest('.task-item').dataset.index);
      const tasks = getTasksData();
      tasks.splice(index, 1);
      saveTasksData(tasks);
      renderTasksUI(container);
    });
  });

  container.querySelectorAll('.task-text').forEach(textEl => {
    textEl.addEventListener('dblclick', () => {
      const item = textEl.closest('.task-item');
      const index = parseInt(item.dataset.index);
      const tasks = getTasksData();
      if (!tasks[index]) return;

      const oldText = tasks[index].text;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'task-edit-input';
      input.value = oldText;

      const commit = () => {
        const trimmed = input.value.trim();
        input.remove();
        textEl.style.display = '';
        if (!trimmed || trimmed === oldText) return;
        tasks[index].text = trimmed;
        saveTasksData(tasks);
        renderTasksUI(container);
      };

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { input.remove(); textEl.style.display = ''; }
      });
      input.addEventListener('blur', commit);

      textEl.style.display = 'none';
      textEl.parentNode.insertBefore(input, textEl.nextSibling);
      input.focus();
      input.select();
    });
  });
}
