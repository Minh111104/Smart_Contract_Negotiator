// Simple text diff utility for comparing contract versions
export const generateSimpleDiff = (oldText, newText) => {
  if (oldText === newText) {
    return { hasChanges: false, diff: 'No changes detected' };
  }

  // Remove HTML tags for comparison
  const stripHtml = (text) => text.replace(/<[^>]*>/g, '');
  const oldClean = stripHtml(oldText);
  const newClean = stripHtml(newText);

  if (oldClean === newClean) {
    return { hasChanges: false, diff: 'Only formatting changes detected' };
  }

  // Simple word-based diff
  const oldWords = oldClean.split(/\s+/);
  const newWords = newClean.split(/\s+/);
  
  const added = [];
  const removed = [];
  
  // Find added words
  newWords.forEach(word => {
    if (!oldWords.includes(word)) {
      added.push(word);
    }
  });
  
  // Find removed words
  oldWords.forEach(word => {
    if (!newWords.includes(word)) {
      removed.push(word);
    }
  });

  let diffText = '';
  
  if (added.length > 0) {
    diffText += `Added: ${added.join(', ')}\n`;
  }
  
  if (removed.length > 0) {
    diffText += `Removed: ${removed.join(', ')}\n`;
  }

  // Calculate change percentage
  const totalWords = Math.max(oldWords.length, newWords.length);
  const changePercentage = ((added.length + removed.length) / totalWords * 100).toFixed(1);

  return {
    hasChanges: true,
    diff: diffText,
    added: added,
    removed: removed,
    changePercentage: changePercentage,
    oldWordCount: oldWords.length,
    newWordCount: newWords.length
  };
};

export const formatDiffForDisplay = (diffResult) => {
  if (!diffResult.hasChanges) {
    return diffResult.diff;
  }

  let formatted = '';
  
  if (diffResult.added.length > 0) {
    formatted += `<div class="diff-added"><strong>Added:</strong> <span class="text-green-600">${diffResult.added.join(', ')}</span></div>`;
  }
  
  if (diffResult.removed.length > 0) {
    formatted += `<div class="diff-removed"><strong>Removed:</strong> <span class="text-red-600">${diffResult.removed.join(', ')}</span></div>`;
  }
  
  formatted += `<div class="diff-stats"><small>Change: ${diffResult.changePercentage}% | Words: ${diffResult.oldWordCount} → ${diffResult.newWordCount}</small></div>`;
  
  return formatted;
};
