let previewAudioContext = null;
let previewOscillator = null;
let lastVolumeChanges = {
    melody: [],
    chord1: [],
    chord2: [],
    chord3: [],
    chord4: [],
    chord5: []
};

function updateCharCount(textarea) {
    const trackId = textarea.id.replace('Output', '');
    const charCountDiv = document.getElementById(`${trackId}CharCount`);
    const remaining = MAX_LENGTH - textarea.value.length;
    charCountDiv.textContent = `${remaining}/${MAX_LENGTH}`;
    if (remaining < 100) {
        charCountDiv.classList.add('warning');
    } else {
        charCountDiv.classList.remove('warning');
    }
}

function addNote(note, octave) {
  if (octave < 0 || octave > 8) {
    document.getElementById('error').innerHTML = '옥타브는 0~8 사이여야 합니다.';
    return;
  }
  const output = document.getElementById(`${currentTrack}Output`);
  if (!output) {
    document.getElementById('error').innerHTML = `트랙 ${currentTrack}의 텍스트박스를 찾을 수 없습니다.`;
    return;
  }
  const history = getHistory(currentTrack);
  const redoHistory = getRedoHistory(currentTrack);
  const currentOctave = getLastOctave(output.value);

  let newValue = output.value;
  if (note !== 'r' && octave !== currentOctave) {
    if (octave === currentOctave + 1) {
      newValue += '>';
    } else if (octave === currentOctave - 1) {
      newValue += '<';
    } else {
      newValue += `o${octave}`;
    }
    setCurrentOctave(currentTrack, octave);
  }

  const noteWithModifier = note.includes('#') || note.includes('-') ? note : `${note}`;
  const noteLength = currentLength.toString();
  newValue += `${noteWithModifier}${noteLength}`;
  lastAddedNote = note === 'r' ? 'r' : `${noteWithModifier}${octave}`;
  lastAddedLength = currentLength;

  if (newValue.length > MAX_LENGTH) {
    document.getElementById('error').innerHTML = '최대 1200자를 초과할 수 없습니다.';
    return;
  }

  output.value = cleanMML(newValue);

  if (isKeySoundEnabled && note !== 'r') {
    playNote(noteWithModifier, octave);
  }

  updateNotePositionsCache(currentTrack, output.value);
  renderPreview();
  updateCharCount(output);
  pushHistory(history, output.value);
  redoHistory.length = 0;
  validateInputWithFeedback(output, currentTrack);
  updateButtonStates();
}

function playNote(note, octave) {
    const noteFrequencies = {
        'c': 261.63,
        'c#': 277.18,
        'd': 293.66,
        'd#': 311.13,
        'e': 329.63,
        'f': 349.23,
        'f#': 369.99,
        'g': 392.00,
        'g#': 415.30,
        'a': 440.00,
        'a#': 466.16,
        'b': 493.88
    };

    if (note === 'r') return;

    if (!previewAudioContext) {
        previewAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (previewOscillator) {
        previewOscillator.stop();
        previewOscillator.disconnect();
    }

    const freqKey = note;
    let frequency = noteFrequencies[freqKey] || noteFrequencies[note];
    if (!frequency) {
        document.getElementById('error').innerHTML = `유효하지 않은 음표: ${note}`;
        return;
    }
    frequency *= Math.pow(2, octave - 4);

    previewOscillator = previewAudioContext.createOscillator();
    const gainNode = previewAudioContext.createGain();
    previewOscillator.type = 'sine';
    previewOscillator.frequency.setValueAtTime(frequency, previewAudioContext.currentTime);

    const volume = 10 * 1.0;
    const adjustedGain = (volume / 15) * 0.8;
    const fadeTime = 0.01;
    gainNode.gain.setValueAtTime(0, previewAudioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(adjustedGain, previewAudioContext.currentTime + fadeTime);
    gainNode.gain.setValueAtTime(adjustedGain, previewAudioContext.currentTime + 0.5 - fadeTime);
    gainNode.gain.linearRampToValueAtTime(0, previewAudioContext.currentTime + 0.5);

    previewOscillator.connect(gainNode);
    gainNode.connect(previewAudioContext.destination);
    previewOscillator.start(previewAudioContext.currentTime);
    previewOscillator.stop(previewAudioContext.currentTime + 0.5);
}

function connectNotes() {
    const output = document.getElementById(`${currentTrack}Output`);
    const history = getHistory(currentTrack);
    const redoHistory = getRedoHistory(currentTrack);

    const tokens = output.value.match(/[a-gr][#-]?[0-9]*\.?|&|[<>]|[tolv][0-9]+\.?|[n][0-9]+|./g) || [];
    let lastNote = null;
    for (let i = tokens.length - 1; i >= 0; i--) {
        if (tokens[i].match(/^[a-gr][#-]?[0-9]*\.?/)) {
            lastNote = tokens[i];
            break;
        }
    }

    if (!lastNote) {
        document.getElementById('error').innerHTML = '연결할 음표가 없습니다.';
        return;
    }

    let newValue = output.value + `&${lastNote}`;
    if (newValue.length > MAX_LENGTH) {
        document.getElementById('error').innerHTML = '최대 1200자를 초과할 수 없습니다.';
        return;
    }

    pushHistory(history, output.value);
    redoHistory.length = 0;
    output.value = cleanMML(newValue);

    updateNotePositionsCache(currentTrack, output.value);
    validateInputWithFeedback(output, currentTrack);
    renderPreview();
    updateCharCount(output);
    updateButtonStates();
}

function updateTrack(textarea) {
    const trackId = textarea.id.replace('Output', '');
    const history = getHistory(trackId);
    const redoHistory = getRedoHistory(trackId);
    
	let newValue = textarea.value.toLowerCase().replace(/\s/g, ''); // 대문자를 소문자로 변환하고 공백 제거
    if (newValue.trim() === '') {
        newValue = trackId === 'melody' ? 't120l4v10' : 't120l4v8';
        lastVolumeChanges[trackId] = [];
    }

    if (newValue.length > MAX_LENGTH) {
        textarea.value = newValue.substring(0, MAX_LENGTH);
        document.getElementById('error').innerHTML = '최대 1200자를 초과할 수 없습니다.';
        newValue = textarea.value;
    }

	pushHistory(history, textarea.value); // 변환 전 값을 저장
    redoHistory.length = 0;
    textarea.value = newValue; // 변환된 값을 textarea에 반영
    const lastOctave = getLastOctave(newValue);
    setCurrentOctave(trackId, lastOctave);
    updateNotePositionsCache(trackId, newValue);
    validateInputWithFeedback(textarea, trackId);
    renderPreview();
    updateCharCount(textarea);
    updateButtonStates();
}

function validateInputWithFeedback(textarea, trackId) {
    const mml = textarea.value;
    const result = parseMML(mml, 1.0, 'sine');
    const errorDiv = document.getElementById('error');
    const trackName = trackId === 'melody' ? '멜로디' : `화음${trackId.replace('chord', '')}`;
    
    if (result.error) {
        textarea.classList.add('invalid');
        errorDiv.innerHTML = `${trackName}: ${result.error}`;
    } else {
        textarea.classList.remove('invalid');
        let hasOtherInvalid = false;
        outputs.forEach(id => {
            if (id !== textarea.id) {
                const otherTextarea = document.getElementById(id);
                const otherResult = parseMML(otherTextarea.value, 1.0, 'sine');
                if (otherResult.error) {
                    hasOtherInvalid = true;
                }
            }
        });
        if (!hasOtherInvalid) {
            errorDiv.innerHTML = '';
        }
    }
    return !result.error;
}

function updateNotePositionsCache(trackId, mml) {
  notePositionsCache[trackId] = [];
  const tokens = mml.match(/[a-gr][#-]?[0-9]*\.?|&|[<>]|[tolv][0-9]+\.?|[n][0-9]+|./g) || [];

  if (!tokens.length) {
    document.getElementById('error').innerHTML = 'MML 코드 파싱에 실패했습니다.';
    return;
  }

  let x = 50;
  let currentOctave = 4;
  let currentLength = lastAddedLength || 4;
  let isDottedLength = window.isDottedLength || false;
  let isConnected = false;
  let lastNoteData = null;
  let noteIdx = 0;
  const staffSpacing = 10;
  const baseDistance = 30;

  tokens.forEach((token, tokenIndex) => {
    if (token.startsWith('o')) {
      currentOctave = parseInt(token.slice(1));
    } else if (token === '>') {
      currentOctave++;
    } else if (token === '<') {
      currentOctave--;
    } else if (token.startsWith('l')) {
      const lengthMatch = token.match(/l([0-9]+)(\.)?/);
      if (lengthMatch) {
        currentLength = parseInt(lengthMatch[1]);
        isDottedLength = !!lengthMatch[2];
      }
    } else if (token.startsWith('v')) {
      const volumeMatch = token.match(/v([0-9]+)(\.)?/);
      if (volumeMatch) {
        const volume = parseInt(volumeMatch[1]);
        if (!lastVolumeChanges[trackId].some(change => change.x === x && change.volume === volume)) {
          lastVolumeChanges[trackId].push({ x: x, volume: volume, trackId: trackId });
        }
      }
    } else if (token === '&') {
      isConnected = true;
    } else if (token.startsWith('n')) {
      const noteNumber = parseInt(token.slice(1));
      const relativePitch = (noteNumber - 60) / 12 * 7;
      const y = (-relativePitch / 2 + 5) * staffSpacing;
      notePositionsCache[trackId].push({
        x: x,
        y: y,
        note: 'n' + noteNumber,
        modifier: '',
        length: currentLength,
        isDotted: isDottedLength,
        isConnected: isConnected,
        connectedTo: lastNoteData ? { x: lastNoteData.x, y: lastNoteData.y } : null,
        noteIdx: noteIdx
      });
      const xIncrement = baseDistance * (4 / currentLength) * (isDottedLength ? 1.5 : 1);
      x += xIncrement;
      noteIdx++;
      lastNoteData = notePositionsCache[trackId][notePositionsCache[trackId].length - 1];
      isConnected = false;
    } else if (token.match(/^[a-gr][#-]?[0-9]*\.?/)) {
      const noteMatch = token.match(/^([a-gr])([#-])?([0-9]*\.?)?/);
      if (!noteMatch) return;
      const note = noteMatch[1];
      const modifier = noteMatch[2] || '';
      const lengthStr = noteMatch[3] || '';
      const isDotted = lengthStr.includes('.');
      const length = lengthStr.replace('.', '') ? parseInt(lengthStr.replace('.', '')) : currentLength;

      if (note === 'r') {
        notePositionsCache[trackId].push({
          x: x,
          y: 2 * staffSpacing,
          note: note,
          modifier: '',
          length: length,
          isDotted: isDotted || isDottedLength,
          isConnected: isConnected,
          connectedTo: lastNoteData ? { x: lastNoteData.x, y: lastNoteData.y } : null,
          noteIdx: noteIdx
        });
        const xIncrement = baseDistance * (4 / length) * (isDotted || isDottedLength ? 1.5 : 1);
        x += xIncrement;
        noteIdx++;
        lastNoteData = notePositionsCache[trackId][notePositionsCache[trackId].length - 1];
        isConnected = false;
        return;
      }

      const noteIndex = 'cdefgab'.indexOf(note) + (modifier === '#' ? 0.5 : modifier === '-' ? -0.5 : 0);
      const relativePitch = currentOctave * 7 + noteIndex - 28;
      const y = (-relativePitch / 2 + 5) * staffSpacing;

      notePositionsCache[trackId].push({
        x: x,
        y: y,
        note: note,
        modifier: modifier,
        length: length,
        isDotted: isDotted || isDottedLength,
        isConnected: isConnected,
        connectedTo: lastNoteData ? { x: lastNoteData.x, y: lastNoteData.y } : null,
        noteIdx: noteIdx
      });
      const xIncrement = baseDistance * (4 / length) * (isDotted || isDottedLength ? 1.5 : 1);
      x += xIncrement;
      noteIdx++;
      lastNoteData = notePositionsCache[trackId][notePositionsCache[trackId].length - 1];
      isConnected = false;
    }
  });

  window.isDottedLength = isDottedLength;
}

function renderPreview(currentPlayX = 0) {
  const canvas = document.getElementById('previewCanvas');
  const infoCanvas = document.getElementById('infoCanvas');
  const ctx = canvas.getContext('2d');
  const activeTracks = getActiveTracks('both');
  
  let maxX = 50;
  activeTracks.forEach(track => {
    if (notePositionsCache[track.trackId].length > 0) {
      const lastNote = notePositionsCache[track.trackId][notePositionsCache[track.trackId].length - 1];
      maxX = Math.max(maxX, lastNote.x + 50);
    }
  });
  
  const noteCount = activeTracks.reduce((total, track) => total + notePositionsCache[track.trackId].length, 0);
  const canvasWidth = Math.max(800, maxX + 200);
  const canvasHeight = 50 + (40 + 20) * activeTracks.length;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  infoCanvas.width = canvasWidth;
  infoCanvas.height = activeTracks.length * 15;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const isDarkMode = document.body.classList.contains('dark-mode');
  ctx.strokeStyle = isDarkMode ? '#e0e0e0' : 'black';
  ctx.lineWidth = 1;
  const staffSpacing = 10;
  const staffTop = 50;
  const staffHeight = 40;
  const staffGap = 20;

  activeTracks.forEach((track, index) => {
    if (notePositionsCache[track.trackId].length > 0) {
      const yOffset = staffTop + (staffHeight + staffGap) * index;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, yOffset + i * staffSpacing);
        ctx.lineTo(canvas.width, yOffset + i * staffSpacing);
        ctx.stroke();
      }
    }
  });

  activeTracks.forEach((track, index) => {
    if (notePositionsCache[track.trackId].length === 0) return;
    const yOffset = staffTop + (staffHeight + staffGap) * index;
    const trackColor = isDarkMode ? trackColors[track.trackId].dark : trackColors[track.trackId].light;
    ctx.strokeStyle = trackColor;
    ctx.fillStyle = trackColor;

    let tripletGroup = [];
    let tripletStartX = null;

    notePositionsCache[track.trackId].forEach((noteData, noteIndex) => {
      const x = noteData.x;
      const y = yOffset + noteData.y;
      const staffBottom = yOffset + 4 * staffSpacing;
      const staffTopLine = yOffset;

      if (y < staffTopLine || y > staffBottom) {
        const ledgerYStart = y < staffTopLine ? Math.ceil((y - staffTopLine) / staffSpacing) * staffSpacing + staffTopLine : staffBottom;
        const ledgerYEnd = y < staffTopLine ? staffTopLine : Math.floor((y - staffBottom) / staffSpacing) * staffSpacing + staffBottom;
        for (let ledgerY = ledgerYStart; ledgerY <= ledgerYEnd; ledgerY += staffSpacing) {
          ctx.beginPath();
          ctx.moveTo(x - 10, ledgerY);
          ctx.lineTo(x + 10, ledgerY);
          ctx.stroke();
        }
      }

      const radiusX = 5;
      const radiusY = 3;

      if (noteData.note === 'r') {
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        let restSymbol = '𝄽';
        if (noteData.length === 1) restSymbol = '𝄻';
        else if (noteData.length === 2) restSymbol = '𝄼';
        else if (noteData.length >= 8) restSymbol = '𝄾';
        ctx.fillText(restSymbol, x, yOffset + 2 * staffSpacing);
        if (noteData.isDotted) {
          ctx.beginPath();
          ctx.arc(x + 10, yOffset + 2 * staffSpacing, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }

      if (noteData.length === 1) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.stroke();
      } else if (noteData.length === 2) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 5, y);
        ctx.lineTo(x + 5, y - 20);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(x, y, radiusX, radiusY, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        if (noteData.length >= 4) {
          ctx.beginPath();
          ctx.moveTo(x + 5, y);
          ctx.lineTo(x + 5, y - 20);
          ctx.stroke();

          const tailCount = Math.floor(Math.log2(noteData.length / 4));
          for (let i = 0; i < tailCount; i++) {
            ctx.beginPath();
            ctx.moveTo(x + 5, y - 20 + i * 5);
            ctx.lineTo(x + 10, y - 20 + i * 5);
            ctx.stroke();
          }
        }
      }

      if (noteData.isDotted) {
        ctx.beginPath();
        ctx.arc(x + 10, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      const isTriplet = [6, 12, 24, 48].includes(noteData.length);
      if (isTriplet) {
        tripletGroup.push(noteData);
        if (!tripletStartX) tripletStartX = x;

        if (tripletGroup.length === 3) {
          const endX = x;
          const midY = yOffset + 2 * staffSpacing - 15;
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('3', tripletStartX + (endX - tripletStartX) / 2, midY - 10);
          ctx.beginPath();
          ctx.moveTo(tripletStartX - 5, midY);
          ctx.lineTo(tripletStartX, midY - 5);
          ctx.lineTo(endX, midY - 5);
          ctx.lineTo(endX + 5, midY);
          ctx.stroke();
          tripletGroup = [];
          tripletStartX = null;
        }
      } else {
        tripletGroup = [];
        tripletStartX = null;
      }

      if (noteData.x === notePositionsCache[track.trackId][notePositionsCache[track.trackId].length - 1].x) {
        lastNoteX = { x, y };
      }
    });
  });

  if (currentPlayX > 0) {
    ctx.fillStyle = isDarkMode ? '#fb923c' : 'orange';
    ctx.fillRect(currentPlayX, 0, 2, canvasHeight);
  }

  if (lastNoteX) {
    ctx.strokeStyle = isDarkMode ? '#ef4444' : 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lastNoteX.x, lastNoteX.y, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  renderInfoCanvas(null, isDarkMode);

  const previewContainer = document.getElementById('previewCanvasContainer');
  const canvasContainer = document.querySelector('.canvas-container');
  if (currentPlayX > 0) {
    const viewportWidth = previewContainer.clientWidth;
    const scrollLeft = Math.max(0, currentPlayX - viewportWidth / 2);
    previewContainer.scrollTo({
      left: scrollLeft,
      behavior: 'smooth'
    });
    canvasContainer.scrollLeft = scrollLeft;
  }

  previewContainer.addEventListener('scroll', () => {
    canvasContainer.scrollLeft = previewContainer.scrollLeft;
  }, { once: true });
  canvasContainer.addEventListener('scroll', () => {
    previewContainer.scrollLeft = canvasContainer.scrollLeft;
  }, { once: true });
}

function renderInfoCanvas(currentNote, isDarkMode) {
  const infoCanvas = document.getElementById('infoCanvas');
  const ctx = infoCanvas.getContext('2d');
  ctx.clearRect(0, 0, infoCanvas.width, infoCanvas.height);

  ctx.font = '12px Arial';
  ctx.fillStyle = isDarkMode ? '#e0e0e0' : '#000000';
  ctx.textAlign = 'left';
  ctx.lineWidth = 1;
  ctx.strokeStyle = isDarkMode ? '#e0e0e0' : '#000000';

  const activeTracks = getActiveTracks('both');

  activeTracks.forEach((track, index) => {
    if (notePositionsCache[track.trackId].length === 0) return;
    const yOffset = (index + 1) * 15;

    notePositionsCache[track.trackId].forEach(noteData => {
      if (noteData.isConnected && noteData.connectedTo) {
        const startX = noteData.connectedTo.x + 5;
        const endX = noteData.x - 5;
        const y = yOffset - 2;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.quadraticCurveTo((startX + endX) / 2, y - 5, endX, y);
        ctx.stroke();
      }
    });

    const seenX = new Set();
    lastVolumeChanges[track.trackId].forEach(change => {
      if (!seenX.has(change.x)) {
        ctx.fillText(`vol${change.volume}`, change.x, yOffset);
        seenX.add(change.x);
      }
    });
  });
}

function updateTempo() {
    const tempo = Math.max(32, Math.min(255, document.getElementById('tempo').value));
    const activeTracks = getActiveTracks('both');
    activeTracks.forEach(track => {
        const output = document.getElementById(`${track.trackId}Output`);
        const history = getHistory(track.trackId);
        const redoHistory = getRedoHistory(track.trackId);
        pushHistory(history, output.value);
        redoHistory.length = 0;
        output.value = output.value.replace(/t[0-9]+/, `t${tempo}`);
        output.value = cleanMML(output.value);
        updateNotePositionsCache(track.trackId, output.value);
        validateInputWithFeedback(output, track.trackId);
        updateCharCount(output);
    });
    renderPreview();
    updateButtonStates();
}

function updateVolume() {
    const volume = Math.max(0, Math.min(15, document.getElementById('volume').value));
    const output = document.getElementById(`${currentTrack}Output`);
    const history = getHistory(currentTrack);
    const redoHistory = getRedoHistory(currentTrack);
    
    let newValue = output.value + `v${volume}`;
    if (newValue.length > MAX_LENGTH) {
        document.getElementById('error').innerHTML = '최대 1200자를 초과할 수 없습니다.';
        return;
    }

    pushHistory(history, output.value);
    redoHistory.length = 0;
    output.value = cleanMML(newValue);
    validateInputWithFeedback(output, currentTrack);
    updateNotePositionsCache(currentTrack, output.value);
    renderPreview();
    updateCharCount(output);
    updateButtonStates();
}

function updateLength() {
    const lengthSelect = document.getElementById('lengthSelect');
    currentLength = parseInt(lengthSelect.value);
    lastAddedLength = currentLength;
    renderPreview();
}

window.connectNotes = connectNotes;
window.updateTempo = updateTempo;
window.updateVolume = updateVolume;
window.updateLength = updateLength;
window.updateCharCount = updateCharCount;