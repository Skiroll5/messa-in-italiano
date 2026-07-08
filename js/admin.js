document.addEventListener('DOMContentLoaded', () => {
    let libraryData = []; // All available items
    let sequenceData = { roles: {}, sections: [] };
    
    // Track the last added item ID per role to highlight it
    let lastAdded = { priest: null, deacon: null, congregation: null };

    let currentSearch = '';

    const listPriest = document.getElementById('library-priest');
    const listDeacon = document.getElementById('library-deacon');
    const listCongregation = document.getElementById('library-congregation');
    const sequenceListEl = document.getElementById('sequence-list');
    
    const countPriest = document.getElementById('count-priest');
    const countDeacon = document.getElementById('count-deacon');
    const countCongregation = document.getElementById('count-congregation');
    const countSequence = document.getElementById('count-sequence');

    const searchInput = document.getElementById('search-input');
    const downloadBtn = document.getElementById('download-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const statsCounter = document.getElementById('stats-counter');

    async function init() {
        try {
            const libRes = await fetch('js/library.json');
            const fullLibrary = await libRes.json();
            sequenceData.roles = fullLibrary.roles;
            
            try {
                const dataRes = await fetch('js/data.json');
                const existingData = await dataRes.json();
                if (existingData.sections && existingData.sections.length > 0) {
                    sequenceData.sections = existingData.sections;
                }
            } catch (e) {
                console.log("No existing sequence found.");
            }

            libraryData = [...fullLibrary.sections];
            
            // Sort by file number
            libraryData.sort((a, b) => {
                const fileA = a.audio.split('/').pop();
                const fileB = b.audio.split('/').pop();
                const numA = parseInt(fileA.match(/^\d+/)?.[0] || '999', 10);
                const numB = parseInt(fileB.match(/^\d+/)?.[0] || '999', 10);
                return numA - numB;
            });
            
            renderAll();
            setupSortable();
            setupEventListeners();
        } catch (error) {
            console.error('Failed to load data:', error);
            listPriest.innerHTML = `<div class="text-red-500">Failed to load library.json.</div>`;
        }
    }

    function createLibraryItemHtml(section, fileName) {
        return `
            <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2 overflow-hidden">
                    <div class="drag-handle text-gray-400 hover:text-gray-600 cursor-grab shrink-0">
                        <i class="fa-solid fa-grip-vertical"></i>
                    </div>
                    <span class="text-xs font-mono text-gray-700 truncate" title="${fileName}">${fileName}</span>
                </div>
                <button class="append-btn text-gray-400 hover:text-blue-500 p-1 transition shrink-0" title="Add to end of sequence">
                    <i class="fa-solid fa-plus-circle"></i>
                </button>
            </div>
            <audio controls class="w-full h-6" preload="none">
                <source src="${section.audio}" type="audio/mpeg">
            </audio>
        `;
    }

    function renderLibrary() {
        listPriest.innerHTML = '';
        listDeacon.innerHTML = '';
        listCongregation.innerHTML = '';
        
        let cP = 0, cD = 0, cC = 0;

        libraryData.forEach(section => {
            const searchLower = currentSearch.toLowerCase();
            const fileName = section.audio.split('/').pop();
            
            if (currentSearch && !section.audio.toLowerCase().includes(searchLower)) return;

            // Check if this item is the last added for its role
            const isLastAdded = section.id === lastAdded[section.role];
            const highlightClass = isLastAdded ? 'border-coptic-gold ring-2 ring-coptic-gold bg-yellow-50 shadow-md' : 'border-gray-200 bg-white shadow-sm';

            const el = document.createElement('li');
            el.className = `rounded ${highlightClass} border p-2 flex flex-col relative group library-item transition-all duration-300`;
            el.dataset.id = section.id;
            el.innerHTML = createLibraryItemHtml(section, fileName);
            
            const appendBtn = el.querySelector('.append-btn');
            appendBtn.addEventListener('click', () => {
                const clonedItem = JSON.parse(JSON.stringify(section));
                clonedItem.id = clonedItem.id + '_' + Date.now() + Math.floor(Math.random() * 1000);
                
                // Track last added
                lastAdded[section.role] = section.id;
                
                // Auto-inherit transcription
                const existingItem = sequenceData.sections.find(s => s.audio === section.audio && s.text.it.trim() !== '');
                if (existingItem) {
                    clonedItem.text.it = existingItem.text.it;
                }

                sequenceData.sections.push(clonedItem);
                renderAll();
                setTimeout(() => {
                    const scrollContainer = sequenceListEl.parentElement;
                    scrollContainer.scrollTop = scrollContainer.scrollHeight;
                }, 50);
            });

            if (section.role === 'priest') { listPriest.appendChild(el); cP++; }
            else if (section.role === 'deacon') { listDeacon.appendChild(el); cD++; }
            else if (section.role === 'congregation') { listCongregation.appendChild(el); cC++; }
        });
        
        countPriest.textContent = cP;
        countDeacon.textContent = cD;
        countCongregation.textContent = cC;
    }

    function renderSequence() {
        sequenceListEl.innerHTML = '';
        
        if (sequenceData.sections.length === 0) {
            sequenceListEl.innerHTML = `
                <div class="text-center py-10 text-gray-400 empty-placeholder">
                    <i class="fa-solid fa-box-open text-2xl mb-2"></i>
                    <p class="text-xs">Drag items here.</p>
                </div>
            `;
        }

        sequenceData.sections.forEach((section, index) => {
            const fileName = section.audio.split('/').pop();
            const el = document.createElement('li');
            
            // Apply a slight tint based on role
            let tintClass = '';
            if(section.role === 'priest') tintClass = 'border-purple-200';
            else if(section.role === 'deacon') tintClass = 'border-blue-200';
            else if(section.role === 'congregation') tintClass = 'border-green-200';
            
            el.className = `bg-white rounded-lg shadow-sm border-2 ${tintClass} p-3 flex flex-col gap-2 relative sequence-item`;
            el.dataset.id = section.id;

            el.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 overflow-hidden">
                        <div class="drag-handle text-gray-400 hover:text-gray-600 cursor-grab shrink-0">
                            <i class="fa-solid fa-grip-vertical"></i>
                        </div>
                        <div class="bg-gray-800 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">${index + 1}</div>
                        <span class="text-[11px] font-mono text-gray-700 truncate" title="${fileName}">${fileName}</span>
                    </div>
                    <button class="delete-btn text-red-400 hover:text-red-600 p-1 transition rounded shrink-0" title="Remove from sequence">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
                
                <div class="flex flex-col md:flex-row gap-4 mt-2">
                    <div class="w-full md:w-1/3">
                        <audio controls class="w-full h-10 mt-1 rounded-md" preload="none">
                            <source src="${section.audio}" type="audio/mpeg">
                        </audio>
                    </div>
                    <div class="w-full md:w-2/3 flex flex-col gap-2">
                        <div class="flex justify-between items-end">
                            <label class="text-xs font-bold text-gray-500 uppercase tracking-wide">Italian Text</label>
                            <button class="remove-newlines-btn text-[10px] text-gray-500 hover:text-gray-800 transition" title="Remove Line Breaks">
                                <i class="fa-solid fa-align-left"></i> Fix
                            </button>
                        </div>
                        <textarea class="it-input w-full bg-gray-50 border border-gray-200 rounded p-2 text-xs focus:border-coptic-gold transition min-h-[60px] resize-y" dir="ltr" placeholder="Paste Italian...">${section.text.it || ''}</textarea>
                    </div>
                </div>
            `;

            const itInput = el.querySelector('.it-input');
            itInput.addEventListener('input', (e) => {
                const item = sequenceData.sections.find(s => s.id === section.id);
                if (item) item.text.it = e.target.value;
            });
            
            itInput.addEventListener('paste', () => {
                setTimeout(() => {
                    let text = itInput.value;
                    text = text.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
                    itInput.value = text;
                    const item = sequenceData.sections.find(s => s.id === section.id);
                    if (item) item.text.it = text;
                }, 10);
            });

            itInput.addEventListener('blur', () => {
                let text = itInput.value.trim();
                itInput.value = text;
                const item = sequenceData.sections.find(s => s.id === section.id);
                if (item) item.text.it = text;
            });

            const rmBtn = el.querySelector('.remove-newlines-btn');
            rmBtn.addEventListener('click', () => {
                let text = itInput.value;
                text = text.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
                itInput.value = text;
                itInput.dispatchEvent(new Event('input'));
            });

            const delBtn = el.querySelector('.delete-btn');
            delBtn.addEventListener('click', () => {
                sequenceData.sections = sequenceData.sections.filter(s => s.id !== section.id);
                renderAll();
            });

            sequenceListEl.appendChild(el);
        });
        
        countSequence.textContent = sequenceData.sections.length;
    }

    function renderAll() {
        renderLibrary();
        renderSequence();
        statsCounter.textContent = `${sequenceData.sections.length} total`;
    }

    function setupSortable() {
        const libraryConfig = {
            group: { name: 'shared', pull: 'clone', put: false },
            animation: 150,
            sort: false,
            handle: '.drag-handle',
            ghostClass: 'ghost-item'
        };

        new Sortable(listPriest, libraryConfig);
        new Sortable(listDeacon, libraryConfig);
        new Sortable(listCongregation, libraryConfig);

        new Sortable(sequenceListEl, {
            group: 'shared',
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'ghost-item',
            chosenClass: 'chosen-item',
            onAdd: function (evt) {
                const itemId = evt.item.dataset.id;
                const itemData = libraryData.find(s => s.id === itemId);
                if (itemData) {
                    const clonedItem = JSON.parse(JSON.stringify(itemData));
                    clonedItem.id = clonedItem.id + '_' + Date.now() + Math.floor(Math.random() * 1000);
                    
                    // Track last added
                    lastAdded[itemData.role] = itemData.id;
                    
                    // Automatically inherit transcription if this block was added before
                    const existingItem = sequenceData.sections.find(s => s.audio === itemData.audio && s.text.it.trim() !== '');
                    if (existingItem) {
                        clonedItem.text.it = existingItem.text.it;
                    }

                    sequenceData.sections.splice(evt.newIndex, 0, clonedItem);
                    renderAll();
                }
            },
            onUpdate: function (evt) {
                const item = sequenceData.sections.splice(evt.oldIndex, 1)[0];
                sequenceData.sections.splice(evt.newIndex, 0, item);
                renderSequence();
            }
        });
    }

    function setupEventListeners() {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            renderLibrary();
        });

        downloadBtn.addEventListener('click', () => {
            const dataStr = JSON.stringify(sequenceData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'data.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        importBtn.addEventListener('click', () => importFile.click());

        importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const importedData = JSON.parse(event.target.result);
                    if (importedData.sections) {
                        sequenceData.sections = importedData.sections;
                        renderAll();
                        alert('Data imported successfully!');
                    } else {
                        alert('Invalid JSON format.');
                    }
                } catch (err) {
                    alert('Error parsing JSON file.');
                }
                importFile.value = '';
            };
            reader.readAsText(file);
        });
    }

    init();
});
