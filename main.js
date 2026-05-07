/* ========== ГОЛОВНИЙ ФАЙЛ ========== */

/* ============ НАЛАШТУВАННЯ ============ */

const CONFIG = {
  secretKeyHash: 'd10bad463e36ebb3c062074b1da3d3204d2eeea7573570874c68579aeff24f6a',

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

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkAccess() {
  const LS_KEY = 'tab_links_access';

  const params = new URLSearchParams(window.location.search);
  const urlKey = params.get('key');

  if (urlKey) {
    const hash = await sha256(urlKey);
    if (hash === CONFIG.secretKeyHash) {
      localStorage.setItem(LS_KEY, hash);
      history.replaceState(null, '', window.location.pathname);
      return true;
    }
    return false;
  }

  return localStorage.getItem(LS_KEY) === CONFIG.secretKeyHash;
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
  const allowed = await checkAccess();
  if (!allowed) {
    window.location.replace('about:blank');
    return;
  }

  injectHead();
  injectBody();

  await loadScript('bookmarks.js');
  await loadScript('gist-storage.js');
  await loadScript('notes.js');
  await loadScript('gist-settings.js');
  await loadScript('tasks.js');
  await loadScript('app.js');

  loadDirectory();
})();
