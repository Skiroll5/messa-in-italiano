document.addEventListener('DOMContentLoaded', () => {
    // State
    let massData = null;
    let currentRoleFilter = 'all';
    let currentPlayingId = null; // ID of the currently playing section
    let isPlaying = false;
    let filteredSections = [];
    
    // Loop Modes: 'auto' (play next), 'repeat' (loop current), 'stop' (stop at end)
    let loopMode = 'auto'; 
    
    // DOM Elements
    const contentList = document.getElementById('content-list');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIconLight = document.getElementById('theme-icon-light');
    const themeIconDark = document.getElementById('theme-icon-dark');
    const justifyBtn = document.getElementById('justify-toggle');
    const justifyIcon = document.getElementById('justify-icon');
    const htmlElement = document.documentElement;
    
    // Player DOM
    const audioPlayer = document.getElementById('audio-player');
    const playBtn = document.getElementById('play-btn');
    const playIcon = document.getElementById('play-icon');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const loopBtn = document.getElementById('loop-btn');
    const loopIcon = document.getElementById('loop-icon');
    const speedBtn = document.getElementById('speed-btn');
    const speedIcon = document.getElementById('speed-icon');
    const playerTitle = document.getElementById('player-title');
    const playerRole = document.getElementById('player-role');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const timeCurrent = document.getElementById('time-current');
    const timeTotal = document.getElementById('time-total');
    const loopText = document.getElementById('loop-text');

    let isDraggingProgress = false;
    const speeds = [1, 1.25, 1.5, 2];
    let currentSpeedIndex = 0;
    
    // Preferences (default to justified)
    let isJustified = localStorage.getItem('justify') !== 'false';

    // Initialization
    async function init() {
        // Dark mode setup
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            htmlElement.classList.add('dark');
        } else {
            htmlElement.classList.remove('dark');
        }
        updateThemeIcons();

        try {
            const response = await fetch('js/data.json');
            massData = await response.json();
            
            if(!massData || !massData.sections) {
                throw new Error("Invalid data.json structure");
            }
            
            updateJustifyUI();
            applyFilters();
            setupEventListeners();
            
        } catch (error) {
            console.error('Error loading data:', error);
            contentList.innerHTML = `<div class="error-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>Errore nel caricamento dei dati.</p>
                <p class="error-detail">Assicurati di aver configurato il file data.json correttamente.</p>
            </div>`;
        }
    }

    // Theme Handling
    function toggleTheme() {
        if (htmlElement.classList.contains('dark')) {
            htmlElement.classList.remove('dark');
            localStorage.theme = 'light';
        } else {
            htmlElement.classList.add('dark');
            localStorage.theme = 'dark';
        }
        updateThemeIcons();
    }
    
    function updateThemeIcons() {
        const isDark = htmlElement.classList.contains('dark');
        if (themeIconLight) themeIconLight.style.display = isDark ? 'none' : '';
        if (themeIconDark) themeIconDark.style.display = isDark ? '' : 'none';
    }

    // Filters
    function applyFilters() {
        document.querySelectorAll('.filter-pill').forEach(btn => {
            if (btn.dataset.role === currentRoleFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        if (currentRoleFilter === 'all') {
            filteredSections = massData.sections;
        } else {
            filteredSections = massData.sections.filter(s => s.role === currentRoleFilter);
        }
        renderList(true);
    }

    // Role icon mapping
    function getRoleIcon(role) {
        switch(role) {
            case 'priest': return 'fa-solid fa-cross';
            case 'deacon': return 'fa-solid fa-book-bible';
            case 'congregation': return 'fa-solid fa-users';
            default: return 'fa-solid fa-circle';
        }
    }

    // Rendering List
    function renderList(animate) {
        contentList.innerHTML = '';
        
        if(filteredSections.length === 0) {
            contentList.innerHTML = `<div class="empty-state">Nessun brano trovato.</div>`;
            return;
        }
        
        filteredSections.forEach((section, index) => {
            const isActive = currentPlayingId === section.id;
            
            const card = document.createElement('div');
            card.className = `section-card${isActive ? ' active' : ''}${animate ? ' animate-in' : ''}`;
            card.dataset.role = section.role;
            
            const roleName = massData.roles[section.role]['it'] || massData.roles[section.role];
            let textContent = section.text.it || section.text.ar || '...';
            textContent = textContent.replace(/\n/g, '<br>');
            
            // Build playing indicator HTML
            let playingHtml = '';
            if (isActive && isPlaying) {
                playingHtml = `<div class="playing-indicator">
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                </div>`;
            }

            card.innerHTML = `
                <div class="section-card-header">
                    <span class="role-badge" data-role="${section.role}">
                        <i class="${getRoleIcon(section.role)} role-badge-icon"></i>
                        ${roleName}
                    </span>
                    ${playingHtml}
                </div>
                <p class="section-text ${isJustified ? 'justified' : ''}">${textContent}</p>
            `;
            
            card.addEventListener('click', () => {
                if (isActive && isPlaying) {
                    pauseAudio();
                } else if (isActive && !isPlaying) {
                    playAudio();
                } else {
                    playTrackById(section.id);
                }
            });
            
            if (isActive) {
                card.id = 'current-active-item';
            }
            
            contentList.appendChild(card);
        });
        
        if (currentPlayingId) {
            const activeElem = document.getElementById('current-active-item');
            if(activeElem) activeElem.scrollIntoView({behavior: "smooth", block: "center"});
        }
    }

    // Audio Player Logic
    function getSectionById(id) {
        return massData.sections.find(s => s.id === id);
    }
    
    function getIndexInFiltered(id) {
        return filteredSections.findIndex(s => s.id === id);
    }

    function playTrackById(id) {
        const section = getSectionById(id);
        if (!section) return;
        
        currentPlayingId = id;
        
        // Prevent reloading the same audio if already playing (unless requested to restart)
        if (!audioPlayer.src.endsWith(section.audio)) {
            audioPlayer.src = section.audio;
            audioPlayer.playbackRate = speeds[currentSpeedIndex]; // apply speed
            audioPlayer.load();
        }
        
        playAudio();
        updatePlayerUI();
        renderList();
    }

    function playAudio() {
        audioPlayer.play().then(() => {
            isPlaying = true;
            playIcon.classList.remove('fa-play');
            playIcon.classList.add('fa-pause');
            playIcon.style.marginLeft = '0';
            renderList();
        }).catch(e => console.error("Error playing audio", e));
    }

    function pauseAudio() {
        audioPlayer.pause();
        isPlaying = false;
        playIcon.classList.remove('fa-pause');
        playIcon.classList.add('fa-play');
        playIcon.style.marginLeft = '2px';
        renderList();
    }

    function updatePlayerUI() {
        if (!currentPlayingId) return;
        const section = getSectionById(currentPlayingId);
        if(!section) return;
        
        let textContent = section.text.it || section.text.ar || '...';
        playerTitle.textContent = textContent;
        playerRole.textContent = massData.roles[section.role]['it'] || massData.roles[section.role];
    }
    
    function toggleLoopMode() {
        if (loopMode === 'auto') {
            loopMode = 'repeat';
            loopIcon.className = 'fa-solid fa-repeat';
            loopText.textContent = 'Loop 1';
            loopBtn.classList.add('accent');
            loopBtn.classList.remove('muted');
            loopBtn.title = "Repeat Current Track";
        } else if (loopMode === 'repeat') {
            loopMode = 'stop';
            loopIcon.className = 'fa-solid fa-stop';
            loopText.textContent = 'Stop 1';
            loopBtn.classList.remove('accent');
            loopBtn.classList.add('muted');
            loopBtn.title = "Stop at end of track";
        } else {
            loopMode = 'auto';
            loopIcon.className = 'fa-solid fa-list-ul';
            loopText.textContent = 'Auto';
            loopBtn.classList.add('accent');
            loopBtn.classList.remove('muted');
            loopBtn.title = "Auto-Next (filtered list)";
        }
    }

    function toggleSpeed() {
        currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
        const newSpeed = speeds[currentSpeedIndex];
        audioPlayer.playbackRate = newSpeed;
        speedIcon.textContent = newSpeed + 'x';
    }
    
    function toggleJustify() {
        isJustified = !isJustified;
        localStorage.setItem('justify', isJustified);
        updateJustifyUI();
        renderList();
    }
    
    function updateJustifyUI() {
        if (isJustified) {
            justifyIcon.className = 'fa-solid fa-align-justify';
        } else {
            justifyIcon.className = 'fa-solid fa-align-left';
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Event Listeners Setup
    function setupEventListeners() {
        themeToggleBtn.addEventListener('click', toggleTheme);
        justifyBtn.addEventListener('click', toggleJustify);
        
        loopBtn.addEventListener('click', toggleLoopMode);
        speedBtn.addEventListener('click', toggleSpeed);
        
        document.querySelectorAll('.filter-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                if (currentRoleFilter !== target.dataset.role) {
                    currentRoleFilter = target.dataset.role;
                    applyFilters();
                }
            });
        });

        playBtn.addEventListener('click', () => {
            if (!currentPlayingId) {
                if (filteredSections.length > 0) playTrackById(filteredSections[0].id);
            } else {
                if (isPlaying) pauseAudio();
                else playAudio();
            }
        });

        nextBtn.addEventListener('click', () => {
            if (!currentPlayingId) return;
            const idx = getIndexInFiltered(currentPlayingId);
            if (idx !== -1 && idx < filteredSections.length - 1) {
                playTrackById(filteredSections[idx + 1].id);
            }
        });

        prevBtn.addEventListener('click', () => {
            if (!currentPlayingId) return;
            const idx = getIndexInFiltered(currentPlayingId);
            if (idx > 0) {
                playTrackById(filteredSections[idx - 1].id);
            }
        });

        audioPlayer.addEventListener('loadedmetadata', () => {
            if (timeTotal) timeTotal.textContent = formatTime(audioPlayer.duration);
        });

        audioPlayer.addEventListener('timeupdate', () => {
            if (timeCurrent && audioPlayer.duration) {
                timeCurrent.textContent = formatTime(audioPlayer.currentTime);
            }
            if (audioPlayer.duration && !isDraggingProgress) {
                const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
                progressBar.style.width = `${percent}%`;
            }
        });

        audioPlayer.addEventListener('ended', () => {
            if (loopMode === 'repeat') {
                audioPlayer.currentTime = 0;
                audioPlayer.play();
            } else if (loopMode === 'auto') {
                const idx = getIndexInFiltered(currentPlayingId);
                // If it's found in the current filter AND not the last one
                if (idx !== -1 && idx < filteredSections.length - 1) {
                    playTrackById(filteredSections[idx + 1].id);
                } else {
                    // Track not found in filter, or it was the last one -> Stop
                    pauseAudio();
                    progressBar.style.width = '0%';
                }
            } else { // stop mode
                pauseAudio();
                progressBar.style.width = '0%';
            }
        });

        // Swipe/Drag to seek logic
        function updateProgressFromEvent(e) {
            if (audioPlayer.duration) {
                const rect = progressContainer.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                let pos = (clientX - rect.left) / rect.width;
                pos = Math.max(0, Math.min(1, pos)); // clamp between 0 and 1
                progressBar.style.width = `${pos * 100}%`;
                if(timeCurrent) timeCurrent.textContent = formatTime(pos * audioPlayer.duration);
                return pos;
            }
            return 0;
        }

        const startDrag = (e) => {
            if (!audioPlayer.duration) return;
            isDraggingProgress = true;
            progressContainer.classList.add('dragging');
            updateProgressFromEvent(e);
        };

        const onDrag = (e) => {
            if (!isDraggingProgress) return;
            e.preventDefault(); // Prevent scrolling while seeking
            updateProgressFromEvent(e);
        };

        const endDrag = (e) => {
            if (!isDraggingProgress) return;
            isDraggingProgress = false;
            progressContainer.classList.remove('dragging');
            const pos = updateProgressFromEvent(e.changedTouches ? e.changedTouches[0] : e);
            if (audioPlayer.duration) {
                audioPlayer.currentTime = pos * audioPlayer.duration;
            }
        };

        progressContainer.addEventListener('mousedown', startDrag);
        progressContainer.addEventListener('touchstart', startDrag, {passive: false});
        
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag, {passive: false});
        
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
        
        if ('mediaSession' in navigator) {
            audioPlayer.addEventListener('play', updateMediaSession);
            audioPlayer.addEventListener('pause', updateMediaSession);
        }
    }
    
    function updateMediaSession() {
        if (!('mediaSession' in navigator) || !currentPlayingId) return;
        const section = getSectionById(currentPlayingId);
        if(!section) return;
        
        navigator.mediaSession.metadata = new MediaMetadata({
            title: section.text.it || section.text.ar,
            artist: massData.roles[section.role]['it'] || massData.roles[section.role],
            album: "La Santa Messa",
            artwork: [
                { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Coptic_cross.svg/512px-Coptic_cross.svg.png', sizes: '512x512', type: 'image/png' }
            ]
        });
        
        navigator.mediaSession.setActionHandler('play', playAudio);
        navigator.mediaSession.setActionHandler('pause', pauseAudio);
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            const idx = getIndexInFiltered(currentPlayingId);
            if (idx > 0) playTrackById(filteredSections[idx - 1].id);
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            const idx = getIndexInFiltered(currentPlayingId);
            if (idx !== -1 && idx < filteredSections.length - 1) playTrackById(filteredSections[idx + 1].id);
        });
    }

    // Start App
    init();
});
