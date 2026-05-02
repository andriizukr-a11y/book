/* ========== ГОЛОВНИЙ ФАЙЛ ========== */

/* ============ НАЛАШТУВАННЯ ============ */

const CONFIG = {
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
    'docs.google.com': 'data/favicons/spreadsheets.ico',
    'sheets.google.com': 'data/favicons/spreadsheets.ico',
    'onlinevkino.com': 'data/favicons/default.png'
  },
  
  tabs: [
    'Спорт',
    'Проектор'
  ]
};

/* ============ КІНЕЦЬ НАЛАШТУВАНЬ ============ */

// Глобальні змінні
const bookmarksData = {};

// Ініціалізація після завантаження всіх модулів
document.addEventListener('DOMContentLoaded', loadDirectory);
