/**
 * MML 파싱 및 재생 관련 핵심 로직을 포함
 */
let lastPlayTime = 0;
const DEBOUNCE_MS = 300;

function pushHistory(history, value) {
    history.push(value);
    if (history.length > MAX_HISTORY_SIZE) {
        history.shift();
    }
}

function parseMML(mml, volumeScale, waveform) {
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
    const validNotes = ['c', 'd', 'e', 'f', 'g', 'a', 'b', 'r'];
    let tempo = 120;
    let currentLength = 4;
    let isDottedLength = false;
    let currentOctave = 4;
    let currentVolume = 10;
    const notes = [];
    const notePositions = [];
    let error = null;
    let lastWasNote = false;
    let lastNote = null;
    let x = 50;
    let currentNote = null;

    mml = mml.replace(/\+/g, '#').toLowerCase().replace(/\s/g, ''); // 대문자를 소문자로 변환하고 모든 공백 제거

    const tokens = mml.match(/[a-gr][#-]?[0-9]*\.?|&|[<>]|[tolv][0-9]+\.?|[n][0-9]+|./g) || [];
    let i = 0;

    while (i < tokens.length) {
        const token = tokens[i];

        if (token.startsWith('t')) {
            const tempoMatch = token.match(/t([0-9]+)(\.)?/);
            if (tempoMatch) {
                tempo = parseInt(tempoMatch[1]);
                if (tempo < 32 || tempo > 255 || isNaN(tempo)) {
                    error = `유효하지 않은 템포: t${tempoMatch[1]} (32~255 사이여야 함)`;
                    break;
                }
            } else {
                error = `유효하지 않은 템포 선언: ${token}`;
                break;
            }
            i++;
        } else if (token.startsWith('l')) {
            const lengthMatch = token.match(/l([0-9]+)(\.)?/);
            if (lengthMatch) {
                currentLength = parseInt(lengthMatch[1]);
                isDottedLength = !!lengthMatch[2];
                if (currentLength < 1 || currentLength > 64 || isNaN(currentLength)) {
                    error = `유효하지 않은 음길이: l${lengthMatch[1]} (1~64 사이여야 함)`;
                    break;
                }
            } else {
                error = `유효하지 않은 음길이 선언: ${token}`;
                break;
            }
            i++;
        } else if (token.startsWith('o')) {
            currentOctave = parseInt(token.slice(1));
            if (currentOctave < 0 || currentOctave > 8 || isNaN(currentOctave)) {
                error = `유효하지 않은 옥타브: o${token.slice(1)} (0~8 사이여야 함)`;
                break;
            }
            i++;
        } else if (token.startsWith('v')) {
            const volumeMatch = token.match(/v([0-9]+)(\.)?/);
            if (volumeMatch) {
                currentVolume = parseInt(volumeMatch[1]);
                if (currentVolume < 0 || currentVolume > 15 || isNaN(currentVolume)) {
                    error = `유효하지 않은 볼륨: v${volumeMatch[1]} (0~15 사이여야 함)`;
                    break;
                }
            } else {
                error = `유효하지 않은 볼륨 선언: ${token}`;
                break;
            }
            i++;
        } else if (token === '>') {
            currentOctave++;
            if (currentOctave > 8) {
                error = `옥타브가 범위를 초과했습니다: ${currentOctave} (0~8 사이여야 함)`;
                break;
            }
            i++;
        } else if (token === '<') {
            currentOctave--;
            if (currentOctave < 0) {
                error = `옥타브가 범위를 초과했습니다: ${currentOctave} (0~8 사이여야 함)`;
                break;
            }
            i++;
        } else if (token === '&') {
            i++;
            if (i >= tokens.length) {
                error = `유효하지 않은 타이(&) 사용: & 뒤에는 음표(c, d, e 등)가 와야 합니다 (인덱스 ${i - 1})`;
                break;
            }

            let nextToken = tokens[i];
            let remainingToken = nextToken;
            let tieDuration = 0;
            let connectedNotes = 1;

            while (remainingToken.match(/^[a-gr][#-]?[0-9]*\.?/)) {
                const noteMatch = remainingToken.match(/^([a-gr])([#-])?([0-9]*\.?)?/);
                if (!noteMatch) {
                    error = `유효하지 않은 음표 패턴: ${remainingToken}`;
                    break;
                }
                const note = noteMatch[1];
                const modifier = noteMatch[2] || '';
                const lengthStr = noteMatch[3] || '';
                const isDotted = lengthStr.includes('.');
                const lengthNum = lengthStr.replace('.', '');
                const length = lengthNum ? parseInt(lengthNum) : currentLength;

                if (!validNotes.includes(note)) {
                    error = `유효하지 않은 음표: ${note}`;
                    break;
                }

                if (length < 1 || length > 64 || isNaN(length)) {
                    error = `유효하지 않은 음길이: ${length} (1~64 사이여야 함)`;
                    break;
                }

                let duration = (60 / tempo) * (4 / length);
                if (isDotted || isDottedLength) {
                    duration *= 1.5;
                }
                tieDuration += duration;

                if (currentNote) {
                    currentNote.duration += duration;
                } else {
                    // 이음표 앞에 음표가 없는 경우, 더미 음표 생성
                    let frequency = 0;
                    if (note !== 'r') {
                        const freqKey = modifier ? `${note}${modifier}` : note;
                        frequency = noteFrequencies[freqKey] || noteFrequencies[note];
                        if (!frequency) {
                            error = `유효하지 않은 음표: ${note}${modifier}`;
                            break;
                        }
                        frequency *= Math.pow(2, currentOctave - 4);
                    }
                    currentNote = { 
                        frequency, 
                        duration: duration, 
                        volume: currentVolume * volumeScale, 
                        waveform, 
                        isDotted: isDotted || isDottedLength,
                        length: length 
                    };
                    notes.push(currentNote);
                }
                notePositions.push({ x, noteIdx: notes.length - 1, length: length, isDotted: isDotted || isDottedLength });
                x += 30 * (4 / length) * (isDotted || isDottedLength ? 1.5 : 1);
                connectedNotes++;

                remainingToken = remainingToken.slice(noteMatch[0].length);
                if (!remainingToken) break;
            }

            i++;
            lastWasNote = true;
            continue;
        } else if (token.match(/^[a-gr][#-]?[0-9]*\.?/)) {
            let remainingToken = token;
            while (remainingToken.match(/^[a-gr][#-]?[0-9]*\.?/)) {
                const noteMatch = remainingToken.match(/^([a-gr])([#-])?([0-9]*\.?)?/);
                if (!noteMatch) {
                    error = `유효하지 않은 음표 패턴: ${remainingToken}`;
                    break;
                }

                const note = noteMatch[1];
                const modifier = noteMatch[2] || '';
                const lengthStr = noteMatch[3] || '';
                const isDotted = lengthStr.includes('.');
                const lengthNum = lengthStr.replace('.', '');
                const length = lengthNum ? parseInt(lengthNum) : currentLength;

                if (!validNotes.includes(note)) {
                    error = `유효하지 않은 음표: ${note}`;
                    break;
                }

                if (length < 1 || length > 64 || isNaN(length)) {
                    error = `유효하지 않은 음길이: ${length} (1~64 사이여야 함)`;
                    break;
                }

                let duration = (60 / tempo) * (4 / length);
                if (isDotted || isDottedLength) {
                    duration *= 1.5;
                }

                let frequency = 0;
                if (note !== 'r') {
                    const freqKey = modifier ? `${note}${modifier}` : note;
                    frequency = noteFrequencies[freqKey] || noteFrequencies[note];
                    if (!frequency) {
                        error = `유효하지 않은 음표: ${note}${modifier}`;
                        break;
                    }
                    frequency *= Math.pow(2, currentOctave - 4);
                }
                currentNote = { 
                    frequency, 
                    duration: duration, 
                    volume: currentVolume * volumeScale, 
                    waveform, 
                    isDotted: isDotted || isDottedLength,
                    length: length 
                };
                notes.push(currentNote);
                notePositions.push({ x, noteIdx: notes.length - 1, length: length, isDotted: isDotted || isDottedLength });
                x += 30 * (4 / length) * (isDotted || isDottedLength ? 1.5 : 1);

                lastWasNote = true;
                lastNote = `${note}${modifier}`;

                remainingToken = remainingToken.slice(noteMatch[0].length);
                if (!remainingToken) break;
            }

            i++;
        } else if (token.startsWith('n')) {
            const noteNumber = parseInt(token.slice(1));
            if (noteNumber < 0 || noteNumber > 127 || isNaN(noteNumber)) {
                error = `유효하지 않은 노트 번호: n${token.slice(1)} (0~127 사이여야 함)`;
                break;
            }
            const frequency = 440 * Math.pow(2, (noteNumber - 69) / 12);
            let duration = (60 / tempo) * (4 / currentLength);
            if (isDottedLength) {
                duration *= 1.5;
            }
            currentNote = { 
                frequency, 
                duration, 
                volume: currentVolume * volumeScale, 
                waveform, 
                isDotted: isDottedLength,
                length: currentLength 
            };
            notes.push(currentNote);
            notePositions.push({ x, noteIdx: notes.length - 1, length: currentLength, isDotted: isDottedLength });
            x += 30 * (4 / currentLength) * (isDottedLength ? 1.5 : 1);
            lastWasNote = true;
            lastNote = `n${noteNumber}`;
            i++;
        } else {
            error = `알 수 없는 토큰: ${token} (인덱스 ${i})`;
            break;
        }
    }

    return { notes, notePositions, error };
}

function playMML(mode) {
    const now = Date.now();
    if (now - lastPlayTime < DEBOUNCE_MS) return;
    lastPlayTime = now;

    if (isPlaying) return;
    isPlaying = true;
    isAudioContextClosed = false;

    if (!window.AudioContext && !window.webkitAudioContext) {
        document.getElementById('error').innerHTML = 'Web Audio API를 지원하지 않는 브라우저입니다.';
        document.getElementById('audioUnsupportedModal').style.display = 'flex';
        isPlaying = false;
        isAudioContextClosed = true;
        document.querySelectorAll('.play-btn, .play-melody-btn, .play-chord-btn, .play-track-btn').forEach(btn => {
            btn.removeAttribute('disabled');
        });
        return;
    }

    document.querySelectorAll('.play-btn, .play-melody-btn, .play-chord-btn, .play-track-btn').forEach(btn => {
        btn.setAttribute('disabled', 'true');
    });

    const melodyMML = document.getElementById('melodyOutput').value.replace(/\s/g, '');
    const chordMMLs = [
        document.getElementById('chord1Output').value.replace(/\s/g, ''),
        document.getElementById('chord2Output').value.replace(/\s/g, ''),
        document.getElementById('chord3Output').value.replace(/\s/g, ''),
        document.getElementById('chord4Output').value.replace(/\s/g, ''),
        document.getElementById('chord5Output').value.replace(/\s/g, '')
    ];
    const errorDiv = document.getElementById('error');

    if (!melodyMML.trim() && chordMMLs.every(chord => !chord.trim())) {
        errorDiv.innerHTML = 'MML 코드가 비어 있습니다.';
        isPlaying = false;
        isAudioContextClosed = true;
        document.querySelectorAll('.play-btn, .play-melody-btn, .play-chord-btn, .play-track-btn').forEach(btn => {
            btn.removeAttribute('disabled');
        });
        return;
    }

    if (melodyMML.length > MAX_LENGTH || chordMMLs.some(chord => chord.length > MAX_LENGTH)) {
        errorDiv.innerHTML = 'MML 코드가 최대 길이(1200자)를 초과했습니다.';
        isPlaying = false;
        isAudioContextClosed = true;
        document.querySelectorAll('.play-btn, .play-melody-btn, .play-chord-btn, .play-track-btn').forEach(btn => {
            btn.removeAttribute('disabled');
        });
        return;
    }

    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const melodyResult = parseMML(melodyMML, 1.0, 'sine');
    const chordResults = chordMMLs.map((chordMML, index) => parseMML(chordMML, 0.9, 'triangle'));

    const tracks = [
        { notes: melodyResult.notes, positions: melodyResult.notePositions, name: '멜로디', trackId: 'melody' },
        { notes: chordResults[0].notes, positions: chordResults[0].notePositions, name: '화음1', trackId: 'chord1' },
        { notes: chordResults[1].notes, positions: chordResults[1].notePositions, name: '화음2', trackId: 'chord2' },
        { notes: chordResults[2].notes, positions: chordResults[2].notePositions, name: '화음3', trackId: 'chord3' },
        { notes: chordResults[3].notes, positions: chordResults[3].notePositions, name: '화음4', trackId: 'chord4' },
        { notes: chordResults[4].notes, positions: chordResults[4].notePositions, name: '화음5', trackId: 'chord5' }
    ];

    let validationError = null;
    if (mode === 'both') {
        validationError = tracks.find(track => track.notes.error)?.notes.error;
        if (validationError) {
            const trackName = tracks.find(track => track.notes.error)?.name;
            validationError = `${trackName}: ${validationError}`;
        }
    } else if (mode === 'melody') {
        if (melodyResult.error) {
            validationError = `멜로디: ${melodyResult.error}`;
        }
    } else if (mode === 'chord') {
        validationError = chordResults.find((result, index) => result.error)?.error;
        if (validationError) {
            const trackIndex = chordResults.findIndex(result => result.error);
            validationError = `화음${trackIndex + 1}: ${validationError}`;
        }
    } else {
        const trackIndex = parseInt(mode.replace('chord', '')) - 1;
        if (trackIndex >= 0 && trackIndex < chordResults.length && chordResults[trackIndex].error) {
            validationError = `화음${trackIndex + 1}: ${validationError}`;
        } else if (mode === 'melody' && melodyResult.error) {
            validationError = `멜로디: ${melodyResult.error}`;
        }
    }

    if (validationError) {
        errorDiv.innerHTML = `유효하지 않은 MML 코드: ${validationError}`;
        if (audioContext && !isAudioContextClosed) {
            audioContext.close().catch(err => {
                errorDiv.innerHTML = '오디오 컨텍스트를 닫는 중 오류가 발생했습니다.';
            });
        }
        isPlaying = false;
        isAudioContextClosed = true;
        document.querySelectorAll('.play-btn, .play-melody-btn, .play-chord-btn, .play-track-btn').forEach(btn => {
            btn.removeAttribute('disabled');
        });
        return;
    }

    const activeTracks = getActiveTracks(mode);
    const melodyNotePositions = [];
    let totalTime = 0;

    const trackCount = activeTracks.length;
    const maxGainPerTrack = trackCount > 0 ? 0.8 / trackCount : 0.8;

    activeTracks.forEach((track, trackIndex) => {
        const yOffset = 50 + (40 + 20) * trackIndex;
        const parseResult = parseMML(track.mml, track.color === 'blue' ? 1.0 : 0.9, track.color === 'blue' ? 'sine' : 'triangle');
        const notes = parseResult.notes;
        const positions = parseResult.notePositions;
        let trackTime = audioContext.currentTime;
        let positionIndex = 0;

        notes.forEach((note, noteIdx) => {
            if (note.frequency) {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                oscillator.type = note.waveform;
                oscillator.frequency.setValueAtTime(note.frequency, trackTime);

                const adjustedGain = (note.volume / 15) * maxGainPerTrack;
                const fadeTime = 0.01;
                gainNode.gain.setValueAtTime(0, trackTime);
                gainNode.gain.linearRampToValueAtTime(adjustedGain, trackTime + fadeTime);
                gainNode.gain.setValueAtTime(adjustedGain, trackTime + note.duration * 0.9 - fadeTime);
                gainNode.gain.linearRampToValueAtTime(0, trackTime + note.duration * 0.9);

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                oscillator.start(trackTime);
                oscillator.stop(trackTime + note.duration * 0.9);

                if (track.trackId === 'melody') {
                    const notePositionsForThisNote = positions.filter(pos => pos.noteIdx === noteIdx);
                    const durationPerPosition = note.duration / notePositionsForThisNote.length;
                    let currentTime = trackTime - audioContext.currentTime;

                    notePositionsForThisNote.forEach(pos => {
                        melodyNotePositions.push({
                            startTime: currentTime,
                            endTime: currentTime + durationPerPosition * 0.9,
                            x: pos.x,
                            y: yOffset,
                            color: track.color,
                            length: pos.length,
                            isDotted: pos.isDotted
                        });
                        currentTime += durationPerPosition;
                    });
                }

                positionIndex += positions.filter(pos => pos.noteIdx === noteIdx).length;
            }
            trackTime += note.duration;
        });
        totalTime = Math.max(totalTime, trackTime - audioContext.currentTime);
    });

    melodyNotePositions.sort((a, b) => a.startTime - b.startTime);

    if (melodyNotePositions.length === 0 && mode !== 'chord') {
        errorDiv.innerHTML = '멜로디 트랙에 유효한 음표가 없습니다.';
        audioContext.close();
        isPlaying = false;
        isAudioContextClosed = true;
        document.querySelectorAll('.play-btn, .play-melody-btn, .play-chord-btn, .play-track-btn').forEach(btn => {
            btn.removeAttribute('disabled');
        });
        return;
    }

    const startTime = audioContext.currentTime;
    function renderFrame() {
        if (!isPlaying) return;
        const currentTime = audioContext.currentTime - startTime;
        let currentPlayX = 50;
        let found = false;

        for (let i = 0; i < melodyNotePositions.length; i++) {
            const note = melodyNotePositions[i];
            if (currentTime >= note.startTime && currentTime < note.endTime) {
                currentPlayX = note.x;
                found = true;
                break;
            } else if (currentTime < note.startTime && i > 0) {
                const prevNote = melodyNotePositions[i - 1];
                const timeFraction = (currentTime - prevNote.startTime) / (note.startTime - prevNote.startTime);
                const smoothedX = prevNote.x + (note.x - prevNote.x) * Math.pow(timeFraction, 0.5);
                currentPlayX = smoothedX;
                found = true;
                break;
            }
        }

        if (!found && melodyNotePositions.length > 0 && currentTime >= melodyNotePositions[melodyNotePositions.length - 1].startTime) {
            currentPlayX = melodyNotePositions[melodyNotePositions.length - 1].x;
            errorDiv.innerHTML = '재생바가 멜로디 음표를 벗어났습니다.';
        } else if (!found) {
            errorDiv.innerHTML = '멜로디 음표를 찾을 수 없습니다.';
        }

        renderPreview(currentPlayX);
        if (currentTime < totalTime) {
            playbackInterval = requestAnimationFrame(renderFrame);
        } else {
            stopMML();
        }
    }
    renderFrame();

    setTimeout(() => {
        if (audioContext && !isAudioContextClosed) {
            audioContext.close().catch(err => {
                document.getElementById('error').innerHTML = '오디오 컨텍스트를 닫는 중 오류가 발생했습니다.';
            });
        }
        cancelAnimationFrame(playbackInterval);
        renderPreview(0);
        isPlaying = false;
        isAudioContextClosed = true;
        document.querySelectorAll('.play-btn, .play-melody-btn, .play-chord-btn, .play-track-btn').forEach(btn => {
            btn.removeAttribute('disabled');
        });
        errorDiv.innerHTML = '';
    }, totalTime * 1000);
}

function stopMML() {
    if (audioContext && !isAudioContextClosed) {
        audioContext.close().catch(err => {
            document.getElementById('error').innerHTML = '오디오 컨텍스트를 닫는 중 오류가 발생했습니다.';
        });
        isAudioContextClosed = true;
    }
    cancelAnimationFrame(playbackInterval);
    renderPreview(0);
    isPlaying = false;
    document.querySelectorAll('.play-btn, .play-melody-btn, .play-chord-btn, .play-track-btn').forEach(btn => {
        btn.removeAttribute('disabled');
    });
    document.getElementById('error').innerHTML = '';
}

window.parseMML = parseMML;
window.playMML = playMML;
window.stopMML = stopMML;