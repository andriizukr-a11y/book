/* ---------- NOTES MAIN ---------- */

function initNotes() {
  const output = document.getElementById('output-notes');
  if (!output) return;

  const topics = getNotesTopics();
  notesActiveTopic = localStorage.getItem(NOTES_ACTIVE_KEY) || topics[0];
  if (!topics.includes(notesActiveTopic)) {
    notesActiveTopic = topics[0];
  }
  localStorage.setItem(NOTES_ACTIVE_KEY, notesActiveTopic);

  renderNotesUI(output);
  
  if (typeof addGistSettingsButton === 'function') {
    setTimeout(() => {
      addGistSettingsButton();
      if (gistStorage.isEnabled()) {
        gistStorage.startAutoSync();
      }
      if (fileStorage.isEnabled()) {
        fileStorage.startAutoSync();
      }
    }, 100);
  }

  const handleSyncStatus = (e) => {
    const { status, message } = e.detail;
    if (status === 'error') {
      notesSyncError = message;
      setTimeout(() => {
        const editorHadFocus = document.activeElement === output.querySelector('#notes-textarea');
        saveCurrentNoteSilent();
        renderNotesUI(output);
        if (editorHadFocus) {
          const editor = output.querySelector('#notes-textarea');
          if (editor) editor.focus();
        }
      }, 0);
    } else if (status === 'success') {
      notesSyncError = null;
      setTimeout(() => {
        const editorHadFocus = document.activeElement === output.querySelector('#notes-textarea');
        saveCurrentNoteSilent();
        renderNotesUI(output);
        if (editorHadFocus) {
          const editor = output.querySelector('#notes-textarea');
          if (editor) editor.focus();
        }
      }, 0);
    }
  };
  window.addEventListener('gist-sync-status', handleSyncStatus);
  window.addEventListener('file-sync-status', handleSyncStatus);
}
