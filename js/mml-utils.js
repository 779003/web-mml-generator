/**
 * 유틸리티 함수를 포함
 */
function getLastOctave(mml) {
    let lastOctave = 4;
    const tokens = mml.match(/[<>]|o[0-8]/g) || [];
    for (let token of tokens) {
        if (token.startsWith('o')) {
            lastOctave = parseInt(token.slice(1));
        } else if (token === '>') {
            lastOctave++;
        } else if (token === '<') {
            lastOctave--;
        }
    }
    return lastOctave;
}

function cleanMML(mml) {
    let currentOctave = 4;
    let currentVolume = 10;
    let currentTempo = 120;
    let cleanedMML = '';
    const tokens = mml.match(/[a-gr][#-]?([0-9]+\.?)?(&[a-gr][#-]?([0-9]+\.?)?)|[<>]|[tolv][0-9]+\.?|[n][0-9]+|./g) || [];
    let octaveDeclared = false;
    let volumeDeclared = false;
    let tempoDeclared = false;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.startsWith('o')) {
            const newOctave = parseInt(token.slice(1));
            if (!octaveDeclared || newOctave !== currentOctave) {
                cleanedMML += token;
                currentOctave = newOctave;
                octaveDeclared = true;
            }
        } else if (token === '>') {
            currentOctave++;
            if (i + 1 < tokens.length && tokens[i + 1].startsWith('o')) {
                continue;
            }
            cleanedMML += token;
            octaveDeclared = true;
        } else if (token === '<') {
            currentOctave--;
            if (i + 1 < tokens.length && tokens[i + 1].startsWith('o')) {
                continue;
            }
            cleanedMML += token;
            octaveDeclared = true;
        } else if (token.startsWith('v')) {
            const newVolume = parseInt(token.slice(1));
            if (!volumeDeclared || newVolume !== currentVolume) {
                cleanedMML += token;
                currentVolume = newVolume;
                volumeDeclared = true;
            }
        } else if (token.startsWith('t')) {
            const newTempo = parseInt(token.slice(1));
            if (!tempoDeclared || newTempo !== currentTempo) {
                cleanedMML += token;
                currentTempo = newTempo;
                tempoDeclared = true;
            }
        } else {
            cleanedMML += token;
        }
    }

    return cleanedMML;
}

function getHistory(track) {
    switch (track) {
        case 'melody': return melodyHistory;
        case 'chord1': return chord1History;
        case 'chord2': return chord2History;
        case 'chord3': return chord3History;
        case 'chord4': return chord4History;
        case 'chord5': return chord5History;
        default: console.error(`Invalid track: ${track}`); return [];
    }
}

function getRedoHistory(track) {
    switch (track) {
        case 'melody': return melodyRedoHistory;
        case 'chord1': return chord1RedoHistory;
        case 'chord2': return chord2RedoHistory;
        case 'chord3': return chord3RedoHistory;
        case 'chord4': return chord4RedoHistory;
        case 'chord5': return chord5RedoHistory;
        default: console.error(`Invalid track: ${track}`); return [];
    }
}

function getCurrentOctave(track) {
    switch (track) {
        case 'melody': return melodyOctave;
        case 'chord1': return chord1Octave;
        case 'chord2': return chord2Octave;
        case 'chord3': return chord3Octave;
        case 'chord4': return chord4Octave;
        case 'chord5': return chord5Octave;
        default: console.error(`Invalid track: ${track}`); return 4;
    }
}

function setCurrentOctave(track, octave) {
    switch (track) {
        case 'melody': melodyOctave = octave; break;
        case 'chord1': chord1Octave = octave; break;
        case 'chord2': chord2Octave = octave; break;
        case 'chord3': chord3Octave = octave; break;
        case 'chord4': chord4Octave = octave; break;
        case 'chord5': chord5Octave = octave; break;
        default: console.error(`Invalid track: ${track}`);
    }
}

function updateButtonStates() {
    const undoBtn = document.querySelector('.undo-btn');
    const redoBtn = document.querySelector('.redo-btn');
    const history = getHistory(currentTrack);
    const redoHistory = getRedoHistory(currentTrack);
    if (history.length <= 1) {
        undoBtn.setAttribute('disabled', 'true');
    } else {
        undoBtn.removeAttribute('disabled');
    }
    if (redoHistory.length === 0) {
        redoBtn.setAttribute('disabled', 'true');
    } else {
        redoBtn.removeAttribute('disabled');
    }
}

function toggleCollapse(sectionId) {
    const section = document.getElementById(sectionId);
    const button = section.previousElementSibling;
    section.classList.toggle('show');
    button.classList.toggle('collapsed');
}

function showHelpModal() {
    document.getElementById('helpModal').style.display = 'flex';
}

function closeHelpModal() {
    document.getElementById('helpModal').style.display = 'none';
}

document.getElementById('helpModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('helpModal')) {
        closeHelpModal();
    }
});

function getActiveTracks(mode) {
    const melodyMML = document.getElementById('melodyOutput').value.replace(/\s/g, '');
    const chordMMLs = [
        document.getElementById('chord1Output').value.replace(/\s/g, ''),
        document.getElementById('chord2Output').value.replace(/\s/g, ''),
        document.getElementById('chord3Output').value.replace(/\s/g, ''),
        document.getElementById('chord4Output').value.replace(/\s/g, ''),
        document.getElementById('chord5Output').value.replace(/\s/g, '')
    ];

    const activeTracks = [];
    if (mode === 'melody' || mode === 'both') {
        activeTracks.push({
            mml: melodyMML,
            octave: melodyOctave,
            color: 'blue',
            originalIndex: 0,
            trackId: 'melody'
        });
    }

    if (mode === 'chord' || mode === 'both') {
        chordMMLs.forEach((mml, index) => {
            if (mml !== 't120l4v8') {
                activeTracks.push({
                    mml: mml,
                    octave: getCurrentOctave(`chord${index + 1}`),
                    color: 'green',
                    originalIndex: index + 1,
                    trackId: `chord${index + 1}`
                });
            }
        });
    } else if (mode.startsWith('chord')) {
        const trackIndex = parseInt(mode.replace('chord', '')) - 1;
        if (trackIndex >= 0 && trackIndex < chordMMLs.length && chordMMLs[trackIndex] !== 't120l4v8') {
            activeTracks.push({
                mml: chordMMLs[trackIndex],
                octave: getCurrentOctave(`chord${trackIndex + 1}`),
                color: 'green',
                originalIndex: trackIndex + 1,
                trackId: `chord${trackIndex + 1}`
            });
        }
    }

    return activeTracks;
}

window.getLastOctave = getLastOctave;
window.cleanMML = cleanMML;
window.getHistory = getHistory;
window.getRedoHistory = getRedoHistory;
window.getCurrentOctave = getCurrentOctave;
window.setCurrentOctave = setCurrentOctave;
window.updateButtonStates = updateButtonStates;
window.toggleCollapse = toggleCollapse;
window.showHelpModal = showHelpModal;
window.closeHelpModal = closeHelpModal;
window.getActiveTracks = getActiveTracks;