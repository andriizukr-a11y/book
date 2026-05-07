/* ---------- NOTES STORAGE ---------- */

const NOTES_STORAGE_KEY = 'notes_data';
const NOTES_TOPICS_KEY = 'notes_topics';
const NOTES_ACTIVE_KEY = 'notes_active_topic';
const NOTES_TIMESTAMPS_KEY = 'notes_timestamps';
const NOTES_GROUPS_KEY = 'notes_groups';
const NOTES_TOPIC_GROUPS_KEY = 'notes_topic_groups';
const NOTES_MAIN_GROUP_KEY = 'notes_main_group';
const NOTES_COLLAPSED_KEY = 'notes_collapsed_groups';

function getNotesData() {
  try { return JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveNotesData(data) { 
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(data)); 
  if (typeof gistStorage !== 'undefined' && gistStorage.isEnabled()) {
    gistStorage.markPendingChanges();
  }
  if (typeof fileStorage !== 'undefined' && fileStorage.isEnabled()) {
    fileStorage.markPendingChanges();
  }
}

function getNotesTopics() {
  try {
    const topics = JSON.parse(localStorage.getItem(NOTES_TOPICS_KEY)) || [];
    const data = getNotesData();
    let changed = false;

    for (const key of Object.keys(data)) {
      if (key && !topics.includes(key)) {
        topics.push(key);
        changed = true;
      }
    }

    const filtered = topics.filter(t => t && data.hasOwnProperty(t));
    if (filtered.length !== topics.length) changed = true;

    if (changed && filtered.length) {
      localStorage.setItem(NOTES_TOPICS_KEY, JSON.stringify(filtered));
    }

    if (filtered.length) return filtered;
  } catch {}
  return [getMainGroupName()];
}

function saveNotesTopics(topics) { 
  localStorage.setItem(NOTES_TOPICS_KEY, JSON.stringify(topics)); 
  if (typeof gistStorage !== 'undefined' && gistStorage.isEnabled()) {
    gistStorage.markPendingChanges();
  }
  if (typeof fileStorage !== 'undefined' && fileStorage.isEnabled()) {
    fileStorage.markPendingChanges();
  }
}

function getNotesTimestamps() {
  try { return JSON.parse(localStorage.getItem(NOTES_TIMESTAMPS_KEY)) || {}; }
  catch { return {}; }
}

function saveNotesTimestamps(ts) { 
  localStorage.setItem(NOTES_TIMESTAMPS_KEY, JSON.stringify(ts)); 
  if (typeof gistStorage !== 'undefined' && gistStorage.isEnabled()) {
    gistStorage.markPendingChanges();
  }
  if (typeof fileStorage !== 'undefined' && fileStorage.isEnabled()) {
    fileStorage.markPendingChanges();
  }
}

function getNotesGroups() {
  try {
    const g = JSON.parse(localStorage.getItem(NOTES_GROUPS_KEY));
    if (g && g.length) {
      const mainGroupName = getMainGroupName();
      const hasMainGroup = g.includes(mainGroupName);
      
      if (!hasMainGroup) {
        const oldIndex = g.indexOf('Загальне');
        if (oldIndex !== -1 && mainGroupName !== 'Загальне') {
          g[oldIndex] = mainGroupName;
        } else {
          g.unshift(mainGroupName);
        }
        saveNotesGroups(g);
      } else {
        const filteredGroups = g.filter((name, index) => name !== mainGroupName || index === g.indexOf(mainGroupName));
        if (filteredGroups.length !== g.length) {
          saveNotesGroups(filteredGroups);
          return filteredGroups;
        }
      }
      return g;
    }
  } catch {}
  return [getMainGroupName()];
}

function saveNotesGroups(groups) { 
  localStorage.setItem(NOTES_GROUPS_KEY, JSON.stringify(groups)); 
  if (typeof gistStorage !== 'undefined' && gistStorage.isEnabled()) {
    gistStorage.markPendingChanges();
  }
  if (typeof fileStorage !== 'undefined' && fileStorage.isEnabled()) {
    fileStorage.markPendingChanges();
  }
}

function getTopicGroups() {
  try { 
    const tg = JSON.parse(localStorage.getItem(NOTES_TOPIC_GROUPS_KEY)) || {};
    
    const mainGroupName = getMainGroupName();
    let needsSave = false;
    
    for (const topic in tg) {
      if (tg[topic] === 'Загальне' && mainGroupName !== 'Загальне') {
        tg[topic] = mainGroupName;
        needsSave = true;
      }
    }
    
    if (needsSave) {
      saveTopicGroups(tg);
    }
    
    return tg;
  } catch { return {}; }
}

function saveTopicGroups(map) { 
  localStorage.setItem(NOTES_TOPIC_GROUPS_KEY, JSON.stringify(map)); 
  if (typeof gistStorage !== 'undefined' && gistStorage.isEnabled()) {
    gistStorage.markPendingChanges();
  }
  if (typeof fileStorage !== 'undefined' && fileStorage.isEnabled()) {
    fileStorage.markPendingChanges();
  }
}

function getTopicGroup(topic) { 
  return getTopicGroups()[topic] || getMainGroupName(); 
}

function getCollapsedGroups() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_COLLAPSED_KEY)) || [];
  } catch { return []; }
}

function saveCollapsedGroups(arr) {
  localStorage.setItem(NOTES_COLLAPSED_KEY, JSON.stringify(arr));
  if (typeof gistStorage !== 'undefined' && gistStorage.isEnabled()) {
    gistStorage.markPendingChanges();
  }
  if (typeof fileStorage !== 'undefined' && fileStorage.isEnabled()) {
    fileStorage.markPendingChanges();
  }
}

function getMainGroupName() {
  try {
    const name = localStorage.getItem(NOTES_MAIN_GROUP_KEY);
    if (name && name.trim()) return name.trim();
  } catch {}
  return 'Загальне';
}

function setMainGroupName(name) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  localStorage.setItem(NOTES_MAIN_GROUP_KEY, trimmed);
  return true;
}
