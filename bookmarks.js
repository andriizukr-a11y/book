/* ---------- BOOKMARKS (PARSING + RENDERING) ---------- */

function parseBookmarks(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  const bookmarks = xmlDoc.querySelectorAll("bookmark");
  const result = [];

  bookmarks.forEach(bookmark => {
    const href = bookmark.getAttribute("href");
    const titleEl = bookmark.querySelector("title");
    const title = titleEl?.textContent?.trim() || "Без назви";

    if (href) {
      result.push({ title, href });
    }
  });

  return result;
}

function displayBookmarks(tabId, bookmarks) {
  const output = document.getElementById(`output-${tabId}`);
  const countEl = document.getElementById(`count-${tabId}`);

  const realBookmarks = bookmarks.filter(b => !b.href.includes('separator.floccus.org'));
  countEl.textContent = `(${realBookmarks.length})`;

  if (!bookmarks.length) {
    output.innerHTML = '<div class="no-results">Закладки не знайдено</div>';
    return Promise.resolve();
  }

  let html = '<div class="bookmarks-list">';
  const iconPromises = [];

  for (const bookmark of bookmarks) {
    if (bookmark.href.includes('separator.floccus.org')) {
      html += `<div class="separator"></div>`;
      continue;
    }

    let domain = '';
    try {
      domain = new URL(bookmark.href).hostname;
    } catch {}

    // Генеруємо HTML для іконки
    let iconHtml = '';
    if (domain) {
      let iconSrc = '';
      if (CONFIG.customIcons && CONFIG.customIcons[domain]) {
        iconSrc = CONFIG.customIcons[domain];
      } else {
        iconSrc = `https://${domain}/favicon.ico`;
      }
      
      // Створюємо Promise для завантаження іконки з fallback
      const iconPromise = loadIconWithFallback(domain, iconSrc);
      iconPromises.push(iconPromise);
      
      iconHtml = `<img class="bookmark-icon"
                   src="${iconSrc}"
                   data-domain="${domain}"
                   id="icon-${domain.replace(/[^a-zA-Z0-9]/g, '-')}">`;
    } else {
      iconHtml = `<span style="margin-right: 12px;">🔗</span>`;
    }

    html += `
      <div class="bookmark-item">
        ${iconHtml}
        <a href="${bookmark.href}" target="_blank">
          ${escapeHtml(bookmark.title)}
        </a>
      </div>
    `;
  }

  html += '</div>';
  output.innerHTML = html;
  
  // Повертаємо Promise, який вирішується коли всі іконки завантажилися з fallback
  return Promise.all(iconPromises);
}

// Функція для завантаження іконки з fallback і оновлення src
function loadIconWithFallback(domain, initialSrc) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = initialSrc;
    img.onload = resolve;
    img.onerror = () => {
      // Якщо .ico не завантажився, пробуємо .png
      if (initialSrc.endsWith('/favicon.ico')) {
        const pngImg = new Image();
        pngImg.src = `https://${domain}/favicon.png`;
        pngImg.onload = () => {
          // Оновлюємо src в DOM
          const domImg = document.getElementById(`icon-${domain.replace(/[^a-zA-Z0-9]/g, '-')}`);
          if (domImg) domImg.src = `https://${domain}/favicon.png`;
          resolve();
        };
        pngImg.onerror = () => {
          // Якщо .png теж не спрацював, завантажуємо default.png
          const defaultImg = new Image();
          defaultImg.src = 'data/favicons/default.png';
          defaultImg.onload = () => {
            // Оновлюємо src в DOM
            const domImg = document.getElementById(`icon-${domain.replace(/[^a-zA-Z0-9]/g, '-')}`);
            if (domImg) domImg.src = 'data/favicons/default.png';
            resolve();
          };
          defaultImg.onerror = resolve;
        };
      } else if (initialSrc.endsWith('/favicon.png')) {
        // Якщо це .png і не спрацював, завантажуємо default.png
        const defaultImg = new Image();
        defaultImg.src = 'data/favicons/default.png';
        defaultImg.onload = () => {
          // Оновлюємо src в DOM
          const domImg = document.getElementById(`icon-${domain.replace(/[^a-zA-Z0-9]/g, '-')}`);
          if (domImg) domImg.src = 'data/favicons/default.png';
          resolve();
        };
        defaultImg.onerror = resolve;
      } else {
        resolve;
      }
    };
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Fallback для іконок - замінює на default.png
function handleFaviconError(img) {
  const domain = img.dataset?.domain || '';
  const currentSrc = img.src;
  
  // Якщо це перша спроба (.ico), пробуємо .png
  if (currentSrc.endsWith('/favicon.ico')) {
    img.src = `https://${domain}/favicon.png`;
    return;
  }
  
  // Замінюємо на default.png
  img.src = 'data/favicons/default.png';
  img.onerror = null; // Запобігаємо нескінченному циклу
}
