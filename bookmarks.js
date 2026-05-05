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
  if (countEl) {
    countEl.textContent = `(${realBookmarks.length})`;
    countEl.classList.add('ready');
  }

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
    let urlWithPath = '';
    try {
      const urlObj = new URL(bookmark.href);
      domain = urlObj.hostname;
      urlWithPath = urlObj.hostname + urlObj.pathname;
    } catch {}

    let iconHtml = '';
    if (domain) {
      const customIconKey = Object.keys(CONFIG.customIcons || {}).find(key => urlWithPath.startsWith(key));
      if (customIconKey) {
        iconHtml = `<img class="bookmark-icon" src="${CONFIG.customIcons[customIconKey]}" data-domain="${domain}">`;
      } else {
        iconHtml = `<img class="bookmark-icon" src="data/favicons/default.png" data-src="https://${domain}/favicon.ico" data-domain="${domain}">`;
      }
    } else {
      iconHtml = `<span style="margin-right: 12px;">🔗</span>`;
    }

    const domainLabel = domain ? `<span class="bookmark-domain">${domain}</span>` : '';
    html += `
      <a class="bookmark-item" href="${bookmark.href}" target="_blank" rel="noopener noreferrer">
        ${iconHtml}
        <span class="bookmark-text">
          <span class="bookmark-title" data-title="${escapeHtml(bookmark.title)}">${escapeHtml(cleanTitle(bookmark.title))}</span>
          ${domainLabel}
        </span>
      </a>
    `;
  }

  html += '</div>';
  output.innerHTML = html;
  loadFavicons(output);
  updateTruncatedTitles(output);
}

function updateTruncatedTitles(container) {
  container.querySelectorAll('.bookmark-title').forEach(span => {
    const anchor = span.closest('a');
    if (!anchor) return;
    if (span.scrollWidth > span.clientWidth) {
      anchor.title = span.dataset.title;
    } else {
      anchor.removeAttribute('title');
    }
  });
}

function cleanTitle(title) {
  const sites = (CONFIG.cleanTitleSites || []).join('|');
  if (!sites) return title.trim();
  return title.replace(new RegExp(`\\s-\\s(${sites})$`, 'i'), '').trim();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const FAVICON_CACHE_PREFIX = 'fav_';
const FAVICON_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function getFaviconCache(domain) {
  try {
    const raw = localStorage.getItem(FAVICON_CACHE_PREFIX + domain);
    if (!raw) return null;
    const { src, ts } = JSON.parse(raw);
    if (Date.now() - ts > FAVICON_CACHE_TTL) { localStorage.removeItem(FAVICON_CACHE_PREFIX + domain); return null; }
    return src;
  } catch { return null; }
}

function setFaviconCache(domain, src) {
  try { localStorage.setItem(FAVICON_CACHE_PREFIX + domain, JSON.stringify({ src, ts: Date.now() })); } catch {}
}

function loadFavicons(container) {
  container.querySelectorAll('.bookmark-icon[data-src]').forEach(img => {
    const primarySrc = img.dataset.src;
    const domain = img.dataset.domain || '';

    const cached = getFaviconCache(domain);
    if (cached) { img.src = cached; return; }

    function tryLoad(url, fallback) {
      const loader = new Image();
      loader.onload = () => { img.src = url; setFaviconCache(domain, url); };
      if (fallback) loader.onerror = () => tryLoad(fallback, null);
      loader.src = url;
    }

    const fallback = primarySrc.endsWith('/favicon.ico')
      ? `https://${domain}/favicon.png`
      : null;
    tryLoad(primarySrc, fallback);
  });
}
