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
    const highlightBtn = document.getElementById('highlight-toggle');
    const highlightIcon = document.getElementById('highlight-icon');
    const justifyBtn = document.getElementById('justify-toggle');
    const justifyIcon = document.getElementById('justify-icon');
    
    const expThemeToggleBtn = document.getElementById('exp-theme-toggle');
    const expThemeIconLight = document.getElementById('exp-theme-icon-light');
    const expThemeIconDark = document.getElementById('exp-theme-icon-dark');
    const expHighlightBtn = document.getElementById('exp-highlight-toggle');
    const expHighlightIcon = document.getElementById('exp-highlight-icon');
    const expJustifyBtn = document.getElementById('exp-justify-toggle');
    const expJustifyIcon = document.getElementById('exp-justify-icon');
    
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

    // Expanded Player DOM
    const miniPlayerInfo = document.getElementById('mini-player-info');
    const expandedPlayer = document.getElementById('expanded-player');
    const minimizeBtn = document.getElementById('minimize-btn');
    const expandedRole = document.getElementById('expanded-player-role');
    const expandedText = document.getElementById('expanded-player-text');
    const expandedProgressContainer = document.getElementById('expanded-progress-area');
    const expandedProgressBar = document.getElementById('expanded-progress-bar');
    const expandedTimeCurrent = document.getElementById('expanded-time-current');
    const expandedTimeTotal = document.getElementById('expanded-time-total');
    const expContent = document.querySelector('.expanded-content-area');
    
    const expPlayBtn = document.getElementById('expanded-play-btn');
    const expPlayIcon = document.getElementById('expanded-play-icon');
    const expPrevBtn = document.getElementById('expanded-prev-btn');
    const expNextBtn = document.getElementById('expanded-next-btn');
    const seekBackBtn = document.getElementById('seek-back-btn');
    const seekFwdBtn = document.getElementById('seek-fwd-btn');
    const expLoopBtn = document.getElementById('expanded-loop-btn');
    const expLoopIcon = document.getElementById('expanded-loop-icon');
    const expLoopText = document.getElementById('expanded-loop-text');
    const expSpeedBtn = document.getElementById('expanded-speed-btn');
    const expSpeedIcon = document.getElementById('expanded-speed-icon');

    let isDraggingProgress = false;
    let currentWordsList = [];
    let currentWordElements = [];
    const speeds = [1, 1.25, 1.5, 2];
    let currentSpeedIndex = 0;
    
    let userForcedScroll = false;
    let isAutoScrolling = false;
    let autoScrollTimeout = null;
    
    // Preferences (default to justified)
    let isJustified = localStorage.getItem('justify') !== 'false';
    let isHighlightEnabled = localStorage.getItem('highlight') !== 'false';

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
            
            updateHighlightUI();
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
        if (expThemeIconLight) expThemeIconLight.style.display = isDark ? 'none' : '';
        if (expThemeIconDark) expThemeIconDark.style.display = isDark ? '' : 'none';
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
                    if (expandedPlayer) expandedPlayer.classList.add('active');
                } else {
                    playTrackById(section.id);
                    if (expandedPlayer) expandedPlayer.classList.add('active');
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
            audioPlayer.defaultPlaybackRate = speeds[currentSpeedIndex];
            audioPlayer.playbackRate = speeds[currentSpeedIndex]; // apply speed
            audioPlayer.load();
        }
        
        playAudio();
        updatePlayerUI();
        renderList();
    }

    function playAudio() {
        audioPlayer.playbackRate = speeds[currentSpeedIndex];
        audioPlayer.play().then(() => {
            isPlaying = true;
            playIcon.classList.remove('fa-play');
            playIcon.classList.add('fa-pause');
            playIcon.style.marginLeft = '0';
            expPlayIcon.classList.remove('fa-play');
            expPlayIcon.classList.add('fa-pause');
            expPlayIcon.style.marginLeft = '0';
            renderList();
        }).catch(e => console.error("Error playing audio", e));
    }

    function pauseAudio() {
        audioPlayer.pause();
        isPlaying = false;
        playIcon.classList.remove('fa-pause');
        playIcon.classList.add('fa-play');
        playIcon.style.marginLeft = '2px';
        expPlayIcon.classList.remove('fa-pause');
        expPlayIcon.classList.add('fa-play');
        expPlayIcon.style.marginLeft = '2px';
        renderList();
    }

    function updatePlayerUI() {
        if (!currentPlayingId) return;
        const section = getSectionById(currentPlayingId);
        if(!section) return;
        
        let textContent = section.text.it || section.text.ar || '...';
        playerTitle.textContent = textContent;
        
        if (section.words_it && section.words_it.length > 0) {
            expandedText.innerHTML = '';
            section.words_it.forEach((wordObj, i) => {
                const span = document.createElement('span');
                span.className = 'word';
                span.textContent = wordObj.word;
                span.dataset.start = wordObj.start;
                span.dataset.end = wordObj.end;
                expandedText.appendChild(span);
                expandedText.appendChild(document.createTextNode(' '));
            });
            currentWordsList = section.words_it;
            currentWordElements = Array.from(expandedText.querySelectorAll('.word'));
        } else {
            expandedText.innerHTML = textContent.replace(/\n/g, '<br>');
            currentWordsList = [];
            currentWordElements = [];
        }
        
        userForcedScroll = false;
        isAutoScrolling = false;
        
        let roleName = massData.roles[section.role]['it'] || massData.roles[section.role];
        playerRole.textContent = roleName;
        expandedRole.textContent = roleName;
    }
    
    function toggleLoopMode() {
        if (loopMode === 'auto') {
            loopMode = 'repeat';
            loopIcon.className = 'fa-solid fa-repeat';
            loopText.textContent = 'Loop 1';
            loopBtn.classList.add('accent');
            loopBtn.classList.remove('muted');
            expLoopIcon.className = 'fa-solid fa-repeat';
            expLoopText.textContent = 'Loop 1';
            expLoopBtn.classList.add('accent');
            expLoopBtn.classList.remove('muted');
            loopBtn.title = "Repeat Current Track";
        } else if (loopMode === 'repeat') {
            loopMode = 'stop';
            loopIcon.className = 'fa-solid fa-stop';
            loopText.textContent = 'Stop 1';
            loopBtn.classList.remove('accent');
            loopBtn.classList.add('muted');
            expLoopIcon.className = 'fa-solid fa-stop';
            expLoopText.textContent = 'Stop 1';
            expLoopBtn.classList.remove('accent');
            expLoopBtn.classList.add('muted');
            loopBtn.title = "Stop at end of track";
        } else {
            loopMode = 'auto';
            loopIcon.className = 'fa-solid fa-list-ul';
            loopText.textContent = 'Auto';
            loopBtn.classList.add('accent');
            loopBtn.classList.remove('muted');
            expLoopIcon.className = 'fa-solid fa-list-ul';
            expLoopText.textContent = 'Auto';
            expLoopBtn.classList.add('accent');
            expLoopBtn.classList.remove('muted');
            loopBtn.title = "Auto-Next (filtered list)";
        }
    }

    function toggleSpeed() {
        currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
        const newSpeed = speeds[currentSpeedIndex];
        audioPlayer.defaultPlaybackRate = newSpeed;
        audioPlayer.playbackRate = newSpeed;
        speedIcon.textContent = newSpeed + 'x';
        expSpeedIcon.textContent = newSpeed + 'x';
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
            if (expJustifyIcon) expJustifyIcon.className = 'fa-solid fa-align-justify';
        } else {
            justifyIcon.className = 'fa-solid fa-align-left';
            if (expJustifyIcon) expJustifyIcon.className = 'fa-solid fa-align-left';
        }
    }
    
    function toggleHighlight() {
        isHighlightEnabled = !isHighlightEnabled;
        localStorage.setItem('highlight', isHighlightEnabled);
        updateHighlightUI();
    }
    
    function updateHighlightUI() {
        if (isHighlightEnabled) {
            htmlElement.classList.remove('no-highlight');
            if (highlightIcon) highlightIcon.style.opacity = '1';
            if (expHighlightIcon) expHighlightIcon.style.opacity = '1';
        } else {
            htmlElement.classList.add('no-highlight');
            if (highlightIcon) highlightIcon.style.opacity = '0.4';
            if (expHighlightIcon) expHighlightIcon.style.opacity = '0.4';
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
        if (expContent) {
            expContent.addEventListener('scroll', () => {
                if (!isAutoScrolling) {
                    userForcedScroll = true;
                }
            }, {passive: true});
            
            expContent.addEventListener('scrollend', () => {
                if (isAutoScrolling) {
                    isAutoScrolling = false;
                    clearTimeout(autoScrollTimeout);
                }
            }, {passive: true});
        }

        themeToggleBtn.addEventListener('click', toggleTheme);
        if (highlightBtn) highlightBtn.addEventListener('click', toggleHighlight);
        justifyBtn.addEventListener('click', toggleJustify);
        
        if (expThemeToggleBtn) expThemeToggleBtn.addEventListener('click', toggleTheme);
        if (expHighlightBtn) expHighlightBtn.addEventListener('click', toggleHighlight);
        if (expJustifyBtn) expJustifyBtn.addEventListener('click', toggleJustify);
        
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
            if (expandedTimeTotal) expandedTimeTotal.textContent = formatTime(audioPlayer.duration);
        });

        audioPlayer.addEventListener('timeupdate', () => {
            const currentTime = audioPlayer.currentTime;
            if (timeCurrent && audioPlayer.duration) {
                const curTimeStr = formatTime(currentTime);
                timeCurrent.textContent = curTimeStr;
                expandedTimeCurrent.textContent = curTimeStr;
            }
            if (audioPlayer.duration && !isDraggingProgress) {
                const percent = (currentTime / audioPlayer.duration) * 100;
                progressBar.style.width = `${percent}%`;
                expandedProgressBar.style.width = `${percent}%`;
            }
            
            // Highlight current word
            if (currentWordsList.length > 0) {
                let activeIdx = -1;
                for (let i = 0; i < currentWordsList.length; i++) {
                    const w = currentWordsList[i];
                    const isLast = (i === currentWordsList.length - 1);
                    if (currentTime >= w.start && (currentTime < w.end || (isLast && currentTime <= w.end))) {
                        activeIdx = i;
                        break;
                    }
                }
                currentWordElements.forEach((el, i) => {
                    if (i === activeIdx) el.classList.add('highlight');
                    else el.classList.remove('highlight');
                });
                
                // Auto-scroll
                if (activeIdx !== -1 && !isClosingPlayer && !isDraggingPlayer) {
                    const activeEl = currentWordElements[activeIdx];
                    const container = expContent;
                    const elOffset = activeEl.offsetTop - container.offsetTop;
                    
                    const isOutOfView = elOffset < container.scrollTop || elOffset > container.scrollTop + container.clientHeight - 60;
                    
                    if (isOutOfView) {
                        if (!userForcedScroll) {
                            isAutoScrolling = true;
                            clearTimeout(autoScrollTimeout);
                            container.scrollTo({ top: elOffset - container.clientHeight / 2, behavior: 'smooth' });
                            autoScrollTimeout = setTimeout(() => {
                                isAutoScrolling = false;
                            }, 1000);
                        }
                    } else {
                        if (userForcedScroll) {
                            userForcedScroll = false;
                        }
                    }
                }
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
                    expandedProgressBar.style.width = '0%';
                }
            } else { // stop mode
                pauseAudio();
                progressBar.style.width = '0%';
                expandedProgressBar.style.width = '0%';
            }
        });

        // Swipe/Drag to seek logic
        function updateProgressFromEvent(e, container, bar, timeEl) {
            if (audioPlayer.duration) {
                const rect = container.getBoundingClientRect();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                let pos = (clientX - rect.left) / rect.width;
                pos = Math.max(0, Math.min(1, pos)); // clamp between 0 and 1
                bar.style.width = `${pos * 100}%`;
                if(timeEl) timeEl.textContent = formatTime(pos * audioPlayer.duration);
                return pos;
            }
            return 0;
        }

        const startDrag = (e) => {
            if (!audioPlayer.duration) return;
            isDraggingProgress = true;
            const container = e.currentTarget;
            container.classList.add('dragging');
            const bar = container.id === 'expanded-progress-area' ? expandedProgressBar : progressBar;
            const timeEl = container.id === 'expanded-progress-area' ? expandedTimeCurrent : timeCurrent;
            updateProgressFromEvent(e, container, bar, timeEl);
        };

        const onDrag = (e) => {
            if (!isDraggingProgress) return;
            e.preventDefault(); // Prevent scrolling while seeking
            const activeContainer = progressContainer.classList.contains('dragging') ? progressContainer : expandedProgressContainer;
            const activeBar = activeContainer.id === 'expanded-progress-area' ? expandedProgressBar : progressBar;
            const activeTimeEl = activeContainer.id === 'expanded-progress-area' ? expandedTimeCurrent : timeCurrent;
            updateProgressFromEvent(e, activeContainer, activeBar, activeTimeEl);
        };

        const endDrag = (e) => {
            if (!isDraggingProgress) return;
            isDraggingProgress = false;
            let activeContainer = progressContainer;
            let activeBar = progressBar;
            let activeTimeEl = timeCurrent;
            if (expandedProgressContainer.classList.contains('dragging')) {
                activeContainer = expandedProgressContainer;
                activeBar = expandedProgressBar;
                activeTimeEl = expandedTimeCurrent;
            }
            activeContainer.classList.remove('dragging');
            const pos = updateProgressFromEvent(e.changedTouches ? e.changedTouches[0] : e, activeContainer, activeBar, activeTimeEl);
            if (audioPlayer.duration) {
                audioPlayer.currentTime = pos * audioPlayer.duration;
            }
        };

        progressContainer.addEventListener('mousedown', startDrag);
        progressContainer.addEventListener('touchstart', startDrag, {passive: false});
        expandedProgressContainer.addEventListener('mousedown', startDrag);
        expandedProgressContainer.addEventListener('touchstart', startDrag, {passive: false});
        
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag, {passive: false});
        
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
        
        // Expanded player opening/closing
        miniPlayerInfo.addEventListener('click', () => {
            if(currentPlayingId) {
                expandedPlayer.classList.add('active');
            }
        });
        
        minimizeBtn.addEventListener('click', () => {
            expandedPlayer.classList.remove('active');
        });

        // Swipe to open/close expanded player interactively
        let swipeStartY = 0;
        let swipeStartTime = 0;
        let isDraggingPlayer = false;
        let isClosingPlayer = false;
        const playerBar = document.querySelector('.player-bar');
        
        playerBar.addEventListener('touchstart', (e) => {
            if (!currentPlayingId) return;
            if (e.target.closest('.progress-area') || e.target.closest('.player-controls')) return;
            swipeStartY = e.touches[0].clientY;
            swipeStartTime = Date.now();
            isDraggingPlayer = true;
            expandedPlayer.style.transition = 'none';
        }, {passive: true});
        
        playerBar.addEventListener('touchmove', (e) => {
            if (!currentPlayingId || !isDraggingPlayer) return;
            const deltaY = e.touches[0].clientY - swipeStartY;
            if (deltaY < 0) { // Swiping up
                if(e.cancelable) e.preventDefault(); // Stop page scroll
                expandedPlayer.style.transform = `translateY(calc(100% + ${deltaY}px))`;
            }
        }, {passive: false});
        
        playerBar.addEventListener('touchend', (e) => {
            if (!currentPlayingId || !isDraggingPlayer) return;
            isDraggingPlayer = false;
            expandedPlayer.style.transition = '';
            expandedPlayer.style.transform = '';
            
            const swipeEndY = e.changedTouches[0].clientY;
            const swipeTime = Date.now() - swipeStartTime;
            const deltaY = swipeEndY - swipeStartY;
            
            if (deltaY < -40 || (deltaY < -10 && swipeTime < 300)) {
                expandedPlayer.classList.add('active');
            }
            swipeStartY = 0;
        }, {passive: true});
        
        expandedPlayer.addEventListener('touchstart', (e) => {
            if (e.target.closest('.expanded-main-controls') || e.target.closest('.expanded-secondary-controls') || e.target.closest('.progress-area') || e.target.closest('.minimize-btn')) return;
            swipeStartY = e.touches[0].clientY;
            swipeStartTime = Date.now();
            isClosingPlayer = true;
        }, {passive: true});
        
        expandedPlayer.addEventListener('touchmove', (e) => {
            if (!isClosingPlayer) return;
            
            if (e.target.closest('.expanded-content-area')) {
                if (expContent.scrollTop > 0) {
                    isClosingPlayer = false;
                    expandedPlayer.style.transition = '';
                    expandedPlayer.style.transform = '';
                    return;
                }
            }
            
            const deltaY = e.touches[0].clientY - swipeStartY;
            if (deltaY > 0) { // Swiping down
                if(e.cancelable) e.preventDefault();
                expandedPlayer.style.transition = 'none';
                expandedPlayer.style.transform = `translateY(${deltaY}px)`;
            }
        }, {passive: false});
        
        expandedPlayer.addEventListener('touchend', (e) => {
            if (!isClosingPlayer) return;
            isClosingPlayer = false;
            expandedPlayer.style.transition = '';
            expandedPlayer.style.transform = '';
            
            const swipeEndY = e.changedTouches[0].clientY;
            const swipeTime = Date.now() - swipeStartTime;
            const deltaY = swipeEndY - swipeStartY;
            
            if (deltaY > 50 || (deltaY > 20 && swipeTime < 300)) {
                expandedPlayer.classList.remove('active');
            }
            swipeStartY = 0;
        }, {passive: true});
        
        // +/- 5s Seeking
        function seek(seconds) {
            if (audioPlayer.duration) {
                let newTime = audioPlayer.currentTime + seconds;
                audioPlayer.currentTime = Math.max(0, Math.min(newTime, audioPlayer.duration));
            }
        }
        
        seekBackBtn.addEventListener('click', () => seek(-5));
        seekFwdBtn.addEventListener('click', () => seek(5));
        
        // Word click seeking
        expandedText.addEventListener('click', (e) => {
            const wordEl = e.target.closest('.word');
            if (wordEl && wordEl.dataset.start) {
                if (audioPlayer.duration) {
                    audioPlayer.currentTime = parseFloat(wordEl.dataset.start);
                    if (!isPlaying) playAudio();
                }
            }
        });
        
        // Expanded player controls bindings
        expPlayBtn.addEventListener('click', () => playBtn.click());
        expNextBtn.addEventListener('click', () => nextBtn.click());
        expPrevBtn.addEventListener('click', () => prevBtn.click());
        expLoopBtn.addEventListener('click', () => loopBtn.click());
        expSpeedBtn.addEventListener('click', () => speedBtn.click());
        
        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.code === 'Space') {
                e.preventDefault(); // Prevent page scroll
                playBtn.click();
            } else if (e.shiftKey && (e.code === 'KeyN' || e.key === 'N')) {
                e.preventDefault();
                nextBtn.click();
            } else if (e.shiftKey && (e.code === 'KeyP' || e.key === 'P')) {
                e.preventDefault();
                prevBtn.click();
            }
        });
        
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
