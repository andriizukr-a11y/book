/* ---------- CHECKLISTS ---------- */

function serializeChecklists(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  const items = div.querySelectorAll('.notes-checklist-item');
  items.forEach((item, index) => {
    const cb = item.querySelector('.notes-checklist');
    const textEl = item.querySelector('.notes-checklist-text');
    if (!cb || !textEl) return;
    const checked = cb.classList.contains('checked');
    const text = textEl.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/&nbsp;/g, ' ').trim();
    const marker = checked ? '- [x]' : '- [ ]';
    const replacement = document.createTextNode(marker + ' ' + text);
    item.replaceWith(replacement);
    if (index < items.length - 1) {
      replacement.after(document.createElement('br'));
    }
  });
  return div.innerHTML;
}

function deserializeChecklists(html) {
  const normalized = html.replace(/<br\s*\/?>/gi, '\n');
  const result = normalized.replace(/(^|\n)-\s*\[(\s*)\]\s*(.*)$/gmi, (_, newline, check, text) => {
    const checked = check.toLowerCase() === 'x';
    const escapedText = text.replace(/\n/g, '<br>');
    return `${newline}<div class="notes-checklist-item"><span class="notes-checklist${checked ? ' checked' : ''}" contenteditable="false"></span><span class="notes-checklist-text">${escapedText}</span></div>`;
  });
  return result.replace(/\n/g, '<br>');
}

function getChecklistItem(el) {
  if (el.nodeType === Node.TEXT_NODE) el = el.parentNode;
  return el ? el.closest('.notes-checklist-item') : null;
}

function getChecklistText(el) {
  const item = getChecklistItem(el);
  return item ? item.querySelector('.notes-checklist-text') : null;
}

function isEmptyChecklist(textEl) {
  if (!textEl) return true;
  const html = textEl.innerHTML.replace(/<br\s*\/?>/gi, '').replace(/&nbsp;/g, '').trim();
  return html === '' || html === '<br>';
}

function focusChecklistText(textEl, atStart = true) {
  if (!textEl) return;
  const range = document.createRange();
  const sel = window.getSelection();
  if (atStart) {
    range.setStart(textEl, 0);
  } else {
    if (textEl.childNodes.length) {
      const last = textEl.childNodes[textEl.childNodes.length - 1];
      if (last.nodeType === Node.TEXT_NODE) {
        range.setStart(last, last.textContent.length);
      } else {
        range.setStartAfter(last);
      }
    } else {
      range.setStart(textEl, 0);
    }
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function insertChecklistItem(editor, checked = false, text = '') {
  const sel = window.getSelection();
  const range = sel.getRangeAt(0);
  
  const item = document.createElement('div');
  item.className = 'notes-checklist-item';
  item.innerHTML = `<span class="notes-checklist${checked ? ' checked' : ''}" contenteditable="false"></span><span class="notes-checklist-text">${text || '<br>'}</span>`;
  
  range.insertNode(item);
  range.setStartAfter(item);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  
  const textEl = item.querySelector('.notes-checklist-text');
  if (textEl) focusChecklistText(textEl, true);
  
  return item;
}

function handleChecklistEnter(editor, e) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  
  const node = sel.anchorNode;
  const textEl = getChecklistText(node);
  if (!textEl) return;
  
  e.preventDefault();
  
  if (isEmptyChecklist(textEl)) {
    const item = getChecklistItem(textEl);
    const div = document.createElement('div');
    div.innerHTML = '<br>';
    item.replaceWith(div);
    const range = document.createRange();
    range.setStart(div, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    return;
  }
  
  const item = getChecklistItem(textEl);
  const newItem = document.createElement('div');
  newItem.className = 'notes-checklist-item';
  newItem.innerHTML = '<span class="notes-checklist" contenteditable="false"></span><span class="notes-checklist-text"><br></span>';
  
  item.after(newItem);
  const newText = newItem.querySelector('.notes-checklist-text');
  if (newText) focusChecklistText(newText, true);
}

function handleChecklistBackspace(editor, e) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  
  const range = sel.getRangeAt(0);
  const node = sel.anchorNode;
  const textEl = getChecklistText(node);
  if (!textEl) return;
  
  if (!isEmptyChecklist(textEl)) return;
  if (range.startOffset !== 0) return;
  
  e.preventDefault();
  
  const item = getChecklistItem(textEl);
  const div = document.createElement('div');
  div.innerHTML = '<br>';
  item.replaceWith(div);
  
  const newRange = document.createRange();
  newRange.setStart(div, 0);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

function handleChecklistSpace(editor, e) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return;
  
  const text = node.textContent;
  const offset = range.startOffset;
  const beforeCursor = text.substring(0, offset);
  const lineStart = beforeCursor.lastIndexOf('\n') + 1;
  const lineContent = beforeCursor.substring(lineStart);
  
  const match = lineContent.match(/^-\s*\[(\s*)\]\s$/);
  if (!match) return;
  
  e.preventDefault();
  
  const isChecked = match[1].toLowerCase() === 'x';
  const afterCursor = text.substring(offset);
  
  const parent = node.parentNode;
  const beforeText = text.substring(0, lineStart);
  
  node.textContent = beforeText + afterCursor;
  range.setStart(node, lineStart);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  
  const item = document.createElement('div');
  item.className = 'notes-checklist-item';
  item.innerHTML = `<span class="notes-checklist${isChecked ? ' checked' : ''}" contenteditable="false"></span><span class="notes-checklist-text"><br></span>`;
  
  range.insertNode(item);
  range.setStartAfter(item);
  sel.removeAllRanges();
  sel.addRange(range);
  
  const textEl = item.querySelector('.notes-checklist-text');
  if (textEl) focusChecklistText(textEl, true);
}

function handleChecklistClick(editor, e) {
  const cb = e.target.closest('.notes-checklist');
  if (!cb) return;
  
  e.preventDefault();
  cb.classList.toggle('checked');
  
  const item = getChecklistItem(cb);
  const textEl = item ? item.querySelector('.notes-checklist-text') : null;
  if (textEl) focusChecklistText(textEl, true);
  
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

function wrapImages(editor) {
  editor.querySelectorAll('img:not(.notes-img-wrapper img)').forEach(img => {
    if (img.closest('.notes-img-wrapper')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'notes-img-wrapper';
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);
  });
}
