// Editor de Subtítulos SRT - Aplicación Principal

class SubtitleEditor {
    constructor() {
        this.subtitles = [];
        this.videoFile = null;
        this.selectedSubtitleId = null;
        this.currentSelectedIndex = -1;
        this.searchQuery = '';
        this.filteredSubtitles = [];
        this.autoScrollEnabled = true;
        this.history = [];
        this.future = [];
        this.nextSubtitleId = 1;

        // Elementos del DOM
        this.videoPlayer = document.getElementById('videoPlayer');
        this.subtitleOverlay = document.getElementById('subtitleOverlay');
        this.subtitleList = document.getElementById('subtitleList');
        this.currentTimeDisplay = document.getElementById('currentTime');
        this.durationDisplay = document.getElementById('duration');
        this.subtitleCount = document.getElementById('subtitleCount');
        this.searchInput = document.getElementById('searchInput');
        this.clearSearchBtn = document.getElementById('clearSearch');
        this.searchResults = document.getElementById('searchResults');
        this.undoButton = document.getElementById('undoAction');
        this.redoButton = document.getElementById('redoAction');

        this.initializeEventListeners();
        this.initializeKeyboardShortcuts();
        this.updateUndoRedoButtons();
    }

    initializeEventListeners() {
        // Botones de carga
        document.getElementById('loadVideo').addEventListener('click', () => {
            document.getElementById('videoInput').click();
        });

        document.getElementById('loadSRT').addEventListener('click', () => {
            document.getElementById('srtInput').click();
        });

        document.getElementById('saveSRT').addEventListener('click', () => {
            this.saveSRT();
        });

        // Inputs de archivo
        document.getElementById('videoInput').addEventListener('change', (e) => {
            this.loadVideo(e.target.files[0]);
        });

        document.getElementById('srtInput').addEventListener('change', (e) => {
            this.loadSRT(e.target.files[0]);
        });

        // Controles de video
        this.videoPlayer.addEventListener('timeupdate', () => {
            this.updateCurrentTime();
            this.updateActiveSubtitle();
        });

        this.videoPlayer.addEventListener('loadedmetadata', () => {
            this.updateDuration();
        });

        // Botones de reproducción
        document.getElementById('playPause').addEventListener('click', () => {
            this.togglePlayPause();
        });

        document.getElementById('skipBack').addEventListener('click', () => {
            this.videoPlayer.currentTime = Math.max(0, this.videoPlayer.currentTime - 5);
        });

        document.getElementById('skipForward').addEventListener('click', () => {
            this.videoPlayer.currentTime = Math.min(
                this.videoPlayer.duration,
                this.videoPlayer.currentTime + 5
            );
        });

        document.getElementById('playbackRate').addEventListener('change', (e) => {
            this.videoPlayer.playbackRate = parseFloat(e.target.value);
        });

        // Botones de editor
        document.getElementById('addSubtitle').addEventListener('click', () => {
            this.addNewSubtitle();
        });

        document.getElementById('deleteSelected').addEventListener('click', () => {
            this.deleteSelectedSubtitle();
        });

        if (this.undoButton) {
            this.undoButton.addEventListener('click', () => {
                this.undo();
            });
        }

        if (this.redoButton) {
            this.redoButton.addEventListener('click', () => {
                this.redo();
            });
        }

        // Búsqueda de subtítulos
        this.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.filterSubtitles();
        });

        this.clearSearchBtn.addEventListener('click', () => {
            this.clearSearch();
        });
    }

    // Inicializar atajos de teclado
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const isModifier = e.ctrlKey || e.metaKey;
            const key = e.key.toLowerCase();

            if (isModifier && key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
                return;
            }

            if ((isModifier && key === 'y') || ((e.metaKey || e.ctrlKey) && e.shiftKey && key === 'z')) {
                e.preventDefault();
                this.redo();
                return;
            }

            // No activar shortcuts si se está editando un input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                // Permitir Ctrl+F incluso en inputs
                if (isModifier && key === 'f') {
                    e.preventDefault();
                    this.searchInput.focus();
                }
                // Permitir Escape para salir de inputs
                if (e.key === 'Escape') {
                    e.target.blur();
                }
                return;
            }

            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigatePrevious();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateNext();
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (this.currentSelectedIndex >= 0) {
                        this.jumpToSubtitle(this.currentSelectedIndex);
                    }
                    break;
                case ' ':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'f':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.searchInput.focus();
                    }
                    break;
                case 'Escape':
                    this.clearSearch();
                    break;
            }
        });
    }

    updateUndoRedoButtons() {
        if (this.undoButton) {
            this.undoButton.disabled = this.history.length === 0;
        }

        if (this.redoButton) {
            this.redoButton.disabled = this.future.length === 0;
        }
    }

    pushHistory(entry) {
        this.history.push(entry);
        this.future = [];
        this.updateUndoRedoButtons();
    }

    resetHistory() {
        this.history = [];
        this.future = [];
        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.history.length === 0) return;

        const entry = this.history.pop();
        this.applyHistoryEntry(entry, 'undo');
        this.future.push(entry);
        this.renderSubtitles();
        this.updateUndoRedoButtons();
    }

    redo() {
        if (this.future.length === 0) return;

        const entry = this.future.pop();
        this.applyHistoryEntry(entry, 'redo');
        this.history.push(entry);
        this.renderSubtitles();
        this.updateUndoRedoButtons();
    }

    applyHistoryEntry(entry, direction) {
        switch (entry.type) {
            case 'update': {
                const patch = direction === 'undo' ? entry.prev : entry.next;
                const index = this.findSubtitleIndexById(entry.id);
                if (index === -1) return;

                Object.assign(this.subtitles[index], patch);

                if (patch.startMs !== undefined || patch.endMs !== undefined) {
                    this.sortSubtitles();
                }

                this.setSelectionById(entry.id);
                break;
            }
            case 'add':
                if (direction === 'undo') {
                    this.removeSubtitleById(entry.subtitle.id);
                    this.setSelectionById(entry.previousSelectionId || null);
                } else {
                    this.insertSubtitle(entry.subtitle);
                    this.setSelectionById(entry.subtitle.id);
                }
                break;
            case 'delete':
                if (direction === 'undo') {
                    this.insertSubtitle(entry.subtitle);
                    this.setSelectionById(entry.subtitle.id);
                } else {
                    this.removeSubtitleById(entry.subtitle.id);
                    this.setSelectionById(entry.previousSelectionId || null);
                }
                break;
            default:
                break;
        }
    }

    cloneSubtitle(subtitle) {
        return {
            id: subtitle.id,
            startTime: subtitle.startTime,
            endTime: subtitle.endTime,
            startMs: subtitle.startMs,
            endMs: subtitle.endMs,
            text: subtitle.text
        };
    }

    findSubtitleIndexById(id) {
        return this.subtitles.findIndex(subtitle => subtitle.id === id);
    }

    insertSubtitle(subtitle) {
        const clone = this.cloneSubtitle(subtitle);
        this.subtitles.push(clone);
        this.sortSubtitles();
        this.nextSubtitleId = Math.max(this.nextSubtitleId, clone.id + 1);
        return this.findSubtitleIndexById(clone.id);
    }

    removeSubtitleById(id) {
        const index = this.findSubtitleIndexById(id);
        if (index === -1) return null;

        const [removed] = this.subtitles.splice(index, 1);
        return removed;
    }

    sortSubtitles() {
        this.subtitles.sort((a, b) => a.startMs - b.startMs);
        this.updateSelectionTracking();
    }

    setSelectionById(id) {
        if (!id) {
            this.selectedSubtitleId = null;
            this.currentSelectedIndex = -1;
            return;
        }

        const index = this.findSubtitleIndexById(id);
        if (index !== -1) {
            this.selectedSubtitleId = id;
            this.currentSelectedIndex = index;
        } else {
            this.selectedSubtitleId = null;
            this.currentSelectedIndex = -1;
        }
    }

    updateSelectionTracking() {
        if (this.selectedSubtitleId === null) {
            this.currentSelectedIndex = -1;
            return;
        }

        const index = this.findSubtitleIndexById(this.selectedSubtitleId);
        if (index !== -1) {
            this.currentSelectedIndex = index;
        } else {
            this.selectedSubtitleId = null;
            this.currentSelectedIndex = -1;
        }
    }

    generateSubtitleId() {
        const id = this.nextSubtitleId;
        this.nextSubtitleId += 1;
        return id;
    }

    recalculateNextSubtitleId() {
        const maxId = this.subtitles.reduce((max, subtitle) => Math.max(max, subtitle.id || 0), 0);
        this.nextSubtitleId = maxId + 1;
    }

    // Cargar video
    loadVideo(file) {
        if (!file) return;

        this.videoFile = file;
        const url = URL.createObjectURL(file);
        this.videoPlayer.src = url;
        this.videoPlayer.load();

        console.log('Video cargado:', file.name);
    }

    // Cargar archivo SRT
    async loadSRT(file) {
        if (!file) return;

        try {
            const text = await file.text();
            this.subtitles = SRTParser.parse(text);
            this.selectedSubtitleId = null;
            this.currentSelectedIndex = -1;
            this.resetHistory();
            this.recalculateNextSubtitleId();
            this.renderSubtitles();
            console.log('SRT cargado:', this.subtitles.length, 'subtítulos');
        } catch (error) {
            console.error('Error al cargar SRT:', error);
            alert('Error al cargar el archivo SRT. Por favor verifica el formato.');
        }
    }

    // Guardar archivo SRT
    saveSRT() {
        if (this.subtitles.length === 0) {
            alert('No hay subtítulos para guardar.');
            return;
        }

        const srtContent = SRTParser.stringify(this.subtitles);
        const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'subtitulos_editados.srt';
        a.click();

        URL.revokeObjectURL(url);
        console.log('SRT guardado');
    }

    // Renderizar lista de subtítulos
    renderSubtitles() {
        // Actualizar contador
        this.subtitleCount.textContent = this.subtitles.length;
        this.updateSelectionTracking();

        if (this.subtitles.length === 0) {
            this.subtitleList.innerHTML = `
                <div class="empty-state">
                    <p>No hay subtítulos cargados</p>
                    <p>Carga un archivo SRT para comenzar</p>
                </div>
            `;
            return;
        }

        this.subtitleList.innerHTML = '';

        this.subtitles.forEach((subtitle, index) => {
            const subtitleItem = this.createSubtitleItem(subtitle, index);
            this.subtitleList.appendChild(subtitleItem);
        });

        // Aplicar filtro si existe una búsqueda activa
        if (this.searchQuery) {
            this.filterSubtitles();
        }
    }

    // Crear elemento de subtítulo
    createSubtitleItem(subtitle, index) {
        const item = document.createElement('div');
        item.className = 'subtitle-item';
        item.dataset.index = index;
        item.dataset.id = subtitle.id;

        item.innerHTML = `
            <div class="subtitle-header">
                <span class="subtitle-number">#${index + 1}</span>
                <div class="subtitle-times">
                    <input type="text" class="time-input" data-field="startTime" value="${subtitle.startTime}">
                    <span>→</span>
                    <input type="text" class="time-input" data-field="endTime" value="${subtitle.endTime}">
                </div>
            </div>
            <textarea class="subtitle-text" rows="2">${subtitle.text}</textarea>
        `;

        // Click en el item para saltar al video
        item.addEventListener('click', (e) => {
            // No activar si se está editando un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            this.selectSubtitle(index);
            this.jumpToSubtitle(index);
        });

        // Edición de tiempos
        const timeInputs = item.querySelectorAll('.time-input');
        timeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateSubtitleTime(index, e.target.dataset.field, e.target.value);
            });

            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });

        // Edición de texto
        const textarea = item.querySelector('.subtitle-text');
        textarea.addEventListener('input', (e) => {
            this.updateSubtitleText(index, e.target.value);
        });

        textarea.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        if (this.selectedSubtitleId === subtitle.id) {
            item.classList.add('selected');
            this.currentSelectedIndex = index;
        }

        return item;
    }

    // Seleccionar un subtítulo
    selectSubtitle(index, scrollToView = true) {
        // Remover selección anterior
        const previousSelected = this.subtitleList.querySelector('.subtitle-item.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }

        // Seleccionar nuevo
        const item = this.subtitleList.querySelector(`[data-index="${index}"]`);
        if (item) {
            item.classList.add('selected');
            this.selectedSubtitleId = this.subtitles[index].id;
            this.currentSelectedIndex = index;

            // Scroll al elemento seleccionado
            if (scrollToView) {
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    // Navegar al subtítulo anterior
    navigatePrevious() {
        if (this.subtitles.length === 0) return;

        // Si hay búsqueda activa, navegar solo por subtítulos filtrados
        const visibleIndices = this.getVisibleSubtitleIndices();
        if (visibleIndices.length === 0) return;

        const currentIndex = this.currentSelectedIndex;
        const currentPosInVisible = visibleIndices.indexOf(currentIndex);

        if (currentPosInVisible > 0) {
            // Ir al anterior en la lista filtrada
            this.selectSubtitle(visibleIndices[currentPosInVisible - 1]);
        } else if (currentPosInVisible === 0) {
            // Ya estamos en el primero, no hacer nada o ir al último
            this.selectSubtitle(visibleIndices[visibleIndices.length - 1]);
        } else {
            // No hay selección, seleccionar el último
            this.selectSubtitle(visibleIndices[visibleIndices.length - 1]);
        }
    }

    // Navegar al siguiente subtítulo
    navigateNext() {
        if (this.subtitles.length === 0) return;

        // Si hay búsqueda activa, navegar solo por subtítulos filtrados
        const visibleIndices = this.getVisibleSubtitleIndices();
        if (visibleIndices.length === 0) return;

        const currentIndex = this.currentSelectedIndex;
        const currentPosInVisible = visibleIndices.indexOf(currentIndex);

        if (currentPosInVisible >= 0 && currentPosInVisible < visibleIndices.length - 1) {
            // Ir al siguiente en la lista filtrada
            this.selectSubtitle(visibleIndices[currentPosInVisible + 1]);
        } else if (currentPosInVisible === visibleIndices.length - 1) {
            // Ya estamos en el último, ir al primero
            this.selectSubtitle(visibleIndices[0]);
        } else {
            // No hay selección, seleccionar el primero
            this.selectSubtitle(visibleIndices[0]);
        }
    }

    // Obtener índices de subtítulos visibles
    getVisibleSubtitleIndices() {
        const visibleItems = this.subtitleList.querySelectorAll('.subtitle-item:not(.hidden)');
        return Array.from(visibleItems).map(item => parseInt(item.dataset.index));
    }

    // Saltar al subtítulo en el video
    jumpToSubtitle(index) {
        if (!this.videoPlayer.src) return;

        const subtitle = this.subtitles[index];
        this.videoPlayer.currentTime = subtitle.startMs / 1000;
    }

    // Actualizar tiempo de subtítulo
    updateSubtitleTime(index, field, value) {
        try {
            const subtitle = this.subtitles[index];
            if (!subtitle) return;

            const previousState = {
                startTime: subtitle.startTime,
                endTime: subtitle.endTime,
                startMs: subtitle.startMs,
                endMs: subtitle.endMs
            };

            const nextState = { ...previousState };

            if (field === 'startTime') {
                nextState.startTime = value;
                nextState.startMs = SRTParser.timeToMs(value);
                if (isNaN(nextState.startMs)) {
                    throw new Error('Formato de tiempo inválido');
                }
            } else if (field === 'endTime') {
                nextState.endTime = value;
                nextState.endMs = SRTParser.timeToMs(value);
                if (isNaN(nextState.endMs)) {
                    throw new Error('Formato de tiempo inválido');
                }
            } else {
                return;
            }

            if (previousState[field] === nextState[field]) {
                return;
            }

            subtitle.startTime = nextState.startTime;
            subtitle.endTime = nextState.endTime;
            subtitle.startMs = nextState.startMs;
            subtitle.endMs = nextState.endMs;

            this.pushHistory({
                type: 'update',
                id: subtitle.id,
                prev: previousState,
                next: nextState
            });

            this.setSelectionById(subtitle.id);
            this.sortSubtitles();
            this.renderSubtitles();
            console.log(`Tiempo actualizado para subtítulo #${index + 1}`);
        } catch (error) {
            console.error('Error al actualizar tiempo:', error);
            alert('Formato de tiempo inválido. Usa HH:MM:SS,mmm');
            this.renderSubtitles();
        }
    }

    // Actualizar texto de subtítulo
    updateSubtitleText(index, text) {
        const subtitle = this.subtitles[index];
        if (!subtitle) return;

        const previousText = subtitle.text;
        if (previousText === text) return;

        subtitle.text = text;

        this.pushHistory({
            type: 'update',
            id: subtitle.id,
            prev: { text: previousText },
            next: { text: text }
        });

        this.setSelectionById(subtitle.id);
    }

    // Actualizar subtítulo activo en el overlay
    updateActiveSubtitle() {
        const currentMs = this.videoPlayer.currentTime * 1000;
        const activeSubtitle = SRTParser.findActiveSubtitle(this.subtitles, currentMs);

        if (activeSubtitle) {
            this.subtitleOverlay.textContent = activeSubtitle.text;
            this.subtitleOverlay.style.display = 'block';

            // Resaltar en la lista
            this.highlightActiveSubtitle(activeSubtitle.id);
        } else {
            this.subtitleOverlay.textContent = '';
            this.subtitleOverlay.style.display = 'none';
        }
    }

    // Resaltar subtítulo activo en la lista
    highlightActiveSubtitle(id) {
        const items = this.subtitleList.querySelectorAll('.subtitle-item');
        let activeItem = null;

        items.forEach(item => {
            if (parseInt(item.dataset.id) === id) {
                item.classList.add('active');
                activeItem = item;
            } else {
                item.classList.remove('active');
            }
        });

        // Auto-scroll al subtítulo activo si está habilitado
        if (activeItem && this.autoScrollEnabled) {
            // Solo hacer scroll si el elemento no está visible
            const rect = activeItem.getBoundingClientRect();
            const containerRect = this.subtitleList.getBoundingClientRect();

            if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
                activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    // Actualizar tiempo actual
    updateCurrentTime() {
        const ms = this.videoPlayer.currentTime * 1000;
        this.currentTimeDisplay.textContent = SRTParser.msToTime(ms);
    }

    // Actualizar duración
    updateDuration() {
        const ms = this.videoPlayer.duration * 1000;
        this.durationDisplay.textContent = SRTParser.msToTime(ms);
    }

    // Toggle play/pause
    togglePlayPause() {
        if (this.videoPlayer.paused) {
            this.videoPlayer.play();
            document.getElementById('playPause').textContent = '⏸ Pause';
        } else {
            this.videoPlayer.pause();
            document.getElementById('playPause').textContent = '▶ Play';
        }
    }

    // Agregar nuevo subtítulo
    addNewSubtitle() {
        const previousSelectionId = this.selectedSubtitleId;
        const currentMs = this.videoPlayer.currentTime * 1000;
        const startTime = SRTParser.msToTime(currentMs);
        const endTime = SRTParser.msToTime(currentMs + 2000); // 2 segundos de duración por defecto

        const newSubtitle = {
            id: this.generateSubtitleId(),
            startTime: startTime,
            endTime: endTime,
            startMs: currentMs,
            endMs: currentMs + 2000,
            text: 'Nuevo subtítulo'
        };

        this.subtitles.push(newSubtitle);
        this.sortSubtitles();
        const newIndex = this.findSubtitleIndexById(newSubtitle.id);
        this.setSelectionById(newSubtitle.id);
        this.renderSubtitles();
        if (newIndex !== -1) {
            this.selectSubtitle(newIndex);
        }

        this.pushHistory({
            type: 'add',
            subtitle: this.cloneSubtitle(newSubtitle),
            previousSelectionId
        });
        console.log('Nuevo subtítulo agregado');
    }

    // Eliminar subtítulo seleccionado
    deleteSelectedSubtitle() {
        if (this.selectedSubtitleId === null) {
            alert('Selecciona un subtítulo para eliminar.');
            return;
        }

        const removed = this.removeSubtitleById(this.selectedSubtitleId);
        if (removed) {
            this.pushHistory({
                type: 'delete',
                subtitle: this.cloneSubtitle(removed),
                previousSelectionId: this.selectedSubtitleId
            });

            this.setSelectionById(null);
            this.renderSubtitles();
            console.log('Subtítulo eliminado');
        }
    }

    // Filtrar subtítulos por búsqueda
    filterSubtitles() {
        const query = this.searchQuery.toLowerCase().trim();

        if (!query) {
            // Mostrar todos los subtítulos
            const items = this.subtitleList.querySelectorAll('.subtitle-item');
            items.forEach(item => {
                item.classList.remove('hidden', 'search-match');
                // Restaurar texto sin highlights
                const textarea = item.querySelector('.subtitle-text');
                const index = parseInt(item.dataset.index);
                if (textarea && this.subtitles[index]) {
                    textarea.value = this.subtitles[index].text;
                }
            });
            this.clearSearchBtn.classList.remove('visible');
            this.searchResults.textContent = '';
            return;
        }

        this.clearSearchBtn.classList.add('visible');

        let matchCount = 0;
        const items = this.subtitleList.querySelectorAll('.subtitle-item');

        items.forEach(item => {
            const index = parseInt(item.dataset.index);
            const subtitle = this.subtitles[index];
            const text = subtitle.text.toLowerCase();

            if (text.includes(query)) {
                // Mostrar y marcar como coincidencia
                item.classList.remove('hidden');
                item.classList.add('search-match');
                matchCount++;

                // Highlight del texto coincidente en el textarea
                const textarea = item.querySelector('.subtitle-text');
                if (textarea) {
                    // Para textareas no podemos usar HTML, así que solo restauramos el texto
                    textarea.value = subtitle.text;
                }
            } else {
                // Ocultar
                item.classList.add('hidden');
                item.classList.remove('search-match');
            }
        });

        // Mostrar resultados
        this.searchResults.textContent = matchCount > 0
            ? `${matchCount} resultado${matchCount !== 1 ? 's' : ''} encontrado${matchCount !== 1 ? 's' : ''}`
            : 'No se encontraron resultados';
    }

    // Limpiar búsqueda
    clearSearch() {
        this.searchInput.value = '';
        this.searchQuery = '';
        this.filterSubtitles();
        this.searchInput.blur();
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const editor = new SubtitleEditor();
    console.log('Editor de Subtítulos SRT iniciado');
});
