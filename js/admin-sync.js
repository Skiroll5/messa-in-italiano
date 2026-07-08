import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

env.allowLocalModels = false;

const startBtn = document.getElementById('start-btn');
const downloadBtn = document.getElementById('download-btn');
const logBox = document.getElementById('log-box');

let massData = null;

function log(msg, type = 'info') {
    const div = document.createElement('div');
    div.className = 'progress-item';
    if(type === 'success') div.classList.add('success');
    if(type === 'error') div.classList.add('error');
    div.textContent = msg;
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
}

// Convert MP3 path to Float32Array resampled to 16kHz
async function getAudioData(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Audio non trovato: " + url);
    const arrayBuffer = await response.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const offlineContext = new OfflineAudioContext(1, audioBuffer.duration * 16000, 16000);
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);
    
    const resampled = await offlineContext.startRendering();
    return resampled.getChannelData(0);
}

function alignWords(targetText, whisperWords) {
    // 1. Tokenize original text
    const targetWords = targetText.split(/\s+/).filter(w => w.length > 0);
    if (whisperWords.length === 0) {
        return targetWords.map((w, i) => ({ word: w, start: i * 0.5, end: (i + 1) * 0.5 }));
    }

    const n = targetWords.length;
    const m = whisperWords.length;
    const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
    
    for (let i = 0; i <= n; i++) dp[i][0] = i;
    for (let j = 0; j <= m; j++) dp[0][j] = j;
    
    function similarity(w1, w2) {
        w1 = w1.toLowerCase().replace(/[^a-z0-9àèéìòù]/g, '');
        w2 = w2.toLowerCase().replace(/[^a-z0-9àèéìòù]/g, '');
        if (w1 === w2) return 0;
        if (w1.includes(w2) || w2.includes(w1)) return 0.4;
        
        const len1 = w1.length;
        const len2 = w2.length;
        if (len1 === 0 || len2 === 0) return 1;
        
        const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
        for(let i=0; i<=len1; i++) matrix[i][0] = i;
        for(let j=0; j<=len2; j++) matrix[0][j] = j;
        for(let i=1; i<=len1; i++) {
            for(let j=1; j<=len2; j++) {
                const cost = w1[i-1] === w2[j-1] ? 0 : 1;
                matrix[i][j] = Math.min(matrix[i-1][j] + 1, matrix[i][j-1] + 1, matrix[i-1][j-1] + cost);
            }
        }
        return matrix[len1][len2] / Math.max(len1, len2);
    }

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const cost = similarity(targetWords[i-1], whisperWords[j-1].word);
            dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + cost);
        }
    }
    
    let i = n, j = m;
    const aligned = Array(n).fill(null);
    
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0) {
            const cost = similarity(targetWords[i-1], whisperWords[j-1].word);
            if (dp[i][j] === dp[i-1][j-1] + cost) {
                aligned[i-1] = whisperWords[j-1];
                i--; j--;
                continue;
            }
        }
        if (i > 0 && dp[i][j] === dp[i-1][j] + 1) {
            aligned[i-1] = null;
            i--;
            continue;
        }
        if (j > 0 && dp[i][j] === dp[i][j-1] + 1) {
            j--;
            continue;
        }
        if (i > 0) { aligned[i-1] = null; i--; }
        else { j--; }
    }
    
    const result = targetWords.map((tw, k) => ({
        word: tw,
        start: aligned[k] ? aligned[k].start : null,
        end: aligned[k] ? aligned[k].end : null
    }));
    
    // Interpolate missing timestamps
    for (let k = 0; k < n; k++) {
        if (result[k].start === null) {
            let prev = 0;
            for(let p = k-1; p >= 0; p--) if(result[p].end !== null) { prev = result[p].end; break; }
            
            let next = null;
            let nextIdx = k;
            for(let nx = k+1; nx < n; nx++) if(result[nx].start !== null) { next = result[nx].start; nextIdx = nx; break; }
            
            if (next === null) {
                result[k].start = prev;
                result[k].end = prev + 0.5;
            } else {
                const gap = next - prev;
                const steps = nextIdx - k + 1;
                const stepSize = gap / steps;
                
                let cur = prev;
                for(let idx = k; idx < nextIdx; idx++) {
                    result[idx].start = Number(cur.toFixed(2));
                    cur += stepSize;
                    result[idx].end = Number(cur.toFixed(2));
                }
                k = nextIdx - 1;
            }
        }
    }
    
    return result;
}

startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    log('Caricamento data.json...');
    
    try {
        const res = await fetch('js/data.json');
        massData = await res.json();
    } catch(e) {
        log('Errore caricamento data.json: ' + e.message, 'error');
        return;
    }
    
    log('Caricamento modello IA Whisper (potrebbe richiedere alcuni minuti al primo avvio)...');
    let transcriber;
    try {
        // Upgrade to small for better Italian accuracy
        transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small');
        log('Modello caricato con successo.', 'success');
    } catch(e) {
        log('Errore caricamento modello: ' + e.message, 'error');
        return;
    }
    
    for(let i = 0; i < massData.sections.length; i++) {
        const section = massData.sections[i];
        if(!section.audio || !section.text || !section.text.it) continue;
        
        if(section.words_it) {
             log(`[${i+1}/${massData.sections.length}] Sezione saltata (già elaborata): ${section.id}`);
             continue;
        }
        
        log(`[${i+1}/${massData.sections.length}] Elaborazione: ${section.audio.split('/').pop()}`);
        
        try {
            const audioData = await getAudioData(section.audio);
            
            const result = await transcriber(audioData, {
                language: 'it',
                task: 'transcribe',
                return_timestamps: 'word'
            });
            
            if(result.chunks) {
                const aiWords = result.chunks.map(chunk => ({
                    word: chunk.text.trim(),
                    start: chunk.timestamp[0],
                    end: chunk.timestamp[1] || chunk.timestamp[0] + 0.5
                }));
                
                // Align AI output to the original text
                const finalWords = alignWords(section.text.it, aiWords);
                
                section.words_it = finalWords;
                log(`Successo! Allineate ${finalWords.length} parole originali.`, 'success');
            } else {
                log('Nessun timestamp trovato.', 'error');
            }
        } catch(e) {
            log(`Errore sezione ${section.id}: ` + e.message, 'error');
        }
    }
    
    log('Sincronizzazione completata!', 'success');
    downloadBtn.style.display = 'inline-block';
});

downloadBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(massData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "data_synced.json");
    dlAnchorElem.click();
});
