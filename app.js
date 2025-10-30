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

        // Auto-save properties
        this.autoSaveInterval = null;
        this.lastSaveTime = null;
        this.autoSaveEnabled = true;
        this.SESSION_KEY = 'srt_editor_session';
        this.videoFileName = null;

        // View mode and resizer properties
        this.currentViewMode = 'normal';
        this.isResizing = false;
        this.editorWidth = this.loadEditorWidth() || 450;

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
        this.autoSaveIndicator = document.getElementById('autoSaveIndicator');
        this.autoSaveStatus = document.getElementById('autoSaveStatus');

        this.initializeEventListeners();
        this.initializeKeyboardShortcuts();
        this.updateUndoRedoButtons();
        this.checkForSavedSession();
        this.startAutoSave();
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

        // Auto-save y recuperación
        document.getElementById('saveSession').addEventListener('click', () => {
            this.saveSession(true);
        });

        document.getElementById('recoverSession').addEventListener('click', () => {
            this.recoverSession();
        });

        document.getElementById('discardSession').addEventListener('click', () => {
            this.discardSession();
        });

        // Sincronización de tiempos
        document.getElementById('syncTiming').addEventListener('click', () => {
            this.openSyncModal();
        });

        document.getElementById('cancelSync').addEventListener('click', () => {
            this.closeSyncModal();
        });

        document.getElementById('applySyncButton').addEventListener('click', () => {
            this.applyTimingSync();
        });

        // Tabs de sincronización
        const syncTabs = document.querySelectorAll('.sync-tab');
        syncTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchSyncTab(e.target.dataset.tab);
            });
        });

        // Checkbox de rango
        document.getElementById('applyToRange').addEventListener('change', (e) => {
            const rangeInputs = document.getElementById('rangeInputs');
            if (e.target.checked) {
                rangeInputs.classList.remove('hidden');
            } else {
                rangeInputs.classList.add('hidden');
            }
        });

        // Preview en tiempo real
        ['shiftAmount', 'shiftUnit', 'scalePercent', 'referenceSubtitle', 'newStartTime', 'applyToRange', 'rangeFrom', 'rangeTo'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.updateSyncPreview();
                });
                element.addEventListener('change', () => {
                    this.updateSyncPreview();
                });
            }
        });

        // Panel de calidad
        document.getElementById('qualityToggle').addEventListener('click', () => {
            const panel = document.querySelector('.quality-panel');
            panel.classList.toggle('collapsed');
        });

        document.getElementById('exportQualityReport').addEventListener('click', () => {
            this.exportQualityReport();
        });

        // Modos de vista
        document.getElementById('theaterMode').addEventListener('click', () => {
            this.setViewMode('theater');
        });

        document.getElementById('focusMode').addEventListener('click', () => {
            this.setViewMode('focus');
        });

        document.getElementById('normalMode').addEventListener('click', () => {
            this.setViewMode('normal');
        });

        // Resizer
        this.initializeResizer();
        this.applyEditorWidth();

        // Vista de contexto
        document.getElementById('contextPrev').addEventListener('click', () => {
            this.navigatePrevious();
        });

        document.getElementById('contextNext').addEventListener('click', () => {
            this.navigateNext();
        });

        document.getElementById('contextCurrentText').addEventListener('input', (e) => {
            if (this.currentSelectedIndex >= 0) {
                this.updateSubtitleText(this.currentSelectedIndex, e.target.textContent);
            }
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
            case 'batch_update': {
                // Aplicar cambios en batch
                entry.changes.forEach(change => {
                    const patch = direction === 'undo' ? change.prev : change.next;
                    const index = this.findSubtitleIndexById(change.id);
                    if (index !== -1) {
                        Object.assign(this.subtitles[index], patch);
                    }
                });
                this.sortSubtitles();
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
        this.videoFileName = file.name;
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
            this.showToast('success', 'SRT cargado', `${this.subtitles.length} subtítulos cargados correctamente`);
        } catch (error) {
            console.error('Error al cargar SRT:', error);
            this.showToast('error', 'Error al cargar SRT', 'Por favor verifica el formato del archivo.');
        }
    }

    // Guardar archivo SRT
    saveSRT() {
        if (this.subtitles.length === 0) {
            this.showToast('warning', 'No hay subtítulos', 'No hay subtítulos para guardar.');
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
        this.showToast('success', 'SRT guardado', `${this.subtitles.length} subtítulos exportados correctamente`);
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
            this.updateQualityPanel();
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

        // Actualizar panel de calidad
        this.updateQualityPanel();
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

            // Actualizar vista de contexto
            this.updateContextView();
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

    // ===== AUTO-SAVE FUNCTIONALITY =====

    startAutoSave() {
        // Auto-guardar cada 30 segundos
        this.autoSaveInterval = setInterval(() => {
            if (this.autoSaveEnabled && this.subtitles.length > 0) {
                this.saveSession(false);
            }
        }, 30000); // 30 segundos

        // Actualizar el indicador cada 5 segundos
        setInterval(() => {
            this.updateAutoSaveIndicator();
        }, 5000);
    }

    saveSession(manual = false) {
        if (!this.autoSaveEnabled && !manual) return;

        try {
            const sessionData = {
                subtitles: this.subtitles,
                selectedSubtitleId: this.selectedSubtitleId,
                currentSelectedIndex: this.currentSelectedIndex,
                nextSubtitleId: this.nextSubtitleId,
                videoFileName: this.videoFileName,
                videoCurrentTime: this.videoPlayer.currentTime || 0,
                // Guardar solo las últimas 50 operaciones de history
                history: this.history.slice(-50),
                future: this.future.slice(-50),
                timestamp: Date.now()
            };

            localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
            this.lastSaveTime = Date.now();

            // Feedback visual
            if (manual) {
                this.showAutoSaveAnimation();
                this.showToast('success', 'Sesión guardada', 'Tu progreso ha sido guardado correctamente', 3000);
            }

            this.updateAutoSaveIndicator();
        } catch (error) {
            console.error('Error al guardar sesión:', error);
            if (manual) {
                alert('Error al guardar la sesión. Es posible que el almacenamiento local esté lleno.');
            }
        }
    }

    checkForSavedSession() {
        try {
            const savedData = localStorage.getItem(this.SESSION_KEY);
            if (!savedData) return;

            const sessionData = JSON.parse(savedData);

            // Verificar que la sesión tenga subtítulos
            if (!sessionData.subtitles || sessionData.subtitles.length === 0) {
                this.clearSession();
                return;
            }

            // Mostrar modal de recuperación
            this.showRecoveryModal(sessionData);
        } catch (error) {
            console.error('Error al verificar sesión guardada:', error);
            this.clearSession();
        }
    }

    showRecoveryModal(sessionData) {
        const modal = document.getElementById('recoveryModal');
        const subtitleCount = document.getElementById('recoverySubtitleCount');
        const timestamp = document.getElementById('recoveryTimestamp');

        subtitleCount.textContent = sessionData.subtitles.length;

        const lastEdit = new Date(sessionData.timestamp);
        const now = new Date();
        const diffMinutes = Math.floor((now - lastEdit) / 1000 / 60);

        let timeAgo;
        if (diffMinutes < 1) {
            timeAgo = 'hace menos de 1 minuto';
        } else if (diffMinutes < 60) {
            timeAgo = `hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
        } else if (diffMinutes < 1440) {
            const hours = Math.floor(diffMinutes / 60);
            timeAgo = `hace ${hours} hora${hours > 1 ? 's' : ''}`;
        } else {
            const days = Math.floor(diffMinutes / 1440);
            timeAgo = `hace ${days} día${days > 1 ? 's' : ''}`;
        }

        timestamp.textContent = timeAgo;
        modal.classList.remove('hidden');
    }

    recoverSession() {
        try {
            const savedData = localStorage.getItem(this.SESSION_KEY);
            if (!savedData) {
                this.closeRecoveryModal();
                return;
            }

            const sessionData = JSON.parse(savedData);

            // Restaurar datos
            this.subtitles = sessionData.subtitles || [];
            this.selectedSubtitleId = sessionData.selectedSubtitleId || null;
            this.currentSelectedIndex = sessionData.currentSelectedIndex || -1;
            this.nextSubtitleId = sessionData.nextSubtitleId || 1;
            this.videoFileName = sessionData.videoFileName || null;
            this.history = sessionData.history || [];
            this.future = sessionData.future || [];

            // Restaurar posición del video si hay un video cargado
            if (sessionData.videoCurrentTime && this.videoPlayer.src) {
                this.videoPlayer.currentTime = sessionData.videoCurrentTime;
            }

            this.renderSubtitles();
            this.updateUndoRedoButtons();
            this.closeRecoveryModal();

            console.log('Sesión recuperada exitosamente');
            this.lastSaveTime = Date.now();
            this.updateAutoSaveIndicator();
        } catch (error) {
            console.error('Error al recuperar sesión:', error);
            alert('Error al recuperar la sesión guardada.');
            this.discardSession();
        }
    }

    discardSession() {
        this.clearSession();
        this.closeRecoveryModal();
        console.log('Sesión descartada');
    }

    closeRecoveryModal() {
        const modal = document.getElementById('recoveryModal');
        modal.classList.add('hidden');
    }

    clearSession() {
        localStorage.removeItem(this.SESSION_KEY);
    }

    updateAutoSaveIndicator() {
        if (!this.lastSaveTime) {
            this.autoSaveStatus.textContent = 'Auto-guardado activo';
            return;
        }

        const now = Date.now();
        const diffSeconds = Math.floor((now - this.lastSaveTime) / 1000);

        let statusText;
        if (diffSeconds < 60) {
            statusText = `Guardado hace ${diffSeconds}s`;
        } else {
            const minutes = Math.floor(diffSeconds / 60);
            statusText = `Guardado hace ${minutes}m`;
        }

        this.autoSaveStatus.textContent = statusText;
    }

    showAutoSaveAnimation() {
        this.autoSaveIndicator.classList.add('saving');
        this.autoSaveStatus.textContent = 'Guardando...';

        setTimeout(() => {
            this.autoSaveIndicator.classList.remove('saving');
            this.updateAutoSaveIndicator();
        }, 1000);
    }

    // ===== TIMING SYNCHRONIZATION =====

    openSyncModal() {
        if (this.subtitles.length === 0) {
            alert('No hay subtítulos para sincronizar.');
            return;
        }

        // Poblar el select de subtítulos de referencia
        const referenceSelect = document.getElementById('referenceSubtitle');
        referenceSelect.innerHTML = '<option value="">Selecciona un subtítulo...</option>';

        this.subtitles.forEach((subtitle, index) => {
            const option = document.createElement('option');
            option.value = index;
            const previewText = subtitle.text.substring(0, 30) + (subtitle.text.length > 30 ? '...' : '');
            option.textContent = `#${index + 1}: ${subtitle.startTime} - ${previewText}`;
            referenceSelect.appendChild(option);
        });

        // Establecer valores por defecto
        document.getElementById('rangeFrom').max = this.subtitles.length;
        document.getElementById('rangeTo').max = this.subtitles.length;
        document.getElementById('rangeTo').value = this.subtitles.length;

        // Si hay un subtítulo seleccionado, preseleccionarlo
        if (this.currentSelectedIndex >= 0) {
            referenceSelect.value = this.currentSelectedIndex;
            const selectedSub = this.subtitles[this.currentSelectedIndex];
            document.getElementById('newStartTime').value = selectedSub.startTime;
        }

        const modal = document.getElementById('syncModal');
        modal.classList.remove('hidden');

        this.updateSyncPreview();
    }

    closeSyncModal() {
        const modal = document.getElementById('syncModal');
        modal.classList.add('hidden');
    }

    switchSyncTab(tabName) {
        // Actualizar tabs
        const tabs = document.querySelectorAll('.sync-tab');
        tabs.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Actualizar contenido
        const contents = document.querySelectorAll('.sync-tab-content');
        contents.forEach(content => {
            content.classList.remove('active');
        });

        document.getElementById(`${tabName}Tab`).classList.add('active');

        this.updateSyncPreview();
    }

    getActiveTab() {
        const activeTab = document.querySelector('.sync-tab.active');
        return activeTab ? activeTab.dataset.tab : 'shift';
    }

    getAffectedRange() {
        const applyToRange = document.getElementById('applyToRange').checked;
        if (!applyToRange) {
            return { from: 0, to: this.subtitles.length - 1 };
        }

        const from = Math.max(0, parseInt(document.getElementById('rangeFrom').value) - 1);
        const to = Math.min(this.subtitles.length - 1, parseInt(document.getElementById('rangeTo').value) - 1);

        return { from, to };
    }

    calculateSyncChanges() {
        const activeTab = this.getActiveTab();
        const range = this.getAffectedRange();
        const changes = [];

        switch (activeTab) {
            case 'shift': {
                const amount = parseFloat(document.getElementById('shiftAmount').value) || 0;
                const unit = document.getElementById('shiftUnit').value;
                const shiftMs = unit === 'seconds' ? amount * 1000 : amount;

                for (let i = range.from; i <= range.to; i++) {
                    const subtitle = this.subtitles[i];
                    const newStartMs = Math.max(0, subtitle.startMs + shiftMs);
                    const newEndMs = Math.max(0, subtitle.endMs + shiftMs);

                    changes.push({
                        index: i,
                        oldStart: subtitle.startTime,
                        oldEnd: subtitle.endTime,
                        newStart: SRTParser.msToTime(newStartMs),
                        newEnd: SRTParser.msToTime(newEndMs),
                        newStartMs,
                        newEndMs
                    });
                }
                break;
            }

            case 'scale': {
                const scalePercent = parseFloat(document.getElementById('scalePercent').value) || 100;
                const scaleFactor = scalePercent / 100;

                for (let i = range.from; i <= range.to; i++) {
                    const subtitle = this.subtitles[i];
                    const newStartMs = Math.round(subtitle.startMs * scaleFactor);
                    const newEndMs = Math.round(subtitle.endMs * scaleFactor);

                    changes.push({
                        index: i,
                        oldStart: subtitle.startTime,
                        oldEnd: subtitle.endTime,
                        newStart: SRTParser.msToTime(newStartMs),
                        newEnd: SRTParser.msToTime(newEndMs),
                        newStartMs,
                        newEndMs
                    });
                }
                break;
            }

            case 'from-mark': {
                const refIndex = parseInt(document.getElementById('referenceSubtitle').value);
                const newStartTimeStr = document.getElementById('newStartTime').value;

                if (isNaN(refIndex) || !newStartTimeStr) {
                    return [];
                }

                try {
                    const newStartMs = SRTParser.timeToMs(newStartTimeStr);
                    const refSubtitle = this.subtitles[refIndex];
                    const offsetMs = newStartMs - refSubtitle.startMs;

                    for (let i = range.from; i <= range.to; i++) {
                        const subtitle = this.subtitles[i];
                        const newStartMs = Math.max(0, subtitle.startMs + offsetMs);
                        const newEndMs = Math.max(0, subtitle.endMs + offsetMs);

                        changes.push({
                            index: i,
                            oldStart: subtitle.startTime,
                            oldEnd: subtitle.endTime,
                            newStart: SRTParser.msToTime(newStartMs),
                            newEnd: SRTParser.msToTime(newEndMs),
                            newStartMs,
                            newEndMs
                        });
                    }
                } catch (error) {
                    console.error('Error al calcular desde marca:', error);
                    return [];
                }
                break;
            }
        }

        return changes;
    }

    updateSyncPreview() {
        const previewDiv = document.getElementById('syncPreview');
        const changes = this.calculateSyncChanges();

        if (changes.length === 0) {
            previewDiv.innerHTML = 'Configura los ajustes para ver una vista previa...';
            return;
        }

        // Mostrar solo los primeros 5 cambios
        const previewChanges = changes.slice(0, 5);
        let html = '';

        previewChanges.forEach(change => {
            html += `
                <div class="preview-item changed">
                    <div class="preview-label">#${change.index + 1}</div>
                    <div>
                        <span class="preview-time">${change.oldStart}</span>
                        <span class="preview-arrow">→</span>
                        <span class="preview-time">${change.newStart}</span>
                    </div>
                </div>
            `;
        });

        if (changes.length > 5) {
            html += `<div class="preview-item"><div class="preview-label">... y ${changes.length - 5} subtítulos más</div></div>`;
        }

        html += `<div class="preview-item" style="border-left-color: #16a34a; margin-top: 1rem;">
            <strong>Total: ${changes.length} subtítulo${changes.length > 1 ? 's' : ''} será${changes.length > 1 ? 'n' : ''} modificado${changes.length > 1 ? 's' : ''}</strong>
        </div>`;

        previewDiv.innerHTML = html;
    }

    applyTimingSync() {
        const changes = this.calculateSyncChanges();

        if (changes.length === 0) {
            alert('No hay cambios para aplicar. Verifica la configuración.');
            return;
        }

        // Confirmar con el usuario
        const confirmMessage = `Se modificarán ${changes.length} subtítulo${changes.length > 1 ? 's' : ''}. ¿Continuar?`;
        if (!confirm(confirmMessage)) {
            return;
        }

        // Crear una única entrada de historia para todo el batch
        const batchChanges = changes.map(change => ({
            id: this.subtitles[change.index].id,
            prev: {
                startTime: change.oldStart,
                endTime: change.oldEnd,
                startMs: this.subtitles[change.index].startMs,
                endMs: this.subtitles[change.index].endMs
            },
            next: {
                startTime: change.newStart,
                endTime: change.newEnd,
                startMs: change.newStartMs,
                endMs: change.newEndMs
            }
        }));

        // Aplicar cambios
        changes.forEach(change => {
            const subtitle = this.subtitles[change.index];
            subtitle.startTime = change.newStart;
            subtitle.endTime = change.newEnd;
            subtitle.startMs = change.newStartMs;
            subtitle.endMs = change.newEndMs;
        });

        // Guardar en historia como operación batch
        this.pushHistory({
            type: 'batch_update',
            changes: batchChanges
        });

        this.sortSubtitles();
        this.renderSubtitles();
        this.closeSyncModal();

        this.showToast('success', 'Sincronización aplicada', `${changes.length} subtítulo${changes.length > 1 ? 's' : ''} actualizado${changes.length > 1 ? 's' : ''} correctamente`);
    }

    // ===== QUALITY VALIDATION =====

    analyzeSubtitleQuality() {
        const issues = [];

        // 1. Detectar overlaps (solapamientos)
        for (let i = 0; i < this.subtitles.length - 1; i++) {
            const current = this.subtitles[i];
            const next = this.subtitles[i + 1];

            if (current.endMs > next.startMs) {
                issues.push({
                    type: 'error',
                    category: 'overlap',
                    title: 'Solapamiento detectado',
                    details: `Subtítulo #${i + 1} termina después de que inicia #${i + 2}`,
                    subtitleIndices: [i, i + 1],
                    data: {
                        overlap: current.endMs - next.startMs
                    }
                });
            }
        }

        // 2. Detectar gaps largos (>5 segundos)
        for (let i = 0; i < this.subtitles.length - 1; i++) {
            const current = this.subtitles[i];
            const next = this.subtitles[i + 1];
            const gapMs = next.startMs - current.endMs;

            if (gapMs > 5000) {
                issues.push({
                    type: 'warning',
                    category: 'gap',
                    title: 'Silencio largo',
                    details: `${(gapMs / 1000).toFixed(1)}s de silencio entre #${i + 1} y #${i + 2}`,
                    subtitleIndices: [i, i + 1],
                    data: {
                        gap: gapMs
                    }
                });
            }
        }

        // 3. Detectar texto muy largo (>80 caracteres ~ 2 líneas)
        this.subtitles.forEach((subtitle, index) => {
            const lineCount = subtitle.text.split('\n').length;
            const charCount = subtitle.text.length;

            if (charCount > 80 || lineCount > 2) {
                issues.push({
                    type: 'warning',
                    category: 'long-text',
                    title: 'Texto muy largo',
                    details: `Subtítulo #${index + 1}: ${charCount} caracteres, ${lineCount} línea${lineCount > 1 ? 's' : ''}`,
                    subtitleIndices: [index],
                    data: {
                        charCount,
                        lineCount
                    }
                });
            }
        });

        // 4. Detectar velocidad de lectura alta (>21 caracteres/segundo)
        this.subtitles.forEach((subtitle, index) => {
            const durationSeconds = (subtitle.endMs - subtitle.startMs) / 1000;
            const charCount = subtitle.text.replace(/\s/g, '').length; // Sin espacios
            const readingSpeed = charCount / durationSeconds;

            if (readingSpeed > 21 && durationSeconds > 0) {
                issues.push({
                    type: 'warning',
                    category: 'reading-speed',
                    title: 'Velocidad de lectura alta',
                    details: `Subtítulo #${index + 1}: ${readingSpeed.toFixed(1)} caracteres/segundo`,
                    subtitleIndices: [index],
                    data: {
                        readingSpeed
                    }
                });
            }
        });

        // 5. Detectar subtítulos muy cortos (<0.5 segundos)
        this.subtitles.forEach((subtitle, index) => {
            const durationMs = subtitle.endMs - subtitle.startMs;

            if (durationMs < 500) {
                issues.push({
                    type: 'warning',
                    category: 'short-duration',
                    title: 'Duración muy corta',
                    details: `Subtítulo #${index + 1}: ${durationMs}ms de duración`,
                    subtitleIndices: [index],
                    data: {
                        duration: durationMs
                    }
                });
            }
        });

        return issues;
    }

    updateQualityPanel() {
        const qualityChecklist = document.getElementById('qualityChecklist');
        const qualityBadge = document.getElementById('qualityBadge');

        if (this.subtitles.length === 0) {
            qualityChecklist.innerHTML = `
                <div class="quality-item loading">
                    <span class="quality-status">⏳</span>
                    <span>Carga subtítulos para analizar...</span>
                </div>
            `;
            qualityBadge.textContent = '0';
            qualityBadge.classList.remove('success');
            return;
        }

        const issues = this.analyzeSubtitleQuality();

        // Actualizar badge
        qualityBadge.textContent = issues.length;
        if (issues.length === 0) {
            qualityBadge.classList.add('success');
        } else {
            qualityBadge.classList.remove('success');
        }

        // Marcar subtítulos con problemas
        this.markSubtitlesWithIssues(issues);

        // Renderizar checklist
        if (issues.length === 0) {
            qualityChecklist.innerHTML = `
                <div class="quality-item success">
                    <span class="quality-status">✓</span>
                    <div class="quality-item-content">
                        <div class="quality-item-title">¡Todo perfecto!</div>
                        <div class="quality-item-details">No se detectaron problemas de calidad</div>
                    </div>
                </div>
            `;
            return;
        }

        // Agrupar por categoría
        const grouped = {};
        issues.forEach(issue => {
            if (!grouped[issue.category]) {
                grouped[issue.category] = [];
            }
            grouped[issue.category].push(issue);
        });

        let html = '';

        // Mostrar resumen por categoría
        Object.entries(grouped).forEach(([category, categoryIssues]) => {
            const firstIssue = categoryIssues[0];
            const icon = firstIssue.type === 'error' ? '❌' : '⚠️';
            const className = firstIssue.type === 'error' ? 'error' : 'warning';

            html += `
                <div class="quality-item ${className}" data-category="${category}">
                    <span class="quality-status">${icon}</span>
                    <div class="quality-item-content">
                        <div class="quality-item-title">${firstIssue.title}</div>
                        <div class="quality-item-details">
                            ${categoryIssues.length} problema${categoryIssues.length > 1 ? 's' : ''} detectado${categoryIssues.length > 1 ? 's' : ''}
                            ${categoryIssues.slice(0, 2).map(issue =>
                                `<span class="quality-item-link" data-index="${issue.subtitleIndices[0]}">
                                    #${issue.subtitleIndices[0] + 1}
                                </span>`
                            ).join(', ')}
                            ${categoryIssues.length > 2 ? `y ${categoryIssues.length - 2} más` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        qualityChecklist.innerHTML = html;

        // Agregar event listeners para los links
        qualityChecklist.querySelectorAll('.quality-item-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(link.dataset.index);
                this.selectSubtitle(index);
            });
        });

        // Guardar issues para el reporte
        this.qualityIssues = issues;
    }

    markSubtitlesWithIssues(issues) {
        // Limpiar marcas anteriores
        this.subtitleList.querySelectorAll('.subtitle-item').forEach(item => {
            item.classList.remove('has-error', 'has-warning');
        });

        // Marcar subtítulos con problemas
        issues.forEach(issue => {
            issue.subtitleIndices.forEach(index => {
                const item = this.subtitleList.querySelector(`[data-index="${index}"]`);
                if (item) {
                    if (issue.type === 'error') {
                        item.classList.add('has-error');
                    } else {
                        item.classList.add('has-warning');
                    }
                }
            });
        });
    }

    exportQualityReport() {
        if (!this.qualityIssues || this.qualityIssues.length === 0) {
            this.showToast('info', 'Sin problemas', 'No hay problemas de calidad para reportar.');
            return;
        }

        let reportText = '=== REPORTE DE CALIDAD DE SUBTÍTULOS ===\n\n';
        reportText += `Fecha: ${new Date().toLocaleString()}\n`;
        reportText += `Total de subtítulos: ${this.subtitles.length}\n`;
        reportText += `Problemas detectados: ${this.qualityIssues.length}\n\n`;

        // Agrupar por categoría
        const grouped = {};
        this.qualityIssues.forEach(issue => {
            if (!grouped[issue.category]) {
                grouped[issue.category] = [];
            }
            grouped[issue.category].push(issue);
        });

        // Generar reporte por categoría
        Object.entries(grouped).forEach(([category, issues]) => {
            reportText += `\n--- ${issues[0].title} (${issues.length}) ---\n`;
            issues.forEach((issue, i) => {
                reportText += `${i + 1}. ${issue.details}\n`;
            });
        });

        // Descargar como archivo de texto
        const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_calidad_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('success', 'Reporte exportado', `Reporte con ${this.qualityIssues.length} problema${this.qualityIssues.length > 1 ? 's' : ''} descargado`);
    }

    // ===== VIEW MODES AND RESIZING =====

    setViewMode(mode) {
        const mainContent = document.querySelector('.main-content');
        const buttons = document.querySelectorAll('.btn-view-mode');

        // Remover clases de modo anteriores
        mainContent.classList.remove('theater-mode', 'focus-mode');

        // Remover active de todos los botones
        buttons.forEach(btn => btn.classList.remove('active'));

        // Aplicar nuevo modo
        if (mode === 'theater') {
            mainContent.classList.add('theater-mode');
            document.getElementById('theaterMode').classList.add('active');
        } else if (mode === 'focus') {
            mainContent.classList.add('focus-mode');
            document.getElementById('focusMode').classList.add('active');
        } else {
            document.getElementById('normalMode').classList.add('active');
        }

        this.currentViewMode = mode;
        localStorage.setItem('srt_editor_view_mode', mode);

        console.log(`Modo de vista cambiado a: ${mode}`);
    }

    initializeResizer() {
        const resizer = document.getElementById('resizer');
        const editorSection = document.querySelector('.editor-section');
        const mainContent = document.querySelector('.main-content');

        resizer.addEventListener('mousedown', (e) => {
            this.isResizing = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            const onMouseMove = (e) => {
                if (!this.isResizing) return;

                const containerWidth = mainContent.offsetWidth;
                const newWidth = containerWidth - e.clientX;

                // Limitar el ancho entre 350px y 800px
                if (newWidth >= 350 && newWidth <= 800) {
                    this.editorWidth = newWidth;
                    editorSection.style.width = `${newWidth}px`;
                }
            };

            const onMouseUp = () => {
                this.isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';

                // Guardar el ancho en localStorage
                this.saveEditorWidth(this.editorWidth);

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    loadEditorWidth() {
        const saved = localStorage.getItem('srt_editor_width');
        return saved ? parseInt(saved) : null;
    }

    saveEditorWidth(width) {
        localStorage.setItem('srt_editor_width', width);
    }

    applyEditorWidth() {
        const editorSection = document.querySelector('.editor-section');
        if (this.editorWidth) {
            editorSection.style.width = `${this.editorWidth}px`;
        }

        // Cargar modo de vista guardado
        const savedMode = localStorage.getItem('srt_editor_view_mode');
        if (savedMode && savedMode !== 'normal') {
            this.setViewMode(savedMode);
        }
    }

    // ===== CONTEXT VIEW =====

    updateContextView() {
        const index = this.currentSelectedIndex;

        if (index < 0 || index >= this.subtitles.length) {
            this.clearContextView();
            return;
        }

        const current = this.subtitles[index];
        const prev = index > 0 ? this.subtitles[index - 1] : null;
        const next = index < this.subtitles.length - 1 ? this.subtitles[index + 1] : null;

        // Actualizar posición
        document.getElementById('contextPosition').textContent = `${index + 1}/${this.subtitles.length}`;

        // Actualizar botones
        document.getElementById('contextPrev').disabled = index === 0;
        document.getElementById('contextNext').disabled = index === this.subtitles.length - 1;

        // Subtítulo anterior
        if (prev) {
            document.getElementById('contextPrevTime').textContent = `${prev.startTime} → ${prev.endTime}`;
            document.getElementById('contextPrevText').textContent = prev.text;

            // Calcular gap
            const gapMs = current.startMs - prev.endMs;
            this.updateGapIndicator('contextPrevGap', gapMs);
        } else {
            document.getElementById('contextPrevTime').textContent = '--:--:--,---';
            document.getElementById('contextPrevText').textContent = 'No hay subtítulo anterior';
            document.getElementById('contextPrevGap').textContent = '';
        }

        // Subtítulo actual
        document.getElementById('contextCurrentTime').textContent = `${current.startTime} → ${current.endTime}`;
        const contextCurrentText = document.getElementById('contextCurrentText');
        if (contextCurrentText.textContent !== current.text) {
            contextCurrentText.textContent = current.text;
        }
        contextCurrentText.contentEditable = 'true';

        // Timeline
        this.updateContextTimeline(current);

        // Gap después del actual
        if (next) {
            const gapMs = next.startMs - current.endMs;
            this.updateGapIndicator('contextCurrentGap', gapMs);
        } else {
            document.getElementById('contextCurrentGap').textContent = '';
        }

        // Subtítulo siguiente
        if (next) {
            document.getElementById('contextNextTime').textContent = `${next.startTime} → ${next.endTime}`;
            document.getElementById('contextNextText').textContent = next.text;
        } else {
            document.getElementById('contextNextTime').textContent = '--:--:--,---';
            document.getElementById('contextNextText').textContent = 'No hay subtítulo siguiente';
        }
    }

    updateGapIndicator(elementId, gapMs) {
        const element = document.getElementById(elementId);
        const gapSeconds = (gapMs / 1000).toFixed(1);

        element.classList.remove('short', 'long');

        if (gapMs < 0) {
            // Overlap
            element.textContent = `⚠️ Solapamiento: ${Math.abs(gapSeconds)}s`;
            element.classList.add('long');
        } else if (gapMs < 1000) {
            // Gap corto
            element.textContent = `🕐 Gap: ${gapSeconds}s`;
            element.classList.add('short');
        } else if (gapMs > 5000) {
            // Gap largo
            element.textContent = `⏰ Gap largo: ${gapSeconds}s`;
            element.classList.add('long');
        } else {
            // Gap normal
            element.textContent = `🕐 Gap: ${gapSeconds}s`;
        }
    }

    updateContextTimeline(subtitle) {
        const timeline = document.getElementById('contextTimeline');
        const videoDuration = this.videoPlayer.duration * 1000 || 100000;
        const percentage = (subtitle.startMs / videoDuration) * 100;

        timeline.style.setProperty('--progress', `${percentage}%`);
        timeline.style.background = `linear-gradient(to right, #2563eb ${percentage}%, #404040 ${percentage}%)`;
    }

    clearContextView() {
        document.getElementById('contextPosition').textContent = '-/-';
        document.getElementById('contextPrevTime').textContent = '--:--:--,---';
        document.getElementById('contextPrevText').textContent = '-';
        document.getElementById('contextCurrentTime').textContent = '--:--:--,---';
        document.getElementById('contextCurrentText').textContent = 'Selecciona un subtítulo para ver el contexto';
        document.getElementById('contextCurrentText').contentEditable = 'false';
        document.getElementById('contextNextTime').textContent = '--:--:--,---';
        document.getElementById('contextNextText').textContent = '-';
        document.getElementById('contextPrevGap').textContent = '';
        document.getElementById('contextCurrentGap').textContent = '';
        document.getElementById('contextPrev').disabled = true;
        document.getElementById('contextNext').disabled = true;
    }

    // ===== TOAST NOTIFICATIONS =====

    showToast(type, title, message, duration = 5000) {
        const container = document.getElementById('toastContainer');

        // Iconos según el tipo
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || 'ℹ'}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-close">✕</button>
        `;

        const closeButton = toast.querySelector('.toast-close');
        closeButton.addEventListener('click', () => {
            this.removeToast(toast);
        });

        container.appendChild(toast);

        // Auto-remover después de la duración especificada
        if (duration > 0) {
            setTimeout(() => {
                this.removeToast(toast);
            }, duration);
        }

        return toast;
    }

    removeToast(toast) {
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300); // Duración de la animación
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const editor = new SubtitleEditor();
    console.log('Editor de Subtítulos SRT iniciado');
});
