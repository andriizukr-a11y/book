/* ---------- NOTES EVENTS ---------- */

function bindNotesEvents(container) {
  const editor = container.querySelector('#notes-textarea');
  const statusEl = container.querySelector('#notes-status');
  const ctxToolbar = container.querySelector('#notes-ctx-toolbar');
  const sidebar = container.querySelector('.notes-sidebar');
  const resizer = container.querySelector('#notes-sidebar-resizer');
  const layout = container.querySelector('.notes-layout');
  const layoutResizer = container.querySelector('#notes-layout-resizer');

  const setupSyncLink = container.querySelector('#notes-setup-sync');
  if (setupSyncLink) {
    setupSyncLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof createGistSettingsModal === 'function') {
        createGistSettingsModal();
      }
    });
  }

  let isResizingSidebar = false;
  let sidebarStartX = 0;
  let sidebarStartWidth = 0;

  if (resizer) {
    resizer.addEventListener('mousedown', (e) => {
      isResizingSidebar = true;
      sidebarStartX = e.clientX;
      sidebarStartWidth = sidebar.offsetWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
  }

  let isResizingLayout = false;
  let layoutStartX = 0;
  let layoutStartWidth = 0;

  if (layoutResizer) {
    layoutResizer.addEventListener('mousedown', (e) => {
      isResizingLayout = true;
      layoutStartX = e.clientX;
      layoutStartWidth = layout.offsetWidth;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
  }

  document.addEventListener('mousemove', (e) => {
    if (isResizingSidebar) {
      const deltaX = e.clientX - sidebarStartX;
      const newWidth = Math.max(180, Math.min(400, sidebarStartWidth + deltaX));
      sidebar.style.width = newWidth + 'px';
    }
    if (isResizingLayout) {
      const deltaX = e.clientX - layoutStartX;
      const newWidth = Math.max(600, Math.min(window.innerWidth * 0.95, layoutStartWidth + deltaX));
      layout.style.width = newWidth + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizingSidebar) {
      isResizingSidebar = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('notes_sidebar_width', sidebar.offsetWidth);
      if (typeof fileStorage !== 'undefined' && fileStorage.isEnabled()) {
        fileStorage.markPendingChanges();
      }
    }
    if (isResizingLayout) {
      isResizingLayout = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('notes_layout_width', layout.offsetWidth);
      if (typeof fileStorage !== 'undefined' && fileStorage.isEnabled()) {
        fileStorage.markPendingChanges();
      }
    }
  });

  function updatePlaceholder() {
    const isEmpty = isEditorEmpty(editor);
    editor.classList.toggle('empty', isEmpty);
  }

  function isEditorEmpty(editor) {
    const content = editor.innerHTML.trim();
    if (!content || content === '<br>') return true;
    
    const temp = document.createElement('div');
    temp.innerHTML = content;
    const text = temp.textContent.trim();
    return text === '';
  }

  updatePlaceholder();

  function updateCtxToolbarState() {
    ctxToolbar.querySelectorAll('.notes-tb-btn').forEach(btn => {
      const cmd = btn.dataset.cmd;
      if (cmd) btn.classList.toggle('active', document.queryCommandState(cmd));
    });
  }

  function positionCtxToolbar() {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) {
      ctxToolbar.classList.remove('visible');
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      ctxToolbar.classList.remove('visible');
      return;
    }

    const ancestor = range.commonAncestorContainer;
    if (ancestor.nodeName === 'IMG' || (ancestor.nodeType === Node.ELEMENT_NODE && ancestor.querySelector('img'))) {
      ctxToolbar.classList.remove('visible');
      return;
    }

    const tw = ctxToolbar.offsetWidth;
    const th = ctxToolbar.offsetHeight;
    const gap = 10;

    let left = rect.left + rect.width / 2 - tw / 2;
    let top = rect.top - th - gap;

    if (top < 8) top = rect.bottom + gap;
    if (left < 8) left = 8;
    if (left + tw > window.innerWidth - 8) left = window.innerWidth - tw - 8;

    ctxToolbar.style.left = left + 'px';
    ctxToolbar.style.top = top + 'px';
    ctxToolbar.classList.add('visible');
    updateCtxToolbarState();
  }

  function hideCtxToolbar() {
    ctxToolbar.classList.remove('visible');
  }

  editor.addEventListener('mouseup', () => {
    setTimeout(positionCtxToolbar, 0);
  });
  editor.addEventListener('keyup', e => {
    if (e.shiftKey || e.key.startsWith('Arrow')) {
      setTimeout(positionCtxToolbar, 0);
    }
  });

  document.addEventListener('mousedown', e => {
    if (!ctxToolbar.contains(e.target) && !editor.contains(e.target)) {
      hideCtxToolbar();
    }
  });

  editor.addEventListener('scroll', hideCtxToolbar);
  window.addEventListener('scroll', hideCtxToolbar, true);

  ctxToolbar.querySelectorAll('.notes-tb-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      document.execCommand(cmd, false, null);
      editor.focus();
      setTimeout(positionCtxToolbar, 0);
    });
  });

  const ctxChecklistBtn = container.querySelector('#notes-ctx-checklist');
  ctxChecklistBtn.addEventListener('mousedown', e => {
    e.preventDefault();
    editor.focus();
    insertChecklistItem(editor);
    hideCtxToolbar();
  });

  editor.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
    if (e.ctrlKey && e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
    if (e.ctrlKey && e.key === 'u') { e.preventDefault(); document.execCommand('underline'); }
    if (e.ctrlKey && e.shiftKey && e.key === 'C') { e.preventDefault(); insertChecklistItem(editor); }
    if (e.key === 'Enter' && !e.shiftKey) {
      const checklistItem = e.target.closest('.notes-checklist-item');
      if (!checklistItem) {
        e.preventDefault();
        document.execCommand('insertLineBreak');
      }
    }
  });

  editor.addEventListener('keydown', e => {
    if (e.key === ' ') { handleChecklistSpace(editor, e); }
    if (e.key === 'Enter' && !e.shiftKey) { handleChecklistEnter(editor, e); }
    if (e.key === 'Backspace') { handleChecklistBackspace(editor, e); }
  });

  editor.addEventListener('click', e => {
    handleChecklistClick(editor, e);
  });

  editor.addEventListener('paste', e => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = () => {
          const sel = window.getSelection();
          if (!sel.rangeCount) return;
          const range = sel.getRangeAt(0);
          range.deleteContents();

          const img = document.createElement('img');
          img.src = reader.result;
          img.alt = 'Зображення';

          const wrapper = document.createElement('div');
          wrapper.className = 'notes-img-wrapper';
          wrapper.appendChild(img);
          wrapper.appendChild(document.createElement('br'));

          range.insertNode(wrapper);
          range.setStartAfter(wrapper);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);

          editor.dispatchEvent(new Event('input', { bubbles: true }));
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  });

  editor.addEventListener('input', () => {
    updatePlaceholder();
    clearTimeout(notesSaveTimer);
    notesStatusTimers.forEach(clearTimeout);
    notesStatusTimers = [];

    statusEl.textContent = 'Збереження...';
    statusEl.className = 'notes-status saving';
    statusEl.style.opacity = '1';

    notesSaveTimer = setTimeout(() => {
      wrapImages(editor);
      saveCurrentNote(editor.innerHTML);

      statusEl.style.opacity = '0';
      notesStatusTimers.push(setTimeout(() => {
        statusEl.textContent = 'Збережено';
        statusEl.className = 'notes-status saved';
        statusEl.style.opacity = '1';

        notesStatusTimers.push(setTimeout(() => {
          statusEl.style.opacity = '0';
          notesStatusTimers.push(setTimeout(() => {
            statusEl.textContent = getEditTime();
            statusEl.className = 'notes-status';
            statusEl.style.opacity = '1';
          }, 300));
        }, 1500));
      }, 300));
    }, SAVE_DELAY);
  });

  container.querySelectorAll('.notes-group-header').forEach(header => {
    header.addEventListener('click', () => {
      const group = header.parentElement;
      const collapsed = group.classList.toggle('collapsed');
      const groupName = group.dataset.group;
      const arr = getCollapsedGroups();
      if (collapsed) {
        if (!arr.includes(groupName)) arr.push(groupName);
      } else {
        const idx = arr.indexOf(groupName);
        if (idx !== -1) arr.splice(idx, 1);
      }
      saveCollapsedGroups(arr);
    });
  });

  container.querySelectorAll('.notes-group-header').forEach(header => {
    header.addEventListener('auxclick', e => {
      if (e.button !== 1) return;
      e.preventDefault();
      e.stopPropagation();
      const groupEl = header.parentElement;
      if (header.querySelector('.notes-group-add-input')) return;
      groupEl.draggable = false;
      const oldName = groupEl.dataset.group;
      const nameEl = header.querySelector('.notes-group-name');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'notes-group-add-input';
      input.value = oldName;

      const commit = () => {
        groupEl.draggable = true;
        const trimmed = input.value.trim();
        input.remove();
        nameEl.style.display = '';
        if (!trimmed || trimmed === oldName) return;

        if (oldName === getMainGroupName()) {
          setMainGroupName(trimmed);
          const tg = getTopicGroups();
          for (const k in tg) { if (tg[k] === oldName) tg[k] = trimmed; }
          saveTopicGroups(tg);
          const groups = getNotesGroups();
          const index = groups.indexOf(oldName);
          if (index !== -1) {
            groups[index] = trimmed;
            saveNotesGroups(groups);
          }
        } else {
          const groups = getNotesGroups();
          if (groups.includes(trimmed)) { showToast('Така група вже існує'); return; }
          const idx = groups.indexOf(oldName);
          groups[idx] = trimmed;
          saveNotesGroups(groups);
          const tg = getTopicGroups();
          for (const k in tg) { if (tg[k] === oldName) tg[k] = trimmed; }
          saveTopicGroups(tg);
        }
        renderNotesUI(container);
      };

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); input.removeEventListener('blur', commit); commit(); }
        if (e.key === 'Escape') { groupEl.draggable = true; input.remove(); nameEl.style.display = ''; }
      });
      input.addEventListener('blur', commit);

      nameEl.style.display = 'none';
      nameEl.parentElement.appendChild(input);
      
      // Повністю блокуємо drag-and-drop
      let parent = input;
      while (parent = parent.parentElement) {
        if (parent.draggable) {
          parent._wasDraggable = true;
          parent.draggable = false;
        }
      }
      
      input.addEventListener('dragstart', e => e.preventDefault());
      input.addEventListener('mousedown', e => e.stopPropagation());
      input.addEventListener('click', e => e.stopPropagation());
      
      const cleanup = () => {
        let parent = input;
        while (parent = parent.parentElement) {
          if (parent._wasDraggable) {
            parent.draggable = true;
            parent._wasDraggable = false;
          }
        }
      };
      
      const originalCommit = commit;
      commit = () => {
        cleanup();
        originalCommit();
      };
      
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { cleanup(); groupEl.draggable = true; input.remove(); nameEl.style.display = ''; }
      });
      input.addEventListener('blur', commit);
      
      input.focus();
      input.select();
    });
  });

  function startAddTopic(groupEl) {
    if (groupEl.querySelector('.notes-topic-input')) return;
    const groupName = groupEl.dataset.group;
    const topicsContainer = groupEl.querySelector('.notes-group-topics');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'notes-topic-input';
    input.placeholder = 'Нова тема...';

    const commit = () => {
      let name = input.value.trim();
      input.remove();
      if (!name) {
        name = 'Нова тема';
        let suffix = 1;
        const existingTopics = getNotesTopics();
        while (existingTopics.includes(name)) {
          name = `Нова тема ${suffix}`;
          suffix++;
        }
      }
      const topics = getNotesTopics();
      if (topics.includes(name)) { showToast('Така тема вже існує'); return; }
      topics.push(name);
      saveNotesTopics(topics);
      const tg = getTopicGroups();
      tg[name] = groupName;
      saveTopicGroups(tg);
      const data = getNotesData();
      data[name] = '';
      saveNotesData(data);
      notesActiveTopic = name;
      localStorage.setItem(NOTES_ACTIVE_KEY, notesActiveTopic);
      renderNotesUI(container);
      setTimeout(() => {
        const editor = container.querySelector('#notes-textarea');
        if (editor) editor.focus();
      }, 0);
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { input.remove(); }
    });
    input.addEventListener('blur', commit);

    topicsContainer.appendChild(input);
    
    // Фокусуємося на полі введення назви теми
    input.focus();
    
    // Повністю блокуємо drag-and-drop
    let parent = input;
    while (parent = parent.parentElement) {
      if (parent.draggable) {
        parent._wasDraggable = true;
        parent.draggable = false;
      }
    }
    
    input.addEventListener('dragstart', e => e.preventDefault());
    input.addEventListener('mousedown', e => e.stopPropagation());
    input.addEventListener('click', e => e.stopPropagation());
    
    const cleanup = () => {
      let parent = input;
      while (parent = parent.parentElement) {
        if (parent._wasDraggable) {
          parent.draggable = true;
          parent._wasDraggable = false;
        }
      }
    };
    
    const originalCommit = commit;
    commit = () => {
      cleanup();
      originalCommit();
    };
    
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { cleanup(); input.remove(); }
    });
    input.addEventListener('blur', commit);
  }

  container.querySelectorAll('.notes-group-count').forEach(count => {
    count.addEventListener('click', e => {
      e.stopPropagation();
      const groupEl = count.closest('.notes-group');
      if (groupEl.querySelector('.notes-topic-input')) return;
      if (groupEl.classList.contains('collapsed')) {
        groupEl.classList.remove('collapsed');
        const groupName = groupEl.dataset.group;
        const arr = getCollapsedGroups();
        const idx = arr.indexOf(groupName);
        if (idx !== -1) arr.splice(idx, 1);
        saveCollapsedGroups(arr);
      }
      startAddTopic(groupEl);
    });
  });

  container.querySelectorAll('.notes-group-topics').forEach(topicsContainer => {
    topicsContainer.addEventListener('click', e => {
      if (e.target !== topicsContainer) return;
      startAddTopic(topicsContainer.closest('.notes-group'));
    });
  });

  const groupAdd = container.querySelector('#notes-group-add');
  groupAdd.addEventListener('click', () => {
    if (groupAdd.querySelector('input')) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'notes-group-add-input';
    input.placeholder = 'Нова група';

    const commit = () => {
      const name = input.value.trim();
      input.remove();
      groupAdd.style.display = '';
      if (!name) return;
      const groups = getNotesGroups();
      if (groups.includes(name)) { showToast('Така група вже існує'); return; }
      groups.push(name);
      saveNotesGroups(groups);
      renderNotesUI(container);
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { input.remove(); groupAdd.style.display = ''; }
    });
    input.addEventListener('blur', commit);

    groupAdd.style.display = 'none';
    groupAdd.parentElement.appendChild(input);
    
    // Встановлюємо фокус з невеликою затримкою
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
    
    // Повністю блокуємо drag-and-drop
    let parent = input;
    while (parent = parent.parentElement) {
      if (parent.draggable) {
        parent._wasDraggable = true;
        parent.draggable = false;
      }
    }
    
    input.addEventListener('dragstart', e => e.preventDefault());
    input.addEventListener('mousedown', e => e.stopPropagation());
    input.addEventListener('click', e => e.stopPropagation());
    
    const cleanup = () => {
      let parent = input;
      while (parent = parent.parentElement) {
        if (parent._wasDraggable) {
          parent.draggable = true;
          parent._wasDraggable = false;
        }
      }
    };
    
    const originalCommit = commit;
    commit = () => {
      cleanup();
      originalCommit();
    };
    
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { cleanup(); input.remove(); groupAdd.style.display = ''; }
    });
    input.addEventListener('blur', commit);
  });

  container.querySelectorAll('.notes-group').forEach(group => {
    group.addEventListener('dblclick', e => {
      if (e.target.closest('.notes-topic-item') || e.target.closest('.notes-topic-input') || e.target.closest('.notes-group-header')) return;
      startAddTopic(group);
    });
  });

  container.querySelectorAll('.notes-group-header').forEach(header => {
    header.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      const groupEl = header.parentElement;
      const groupName = groupEl.dataset.group;
      const groups = getNotesGroups();
      if (groupName === getMainGroupName()) { showToast(`Не можна видалити групу «${getMainGroupName()}»`); return; }
      if (groups.length <= 1) { showToast('Не можна видалити останню групу'); return; }
      showConfirm(`Видалити групу «${groupName}»? Усі теми перейдуть у «${getMainGroupName()}».`, () => {
        const newGroups = groups.filter(g => g !== groupName);
        saveNotesGroups(newGroups);
        const tg = getTopicGroups();
        for (const k in tg) { if (tg[k] === groupName) tg[k] = getMainGroupName(); }
        saveTopicGroups(tg);
        renderNotesUI(container);
      });
    });
  });

  let draggedGroup = null;
  container.querySelectorAll('.notes-group').forEach(group => {
    group.addEventListener('dragstart', e => {
      if (e.target.closest('.notes-topic-item')) return;
      draggedGroup = group;
      group.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    group.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    group.addEventListener('dragenter', e => {
      if (draggedGroup && group !== draggedGroup) group.classList.add('drag-over');
      if (draggedTopic && !group.contains(draggedTopic)) group.classList.add('topic-drag-over');
    });
    group.addEventListener('dragleave', e => {
      if (!group.contains(e.relatedTarget)) {
        group.classList.remove('drag-over');
        group.classList.remove('topic-drag-over');
      }
    });
    group.addEventListener('drop', e => {
      if (draggedTopic) {
        if (e.target.closest('.notes-topic-item')) return;
        e.stopPropagation();
        const newGroup = group.dataset.group;
        const topicsContainer = group.querySelector('.notes-group-topics');
        topicsContainer.appendChild(draggedTopic);
        const tg = getTopicGroups();
        tg[draggedTopic.dataset.topic] = newGroup;
        saveTopicGroups(tg);
        const allTopics = [...container.querySelectorAll('.notes-topic-item')].map(el => el.dataset.topic);
        saveNotesTopics(allTopics);
        return;
      }
      e.stopPropagation();
      if (!draggedGroup || draggedGroup === group) return;
      const list = container.querySelector('#notes-sidebar-list');
      const items = [...list.querySelectorAll('.notes-group')];
      const di = items.indexOf(draggedGroup);
      const ti = items.indexOf(group);
      if (di < ti) list.insertBefore(draggedGroup, group.nextSibling);
      else list.insertBefore(draggedGroup, group);
      saveNotesGroups([...list.querySelectorAll('.notes-group')].map(el => el.dataset.group));
    });
    group.addEventListener('dragend', () => {
      group.classList.remove('dragging');
      container.querySelectorAll('.notes-group').forEach(el => {
        el.classList.remove('drag-over');
        el.classList.remove('topic-drag-over');
      });
      draggedGroup = null;
    });
  });

  let draggedTopic = null;
  let lastDropTarget = null;
  let lastDropPosition = null;

  container.querySelectorAll('.notes-topic-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.classList.contains('active')) return;
      saveCurrentNoteSilent();
      notesActiveTopic = item.dataset.topic;
      localStorage.setItem(NOTES_ACTIVE_KEY, notesActiveTopic);
      renderNotesUI(container);
    });

    item.addEventListener('dragstart', e => {
      draggedTopic = item;
      container.querySelectorAll('.notes-topic-item').forEach(el => {
        el.classList.remove('drop-before', 'drop-after');
      });
      item.classList.add('dragging');
      item.classList.remove('drop-before', 'drop-after');
      e.dataTransfer.effectAllowed = 'move';
      lastDropTarget = null;
      lastDropPosition = null;
    });

    item.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      if (!draggedTopic || item === draggedTopic) {
        return;
      }
      
      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const newPosition = e.clientY < midY ? 'before' : 'after';
      
      if (lastDropTarget !== item || lastDropPosition !== newPosition) {
        container.querySelectorAll('.notes-topic-item').forEach(el => {
          if (el !== draggedTopic) {
            el.classList.remove('drop-before', 'drop-after');
          }
        });
        
        if (newPosition === 'before') {
          item.classList.add('drop-before');
        } else {
          item.classList.add('drop-after');
        }
        
        lastDropTarget = item;
        lastDropPosition = newPosition;
      }
    });

    item.addEventListener('dragleave', e => {
      if (item === draggedTopic) return;
      
      const relatedTarget = e.relatedTarget;
      if (!item.contains(relatedTarget) && relatedTarget !== item) {
        if (lastDropTarget === item) {
          item.classList.remove('drop-before', 'drop-after');
          lastDropTarget = null;
          lastDropPosition = null;
        }
      }
    });

    item.addEventListener('drop', e => {
      e.stopPropagation();
      if (draggedTopic === item) return;
      const targetGroup = item.closest('.notes-group');
      const topicsContainer = targetGroup.querySelector('.notes-group-topics');
      const insertBefore = item.classList.contains('drop-before');
      if (insertBefore) {
        topicsContainer.insertBefore(draggedTopic, item);
      } else {
        topicsContainer.insertBefore(draggedTopic, item.nextSibling);
      }
      const newGroup = targetGroup.dataset.group;
      const tg = getTopicGroups();
      tg[draggedTopic.dataset.topic] = newGroup;
      saveTopicGroups(tg);
      const allTopics = [...container.querySelectorAll('.notes-topic-item')].map(el => el.dataset.topic);
      saveNotesTopics(allTopics);
    });

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      container.querySelectorAll('.notes-topic-item').forEach(el => {
        el.classList.remove('drop-before', 'drop-after');
      });
      container.querySelectorAll('.notes-group').forEach(el => {
        el.classList.remove('topic-drag-over');
      });
      draggedTopic = null;
      lastDropTarget = null;
      lastDropPosition = null;
    });

    item.addEventListener('contextmenu', e => {
      e.preventDefault();
      const topic = item.dataset.topic;
      const topics = getNotesTopics();
      if (topics.length <= 1) {
        showToast('Не можна видалити останню тему');
        return;
      }
      showConfirm(`Видалити тему «${topic}»?`, () => {
        deleteTopic(topic, container);
      });
    });

    item.addEventListener('auxclick', e => {
      if (e.button !== 1) return;
      if (item.querySelector('.notes-topic-input')) return;
      e.preventDefault();
      e.stopPropagation();
      item.draggable = false;
      const oldName = item.dataset.topic;
      const nameEl = item.querySelector('.notes-topic-name');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'notes-topic-input';
      input.value = oldName;

      const cleanup = () => {
        let parent = input;
        while (parent = parent.parentElement) {
          if (parent._wasDraggable) {
            parent.draggable = true;
            parent._wasDraggable = false;
          }
        }
      };

      const commit = () => {
        cleanup();
        const trimmed = input.value.trim();
        input.remove();
        nameEl.style.display = '';
        if (!trimmed || trimmed === oldName) return;
        const topics = getNotesTopics();
        if (topics.includes(trimmed)) { showToast('Така тема вже існує'); return; }
        const idx = topics.indexOf(oldName);
        if (idx === -1) return;
        topics[idx] = trimmed;
        saveNotesTopics(topics);
        const data = getNotesData();
        if (data.hasOwnProperty(oldName)) { data[trimmed] = data[oldName]; delete data[oldName]; saveNotesData(data); }
        const ts = getNotesTimestamps();
        if (ts.hasOwnProperty(oldName)) { ts[trimmed] = ts[oldName]; delete ts[oldName]; saveNotesTimestamps(ts); }
        const tg = getTopicGroups();
        if (tg.hasOwnProperty(oldName)) { tg[trimmed] = tg[oldName]; delete tg[oldName]; saveTopicGroups(tg); }
        if (notesActiveTopic === oldName) {
          notesActiveTopic = trimmed;
          localStorage.setItem(NOTES_ACTIVE_KEY, notesActiveTopic);
        }
        renderNotesUI(container);
      };

      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); input.removeEventListener('blur', commit); commit(); }
        if (e.key === 'Escape') { cleanup(); input.remove(); nameEl.style.display = ''; }
      });
      input.addEventListener('blur', commit);

      nameEl.style.display = 'none';
      nameEl.parentElement.appendChild(input);

      // Фокусуємося на полі введення і виділяємо текст
      input.focus();
      input.select();

      // Повністю блокуємо drag-and-drop
      let parent = input;
      while (parent = parent.parentElement) {
        if (parent.draggable) {
          parent._wasDraggable = true;
          parent.draggable = false;
        }
      }

      input.addEventListener('dragstart', e => e.preventDefault());
      input.addEventListener('mousedown', e => e.stopPropagation());
      input.addEventListener('click', e => e.stopPropagation());
    });
  });
}
