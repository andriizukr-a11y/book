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
    return;
  }

  let html = '<div class="bookmarks-list">';

  for (const bookmark of bookmarks) {
    if (bookmark.href.includes('separator.floccus.org')) {
      html += `<div class="separator"></div>`;
      continue;
    }

    let domain = '';
    try {
      domain = new URL(bookmark.href).hostname;
    } catch {}

    // Перевіряємо чи є кастомна іконка для цього домену
    let iconHtml = '';
    if (domain) {
      if (CONFIG.customIcons && CONFIG.customIcons[domain]) {
        // Використовуємо кастомну іконку
        iconHtml = `<img class="bookmark-icon"
                     src="${CONFIG.customIcons[domain]}"
                     loading="lazy"
                     onerror="this.style.display='none'">`;
      } else {
        // Використовуємо Google favicon
        iconHtml = `<img class="bookmark-icon"
                     src="https://www.google.com/s2/favicons?domain=${domain}&sz=32"
                     loading="lazy"
                     onerror="this.style.display='none'">`;
      }
    } else {
      // Якщо немає домену, використовуємо стандартну іконку
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
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
