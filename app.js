/* ---------- APP (TABS + LOADING) ---------- */

function fileId(filename) {
  return filename.replace(/\.xbel$/i, '').replace(/[^a-zA-Z0-9]/g, '_');
}

function createTabs() {
  const tabsContainer = document.getElementById('tabs-container');
  const contentsContainer = document.getElementById('contents-container');

  // Завантажуємо збережений порядок табів, додаємо нові таби з конфігу
  let tabsOrder = JSON.parse(localStorage.getItem('tabsOrder')) || CONFIG.tabs;
  CONFIG.tabs.forEach(t => { if (!tabsOrder.includes(t)) tabsOrder.push(t); });

  tabsOrder.forEach((tabName, index) => {
    const isSpecial = CONFIG.specialTabs && CONFIG.specialTabs[tabName];
    let id, fileName;

    if (isSpecial) {
      id = CONFIG.specialTabs[tabName];
      fileName = null;
    } else {
      const originalIndex = CONFIG.tabs.indexOf(tabName);
      fileName = `tab${originalIndex + 1}.xbel`;
      id = fileId(fileName);
    }

    // Створюємо кнопку таба
    const tabBtn = document.createElement('button');
    tabBtn.className = 'tab' + (index === 0 ? ' active' : '');
    tabBtn.draggable = true;
    tabBtn.onclick = () => switchTab(id);
    
    // Формуємо контент кнопки
    let tabContent = tabName;
    if (CONFIG.ui.showCounts && !isSpecial) {
      tabContent += ` <span class="tab-count" id="count-${id}">0</span>`;
    }
    
    tabBtn.innerHTML = tabContent;
    tabBtn.dataset.tabId = id;
    tabBtn.dataset.tabName = tabName;
    tabsContainer.appendChild(tabBtn);

    // Додаємо drag-and-drop події
    tabBtn.addEventListener('dragstart', handleDragStart);
    tabBtn.addEventListener('dragover', handleDragOver);
    tabBtn.addEventListener('dragenter', handleDragEnter);
    tabBtn.addEventListener('dragleave', handleDragLeave);
    tabBtn.addEventListener('drop', handleDrop);
    tabBtn.addEventListener('dragend', handleDragEnd);

    // Створюємо контент таба
    const content = document.createElement('div');
    content.id = `content-${id}`;
    content.className = 'tab-content' + (index === 0 ? ' active' : '');

    if (isSpecial) {
      content.innerHTML = `<div id="output-${id}"></div>`;
    } else {
      content.innerHTML = `
        <div class="search-wrapper">
          <input class="search-input" id="search-${id}" type="search" placeholder="Пошук..." autocomplete="off">
          <span class="search-count" id="search-count-${id}"></span>
        </div>
        <div id="output-${id}"></div>
      `;
    }
    contentsContainer.appendChild(content);

    // Зберігаємо дані таба
    bookmarksData[id] = {
      path: fileName ? `${CONFIG.dir}/${fileName}` : null,
      name: tabName,
      special: isSpecial ? CONFIG.specialTabs[tabName] : null
    };
  });

  if (tabsOrder.length > 0) {
    document.title = `${tabsOrder[0]} – ${CONFIG.ui.titleSuffix}`;
  }

  openTabFromHash();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  document.querySelector(`[data-tab-id="${tabId}"]`).classList.add('active');
  document.getElementById(`content-${tabId}`).classList.add('active');

  const searchEl = document.getElementById(`search-${tabId}`);
  if (searchEl) {
    searchEl.value = '';
    filterBookmarks(tabId, '');
  }

  // Оновлюємо title сторінки
  const tabData = bookmarksData[tabId];
  const tabName = tabData?.name || 'Посилання';
  document.title = `${tabName} – ${CONFIG.ui.titleSuffix}`;

  // Зберігаємо останній відкритий таб
  localStorage.setItem('lastTab', tabId);

  window.location.hash = tabId;

  if (tabId === 'notes') {
    const topics = getNotesTopics();
    let lastTopic = localStorage.getItem(NOTES_ACTIVE_KEY);
    if (!lastTopic || !topics.includes(lastTopic)) {
      lastTopic = topics[0];
    }
    if (lastTopic !== notesActiveTopic) {
      notesActiveTopic = lastTopic;
      const output = document.getElementById('output-notes');
      if (output && typeof renderNotesUI === 'function') {
        renderNotesUI(output);
      }
    }
  }

  if (tabId === 'tasks') {
    setTimeout(() => document.getElementById('tasks-add-input')?.focus(), 0);
  }
}

function openTabFromHash() {
  const hash = window.location.hash.replace('#', '');
  if (hash && document.querySelector(`[data-tab-id="${hash}"]`)) {
    switchTab(hash);
  } else {
    // Якщо немає hash, відкриваємо останній збережений таб
    const lastTab = localStorage.getItem('lastTab');
    if (lastTab && document.querySelector(`[data-tab-id="${lastTab}"]`)) {
      switchTab(lastTab);
    }
  }
}

async function loadFileData(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return parseBookmarks(await response.text());
  } catch (err) {
    throw new Error(`Не вдалося завантажити ${path}: ${err.message}`);
  }
}

async function loadDirectory() {
  createTabs();

  const loadPromises = CONFIG.tabs.map(async (tabName, index) => {
    const isSpecial = CONFIG.specialTabs && CONFIG.specialTabs[tabName];
    if (isSpecial) {
      const id = CONFIG.specialTabs[tabName];
      if (id === 'notes' && typeof initNotes === 'function') {
        initNotes();
      }
      if (id === 'tasks' && typeof initTasks === 'function') {
        initTasks();
      }
      return;
    }
    const fileName = `tab${index + 1}.xbel`;
    const id = fileId(fileName);
    try {
      const bookmarks = await loadFileData(`${CONFIG.dir}/${fileName}`);
      bookmarksData[id].bookmarks = bookmarks;
      displayBookmarks(id, bookmarks);
    } catch (err) {
      const output = document.getElementById(`output-${id}`);
      if (output) output.innerHTML = `<div class="error">Помилка: ${err.message}</div>`;
    }
  });

  await Promise.allSettled(loadPromises);
  document.getElementById('preloader').classList.add('hidden');
  initSearch();
}

function filterBookmarks(tabId, query) {
  const output = document.getElementById(`output-${tabId}`);
  if (!output) return;
  const q = query.trim().toLowerCase();
  const items = output.querySelectorAll('.bookmark-item');
  const separators = output.querySelectorAll('.separator');
  const total = items.length;
  let visible = 0;

  items.forEach(item => {
    const title = item.querySelector('.bookmark-title')?.textContent.toLowerCase() || '';
    const domain = item.querySelector('.bookmark-domain')?.textContent.toLowerCase() || '';
    const match = !q || title.includes(q) || domain.includes(q);
    item.style.display = match ? '' : 'none';
    if (match) visible++;
  });

  separators.forEach(sep => { sep.style.display = q ? 'none' : ''; });

  const countEl = document.getElementById(`search-count-${tabId}`);
  if (countEl) countEl.textContent = q ? `${visible} з ${total}` : '';

  const noResults = output.querySelector('.no-results-search');
  if (!q && noResults) { noResults.remove(); return; }
  if (q && visible === 0) {
    if (!noResults) {
      const el = document.createElement('div');
      el.className = 'no-results no-results-search';
      el.textContent = 'Нічого не знайдено';
      output.appendChild(el);
    }
  } else if (noResults) {
    noResults.remove();
  }
}

function initSearch() {
  document.querySelectorAll('.search-input').forEach(input => {
    const tabId = input.id.replace('search-', '');
    input.addEventListener('input', () => filterBookmarks(tabId, input.value));
  });
}

window.addEventListener('hashchange', openTabFromHash);

window.addEventListener('scroll', () => {
  document.getElementById('tabs-container').classList.toggle('scrolled', window.scrollY > 10);
});

document.addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName;
  const isInput = tag === 'INPUT' || tag === 'TEXTAREA';

  if ((e.key === '/' || e.key === 'f') && !isInput && !e.ctrlKey && !e.metaKey) {
    const activTab = document.querySelector('.tab.active');
    if (!activTab) return;
    const tabId = activTab.dataset.tabId;
    const searchEl = document.getElementById(`search-${tabId}`);
    if (searchEl) { e.preventDefault(); searchEl.focus(); searchEl.select(); }
    return;
  }

  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !isInput) {
    const tabs = [...document.querySelectorAll('.tab')];
    const activeIndex = tabs.findIndex(t => t.classList.contains('active'));
    if (activeIndex === -1) return;
    const next = e.key === 'ArrowRight'
      ? tabs[activeIndex + 1]
      : tabs[activeIndex - 1];
    if (next) switchTab(next.dataset.tabId);
  }

  if (e.key === 'Escape' && isInput) {
    document.activeElement.blur();
  }
});

/* ---------- DRAG-AND-DROP ДЛЯ ТАБІВ ---------- */

let draggedTab = null;

function handleDragStart(e) {
  draggedTab = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  if (this !== draggedTab) {
    this.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }

  if (draggedTab !== this) {
    const tabsContainer = document.getElementById('tabs-container');
    const allTabs = [...tabsContainer.querySelectorAll('.tab')];
    const draggedIndex = allTabs.indexOf(draggedTab);
    const dropIndex = allTabs.indexOf(this);

    if (draggedIndex < dropIndex) {
      tabsContainer.insertBefore(draggedTab, this.nextSibling);
    } else {
      tabsContainer.insertBefore(draggedTab, this);
    }

    // Зберігаємо новий порядок табів
    const newOrder = [...tabsContainer.querySelectorAll('.tab')].map(tab => tab.dataset.tabName);
    localStorage.setItem('tabsOrder', JSON.stringify(newOrder));

    // Також переміщуємо відповідний контент
    const contentsContainer = document.getElementById('contents-container');
    const draggedContent = document.getElementById(`content-${draggedTab.dataset.tabId}`);
    const dropContent = document.getElementById(`content-${this.dataset.tabId}`);

    if (draggedIndex < dropIndex) {
      contentsContainer.insertBefore(draggedContent, dropContent.nextSibling);
    } else {
      contentsContainer.insertBefore(draggedContent, dropContent);
    }
  }

  return false;
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('drag-over'));
  draggedTab = null;
}
