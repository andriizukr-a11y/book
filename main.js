/* ========== ГОЛОВНИЙ ФАЙЛ ========== */

/* ============ НАЛАШТУВАННЯ ============ */

const CONFIG = {
  repo: 'andriizukr-a11y/Links',
  dir: 'bookmarks',
  
  ui: {
    titleSuffix: 'Посилання',
    showCounts: true
  },
  
  customIcons: {
    'docs.google.com': 'data/favicons/spreadsheets.ico',
    'sheets.google.com': 'data/favicons/spreadsheets.ico',

  },
  
  tabs: [
    'Спорт',
    'Різне'
  ]
};

/* ============ КІНЕЦЬ НАЛАШТУВАНЬ ============ */

// Глобальні змінні
const bookmarksData = {};

// Ініціалізація після завантаження всіх модулів
document.addEventListener('DOMContentLoaded', function() {
  loadDirectory();
});
