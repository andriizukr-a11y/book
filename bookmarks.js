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
  countEl.classList.add('ready');

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

    let iconHtml = '';
    if (domain) {
      const iconSrc = CONFIG.customIcons?.[domain] ?? `https://${domain}/favicon.ico`;
      iconHtml = `<img class="bookmark-icon" src="data/favicons/default.png" data-src="${iconSrc}" data-domain="${domain}">`;
    } else {
      iconHtml = `<span style="margin-right: 12px;">🔗</span>`;
    }

    html += `
      <a class="bookmark-item" href="${bookmark.href}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(bookmark.title)}">
        ${iconHtml}
        <span class="bookmark-title">${escapeHtml(cleanTitle(bookmark.title))}</span>
      </a>
    `;
  }

  html += '</div>';
  output.innerHTML = html;
  loadFavicons(output);
}

function cleanTitle(title) {
  return title.replace(/\s-\s(YouTube|Google Диск|Google Drive)$/i, '').trim();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function loadFavicons(container) {
  container.querySelectorAll('.bookmark-icon[data-src]').forEach(img => {
    const primarySrc = img.dataset.src;
    const domain = img.dataset.domain || '';

    function tryLoad(url, fallback) {
      const loader = new Image();
      loader.onload = () => { img.src = url; };
      if (fallback) loader.onerror = () => tryLoad(fallback, null);
      loader.src = url;
    }

    const fallback = primarySrc.endsWith('/favicon.ico')
      ? `https://${domain}/favicon.png`
      : null;
    tryLoad(primarySrc, fallback);
  });
}
