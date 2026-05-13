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
    'Швидка нотатка',
    'Завдання'
  ],

  specialTabs: {
    'Нотатки': 'notes',
    'Швидка нотатка': 'quick-notes',
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

function injectBody() {
  document.body.insertAdjacentHTML('beforeend',
    '<div class="tabs" id="tabs-container"></div>' +
    '<div id="contents-container"></div>'
  );
}

// Завантажуємо скрипти паралельно, але виконуємо в заданому порядку
// (script.async = false для динамічно доданих скриптів зберігає порядок).
function loadScriptsInOrder(srcs) {
  return new Promise((resolve, reject) => {
    let remaining = srcs.length;
    if (!remaining) return resolve();
    srcs.forEach(src => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = () => { if (--remaining === 0) resolve(); };
      s.onerror = reject;
      document.body.appendChild(s);
    });
  });
}

(async () => {
  const allowed = await checkAccess();
  if (!allowed) {
    window.location.replace('about:blank');
    return;
  }

  injectBody();

  await loadScriptsInOrder([
    'bookmarks.js',
    'notes/gist-storage.js',
    'notes/file-storage.js',
    'notes/storage.js',
    'notes/utils.js',
    'notes/checklists.js',
    'notes/ui.js',
    'notes/events.js',
    'notes/notes.js',
    'notes/gist-settings.js',
    'notes/quick-notes.js',
    'tasks.js',
    'app.js'
  ]);

  loadDirectory();
})();
