/* ---------- NOTES MAIN ---------- */

function initNotes() {
  const output = document.getElementById('output-notes');
  if (!output) return;

  const topics = getNotesTopics();
  notesActiveTopic = localStorage.getItem(NOTES_ACTIVE_KEY) || topics[0];
  if (!topics.includes(notesActiveTopic)) {
    notesActiveTopic = topics[0];
  }

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
      setTimeout(() => renderNotesUI(output), 0);
    } else if (status === 'success') {
      notesSyncError = null;
      setTimeout(() => renderNotesUI(output), 0);
    }
  };
  window.addEventListener('gist-sync-status', handleSyncStatus);
  window.addEventListener('file-sync-status', handleSyncStatus);
}
