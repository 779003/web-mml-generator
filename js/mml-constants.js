/**
 * 상수와 초기 설정 관
 */
const MAX_LENGTH = 1200;
const MAX_HISTORY_SIZE = 100;

let currentTrack = 'melody';
let currentLength = 4;
let isDottedLength = false;
let melodyOctave = 4;
let chord1Octave = 3;
let chord2Octave = 3;
let chord3Octave = 3;
let chord4Octave = 3;
let chord5Octave = 3;
let audioContext = null;
let isPlaying = false;
let isAudioContextClosed = true;
let isKeySoundEnabled = true; // 건반 소리 on/off 상태
let melodyHistory = ['t120l4v10'];
let chord1History = ['t120l4v8'];
let chord2History = ['t120l4v8'];
let chord3History = ['t120l4v8'];
let chord4History = ['t120l4v8'];
let chord5History = ['t120l4v8'];
let melodyRedoHistory = [];
let chord1RedoHistory = [];
let chord2RedoHistory = [];
let chord3RedoHistory = [];
let chord4RedoHistory = [];
let chord5RedoHistory = [];
let lastNoteX = null;
let playbackInterval = null;
let lastAddedLength = null;
let lastAddedNote = null;

const trackColors = {
    melody: { light: 'blue', dark: '#60a5fa' },
    chord1: { light: 'orange', dark: '#f97316' },
    chord2: { light: 'purple', dark: '#a855f7' },
    chord3: { light: 'pink', dark: '#ec4899' },
    chord4: { light: 'teal', dark: '#14b8a6' },
    chord5: { light: 'brown', dark: '#8b4513' }
};

const notePositionsCache = {
    melody: [],
    chord1: [],
    chord2: [],
    chord3: [],
    chord4: [],
    chord5: []
};

const notes = [
    { label: '도', value: 'c', isWhite: true },
    { label: '도#', value: 'c#', isWhite: false },
    { label: '레', value: 'd', isWhite: true },
    { label: '레#', value: 'd#', isWhite: false },
    { label: '미', value: 'e', isWhite: true },
    { label: '파', value: 'f', isWhite: true },
    { label: '파#', value: 'f#', isWhite: false },
    { label: '솔', value: 'g', isWhite: true },
    { label: '솔#', value: 'g#', isWhite: false },
    { label: '라', value: 'a', isWhite: true },
    { label: '라#', value: 'a#', isWhite: false },
    { label: '시', value: 'b', isWhite: true }
];

// 피아노 키보드 생성
const pianoKeysLow = document.getElementById('pianoKeysLow');
for (let octave = 2; octave >= 0; octave--) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'piano-row';
    rowDiv.innerHTML = `<span>옥타브 ${octave}</span>`;
    notes.forEach(note => {
        const btn = document.createElement('button');
        btn.className = `note-btn ${note.isWhite ? 'white' : 'sharp-btn'}`;
        btn.textContent = note.label;
        btn.onclick = () => addNote(note.value, octave);
        rowDiv.appendChild(btn);
    });
    pianoKeysLow.appendChild(rowDiv);
}

const pianoKeysMid = document.getElementById('pianoKeysMid');
for (let octave = 5; octave >= 3; octave--) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'piano-row';
    rowDiv.innerHTML = `<span>옥타브 ${octave}</span>`;
    notes.forEach(note => {
        const btn = document.createElement('button');
        btn.className = `note-btn ${note.isWhite ? 'white' : 'sharp-btn'}`;
        btn.textContent = note.label;
        btn.onclick = () => addNote(note.value, octave);
        rowDiv.appendChild(btn);
    });
    pianoKeysMid.appendChild(rowDiv);
}

const pianoKeysHigh = document.getElementById('pianoKeysHigh');
for (let octave = 8; octave >= 6; octave--) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'piano-row';
    rowDiv.innerHTML = `<span>옥타브 ${octave}</span>`;
    notes.forEach(note => {
        const btn = document.createElement('button');
        btn.className = `note-btn ${note.isWhite ? 'white' : 'sharp-btn'}`;
        btn.textContent = note.label;
        btn.onclick = () => addNote(note.value, octave);
        rowDiv.appendChild(btn);
    });
    pianoKeysHigh.appendChild(rowDiv);
}

const outputs = ['melodyOutput', 'chord1Output', 'chord2Output', 'chord3Output', 'chord4Output', 'chord5Output'];