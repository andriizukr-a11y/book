/* ========== ГОЛОВНИЙ ФАЙЛ ========== */

/* ============ НАЛАШТУВАННЯ ============ */

const CONFIG = {
  allowedIP: '176.37.220.254',

  dir: 'bookmarks',
  
  ui: {
    titleSuffix: 'Посилання',
    showCounts: true
  },
  
  cleanTitleSites: [
    'YouTube',
    'Google Диск',
    'Google Drive'
  ],

  customIcons: {
    'docs.google.com/document': 'data/favicons/document.ico',
    'docs.google.com/spreadsheets': 'data/favicons/spreadsheets.ico',
    'onlinevkino.com': 'data/favicons/default.png'
  },
  
  tabs: [
    'Спорт',
    'Проектор',
    'Робота',
    'Нотатки',
    'Завдання'
  ],

  specialTabs: {
    'Нотатки': 'notes',
    'Завдання': 'tasks'
  }
};

/* ============ КІНЕЦЬ НАЛАШТУВАНЬ ============ */

// Глобальні змінні
const bookmarksData = {};

async function checkIP() {
  try {
    const res = await fetch('https://api64.ipify.org?format=json');
    const data = await res.json();
    return data.ip === CONFIG.allowedIP;
  } catch {
    return false;
  }
}

function injectHead() {
  document.title = CONFIG.ui.titleSuffix;

  const favicon = document.createElement('link');
  favicon.rel = 'icon';
  favicon.href = 'data/favicon.png';
  favicon.type = 'image/png';
  document.head.appendChild(favicon);

  const preload = document.createElement('link');
  preload.rel = 'preload';
  preload.href = 'data/favicons/default.png';
  preload.as = 'image';
  document.head.appendChild(preload);

  const styles = document.createElement('link');
  styles.rel = 'stylesheet';
  styles.href = 'styles.css';
  document.head.appendChild(styles);
}

function injectBody() {
  document.body.insertAdjacentHTML('beforeend',
    '<div class="tabs" id="tabs-container"></div>' +
    '<div id="contents-container"></div>'
  );
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

(async () => {
  const allowed = await checkIP();
  if (!allowed) {
    window.location.replace('about:blank');
    return;
  }

  injectHead();
  injectBody();

  await loadScript('bookmarks.js');
  await loadScript('notes.js');
  await loadScript('tasks.js');
  await loadScript('app.js');

  loadDirectory();
})();
