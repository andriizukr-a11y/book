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
    'onlinevkino.com': 'data/favicons/default.png'
  },
  
  tabs: [
    'Спорт',
    'Різне'
  ]
};

/* ============ КІНЕЦЬ НАЛАШТУВАНЬ ============ */

// Глобальні змінні
const bookmarksData = {};

// Завантажити іконки перед початком роботи
const defaultFavicon = new Image();
defaultFavicon.src = 'data/favicons/default.png';

// Preload кастомних іконок
const customIconsToPreload = [];
for (const domain in CONFIG.customIcons) {
  const img = new Image();
  img.src = CONFIG.customIcons[domain];
  customIconsToPreload.push(img);
}

// Ініціалізація після завантаження всіх модулів
document.addEventListener('DOMContentLoaded', function() {
  // Чекаємо завантаження default.png перед початком роботи
  defaultFavicon.onload = function() {
    console.log('Default favicon завантажено');
    loadDirectory();
  };
  
  // Якщо вже завантажено (з кешу)
  if (defaultFavicon.complete) {
    console.log('Default favicon вже в кеші');
    loadDirectory();
  }
});
