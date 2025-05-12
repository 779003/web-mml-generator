/**
 * 분리된 파일들을 통합하여 실행
 */
// 트랙 선택 버튼 이벤트 리스너
document.getElementById('melodyBtn').addEventListener('click', () => {
    currentTrack = 'melody';
    updateTrackButtons();
});
document.getElementById('chord1Btn').addEventListener('click', () => {
    currentTrack = 'chord1';
    updateTrackButtons();
});
document.getElementById('chord2Btn').addEventListener('click', () => {
    currentTrack = 'chord2';
    updateTrackButtons();
});
document.getElementById('chord3Btn').addEventListener('click', () => {
    currentTrack = 'chord3';
    updateTrackButtons();
});
document.getElementById('chord4Btn').addEventListener('click', () => {
    currentTrack = 'chord4';
    updateTrackButtons();
});
document.getElementById('chord5Btn').addEventListener('click', () => {
    currentTrack = 'chord5';
    updateTrackButtons();
});

function updateTrackButtons() {
    document.querySelectorAll('.track-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`${currentTrack}Btn`).classList.add('active');
    updateButtonStates();
}

function setLength(length) {
    currentLength = length;
    isDottedLength = false;
    lastAddedLength = length;
    const output = document.getElementById(`${currentTrack}Output`);
    const history = getHistory(currentTrack);
    const redoHistory = getRedoHistory(currentTrack);
    
    let newValue = output.value + `l${length}`;
    if (newValue.length > MAX_LENGTH) {
        document.getElementById('error').innerHTML = '최대 1200자를 초과할 수 없습니다.';
        return;
    }

    pushHistory(history, output.value);
    redoHistory.length = 0;
    output.value = cleanMML(newValue);
    validateInputWithFeedback(output, currentTrack);
    renderPreview();
    updateCharCount(output);
    updateButtonStates();
}

function pasteMMLCode() {
    const confirmPaste = confirm('MML 코드를 붙여넣으시겠습니까?');
    if (!confirmPaste) {
        return;
    }

    const errorDiv = document.getElementById('error');
    if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(cleanedMML => {
            cleanedMML = cleanedMML.trim().replace(/;+$/, '').replace(/\s/g, '');
            const tracks = cleanedMML.startsWith('MML@') ? cleanedMML.slice(4).split(',').map(track => track.trim()) : [cleanedMML];

            if (tracks.length >= 1) {
                const melodyOutput = document.getElementById('melodyOutput');
                if (tracks[0].length > MAX_LENGTH) {
                    errorDiv.innerHTML = '멜로디 트랙이 최대 1200자를 초과했습니다.';
                    return;
                }
                melodyOutput.value = tracks[0];
                pushHistory(melodyHistory, tracks[0]);
                melodyRedoHistory.length = 0;
                updateNotePositionsCache('melody', tracks[0]);
                validateInputWithFeedback(melodyOutput, 'melody');
                updateCharCount(melodyOutput);
            }
            for (let i = 1; i <= 5; i++) {
                const chordOutput = document.getElementById(`chord${i}Output`);
                if (i <= tracks.length - 1) {
                    if (tracks[i].length > MAX_LENGTH) {
                        errorDiv.innerHTML = `화음${i} 트랙이 최대 1200자를 초과했습니다.`;
                        return;
                    }
                    chordOutput.value = tracks[i];
                    pushHistory(getHistory(`chord${i}`), tracks[i]);
                    getRedoHistory(`chord${i}`).length = 0;
                    updateNotePositionsCache(`chord${i}`, tracks[i]);
                    validateInputWithFeedback(chordOutput, `chord${i}`);
                    updateCharCount(chordOutput);
                } else {
                    chordOutput.value = 't120l4v8';
                    pushHistory(getHistory(`chord${i}`), 't120l4v8');
                    getRedoHistory(`chord${i}`).length = 0;
                    updateNotePositionsCache(`chord${i}`, 't120l4v8');
                    validateInputWithFeedback(chordOutput, `chord${i}`);
                    updateCharCount(chordOutput);
                }
            }
            renderPreview();
            updateButtonStates();
            errorDiv.innerHTML = 'MML 코드가 성공적으로 붙여넣어졌습니다!';
        }).catch(err => {
            errorDiv.innerHTML = '클립보드 접근에 실패했습니다. 직접 입력해 주세요.';
            const userInput = prompt('MML 코드를 입력해 주세요 (예: MML@...):');
            if (userInput) {
                let cleanedMML = userInput.trim().replace(/;+$/, '').replace(/\s/g, '');
                const tracks = cleanedMML.startsWith('MML@') ? cleanedMML.slice(4).split(',').map(track => track.trim()) : [cleanedMML];

                if (tracks.length >= 1) {
                    const melodyOutput = document.getElementById('melodyOutput');
                    if (tracks[0].length > MAX_LENGTH) {
                        errorDiv.innerHTML = '멜로디 트랙이 최대 1200자를 초과했습니다.';
                        return;
                    }
                    melodyOutput.value = tracks[0];
                    pushHistory(melodyHistory, tracks[0]);
                    melodyRedoHistory.length = 0;
                    updateNotePositionsCache('melody', tracks[0]);
                    validateInputWithFeedback(melodyOutput, 'melody');
                    updateCharCount(melodyOutput);
                }
                for (let i = 1; i <= 5; i++) {
                    const chordOutput = document.getElementById(`chord${i}Output`);
                    if (i <= tracks.length - 1) {
                        if (tracks[i].length > MAX_LENGTH) {
                            errorDiv.innerHTML = `화음${i} 트랙이 최대 1200자를 초과했습니다.`;
                            return;
                        }
                        chordOutput.value = tracks[i];
                        pushHistory(getHistory(`chord${i}`), tracks[i]);
                        getRedoHistory(`chord${i}`).length = 0;
                        updateNotePositionsCache(`chord${i}`, tracks[i]);
                        validateInputWithFeedback(chordOutput, `chord${i}`);
                        updateCharCount(chordOutput);
                    } else {
                        chordOutput.value = 't120l4v8';
                        pushHistory(getHistory(`chord${i}`), 't120l4v8');
                        getRedoHistory(`chord${i}`).length = 0;
                        updateNotePositionsCache(`chord${i}`, 't120l4v8');
                        validateInputWithFeedback(chordOutput, `chord${i}`);
                        updateCharCount(chordOutput);
                    }
                }
                renderPreview();
                updateButtonStates();
                errorDiv.innerHTML = 'MML 코드가 성공적으로 붙여넣어졌습니다!';
            }
        });
    } else {
        errorDiv.innerHTML = '이 브라우저는 클립보드 API를 지원하지 않습니다. 직접 입력해 주세요.';
        const userInput = prompt('MML 코드를 입력해 주세요 (예: MML@...):');
        if (userInput) {
            let cleanedMML = userInput.trim().replace(/;+$/, '').replace(/\s/g, '');
            const tracks = cleanedMML.startsWith('MML@') ? cleanedMML.slice(4).split(',').map(track => track.trim()) : [cleanedMML];

            if (tracks.length >= 1) {
                const melodyOutput = document.getElementById('melodyOutput');
                if (tracks[0].length > MAX_LENGTH) {
                    errorDiv.innerHTML = '멜로디 트랙이 최대 1200자를 초과했습니다.';
                    return;
                }
                melodyOutput.value = tracks[0];
                pushHistory(melodyHistory, tracks[0]);
                melodyRedoHistory.length = 0;
                updateNotePositionsCache('melody', tracks[0]);
                validateInputWithFeedback(melodyOutput, 'melody');
                updateCharCount(melodyOutput);
            }
            for (let i = 1; i <= 5; i++) {
                const chordOutput = document.getElementById(`chord${i}Output`);
                if (i <= tracks.length - 1) {
                    if (tracks[i].length > MAX_LENGTH) {
                        errorDiv.innerHTML = `화음${i} 트랙이 최대 1200자를 초과했습니다.`;
                        return;
                    }
                    chordOutput.value = tracks[i];
                    pushHistory(getHistory(`chord${i}`), tracks[i]);
                    getRedoHistory(`chord${i}`).length = 0;
                    updateNotePositionsCache(`chord${i}`, tracks[i]);
                    validateInputWithFeedback(chordOutput, `chord${i}`);
                    updateCharCount(chordOutput);
                } else {
                    chordOutput.value = 't120l4v8';
                    pushHistory(getHistory(`chord${i}`), 't120l4v8');
                    getRedoHistory(`chord${i}`).length = 0;
                    updateNotePositionsCache(`chord${i}`, 't120l4v8');
                    validateInputWithFeedback(chordOutput, `chord${i}`);
                    updateCharCount(chordOutput);
                }
            }
            renderPreview();
            updateButtonStates();
            errorDiv.innerHTML = 'MML 코드가 성공적으로 붙여넣어졌습니다!';
        }
    }
}

function copyAllTracks() {
    const melodyMML = document.getElementById('melodyOutput').value.replace(/\s/g, '');
    const chordMMLs = [
        document.getElementById('chord1Output').value.replace(/\s/g, ''),
        document.getElementById('chord2Output').value.replace(/\s/g, ''),
        document.getElementById('chord3Output').value.replace(/\s/g, ''),
        document.getElementById('chord4Output').value.replace(/\s/g, ''),
        document.getElementById('chord5Output').value.replace(/\s/g, '')
    ];

    const tracks = [
        { mml: melodyMML, name: '멜로디' },
        { mml: chordMMLs[0], name: '화음1' },
        { mml: chordMMLs[1], name: '화음2' },
        { mml: chordMMLs[2], name: '화음3' },
        { mml: chordMMLs[3], name: '화음4' },
        { mml: chordMMLs[4], name: '화음5' }
    ];

    const errorDiv = document.getElementById('error');
    let validationError = null;
    tracks.forEach(track => {
        const result = parseMML(track.mml, 1.0, 'sine');
        if (result.error) {
            validationError = `${track.name}: ${result.error}`;
        }
    });

    if (validationError) {
        errorDiv.innerHTML = `유효하지 않은 MML 코드: ${validationError}`;
        return;
    }

    const chords = chordMMLs.filter(chord => chord !== 't120l4v8');
    const combined = `MML@${melodyMML}${chords.length > 0 ? ',' + chords.join(',') : ''};`;
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = combined;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    try {
        document.execCommand('copy');
        alert('전체 코드가 복사되었습니다! 모비노기 빈 악보에 붙여넣기 버튼만 한 번 누르세요!');
    } catch (err) {
        document.getElementById('error').innerHTML = '복사에 실패했습니다. HTTPS 환경에서 실행하거나 브라우저 권한을 확인하세요.';
    } finally {
        document.body.removeChild(tempTextarea);
    }
}

function undo() {
    const output = document.getElementById(`${currentTrack}Output`);
    const history = getHistory(currentTrack);
    const redoHistory = getRedoHistory(currentTrack);
    if (history.length > 1) {
        pushHistory(redoHistory, output.value);
        history.pop();
        output.value = history[history.length - 1];
        const lastOctave = getLastOctave(output.value);
        setCurrentOctave(currentTrack, lastOctave);
        updateNotePositionsCache(currentTrack, output.value);
        validateInputWithFeedback(output, currentTrack);
        renderPreview();
        updateCharCount(output);
        updateButtonStates();
    }
}

function redo() {
    const output = document.getElementById(`${currentTrack}Output`);
    const history = getHistory(currentTrack);
    const redoHistory = getRedoHistory(currentTrack);
    if (redoHistory.length > 0) {
        const redoState = redoHistory.pop();
        pushHistory(history, redoState);
        output.value = redoState;
        const lastOctave = getLastOctave(output.value);
        setCurrentOctave(currentTrack, lastOctave);
        updateNotePositionsCache(currentTrack, output.value);
        validateInputWithFeedback(output, currentTrack);
        renderPreview();
        updateCharCount(output);
        updateButtonStates();
    }
}

function clearAll() {
    outputs.forEach(id => {
        const output = document.getElementById(id);
        const history = getHistory(id.replace('Output', ''));
        const redoHistory = getRedoHistory(id.replace('Output', ''));
        pushHistory(history, output.value);
        redoHistory.length = 0;
    });

    stopMML();

    document.getElementById('melodyOutput').value = 't120l4v10';
    document.getElementById('chord1Output').value = 't120l4v8';
    document.getElementById('chord2Output').value = 't120l4v8';
    document.getElementById('chord3Output').value = 't120l4v8';
    document.getElementById('chord4Output').value = 't120l4v8';
    document.getElementById('chord5Output').value = 't120l4v8';
    melodyOctave = 4;
    chord1Octave = 3;
    chord2Octave = 3;
    chord3Octave = 3;
    chord4Octave = 3;
    chord5Octave = 3;
    currentLength = parseInt(document.getElementById('lengthSelect').value);
    isDottedLength = false;
    lastAddedLength = currentLength;
    lastAddedNote = null;

    Object.keys(notePositionsCache).forEach(track => {
        notePositionsCache[track] = [];
    });

    outputs.forEach(id => {
        const textarea = document.getElementById(id);
        pushHistory(getHistory(id.replace('Output', '')), textarea.value);
        updateNotePositionsCache(id.replace('Output', ''), textarea.value);
        validateInputWithFeedback(textarea, id.replace('Output', ''));
        updateCharCount(textarea);
    });

    renderPreview();
    updateButtonStates();
}

function toggleKeySound() {
    isKeySoundEnabled = !isKeySoundEnabled;
    const toggleButton = document.getElementById('keySoundToggle');
    toggleButton.textContent = isKeySoundEnabled ? '건반 소리 ON' : '건반 소리 OFF';
}

window.onload = () => {
    // Web Audio API 지원 여부 확인
    if (!window.AudioContext && !window.webkitAudioContext) {
        document.getElementById('audioUnsupportedModal').style.display = 'flex';
    }

    // 초기 건반 소리 버튼 텍스트 설정
    document.getElementById('keySoundToggle').textContent = isKeySoundEnabled ? '건반 소리 ON' : '건반 소리 OFF';

    updateButtonStates();
    outputs.forEach(id => {
        const textarea = document.getElementById(id);
        updateNotePositionsCache(id.replace('Output', ''), textarea.value);
        validateInputWithFeedback(textarea, id.replace('Output', ''));
        updateCharCount(textarea);
    });
    renderPreview();
};

window.updateTrackButtons = updateTrackButtons;
window.setLength = setLength;
window.copyAllTracks = copyAllTracks;
window.undo = undo;
window.redo = redo;
window.clearAll = clearAll;
window.pasteMMLCode = pasteMMLCode;
window.toggleKeySound = toggleKeySound;