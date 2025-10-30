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
        this.historyLimit = 100;

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
        this.globalOffsetForm = document.getElementById('globalOffsetForm');
        this.globalOffsetInput = document.getElementById('globalOffsetInput');
        this.rangeOffsetForm = document.getElementById('rangeOffsetForm');
        this.rangeOffsetStartInput = document.getElementById('rangeOffsetStart');
        this.rangeOffsetEndInput = document.getElementById('rangeOffsetEnd');
        this.rangeOffsetValueInput = document.getElementById('rangeOffsetValue');
        this.stretchForm = document.getElementById('stretchForm');
        this.stretchPercentInput = document.getElementById('stretchPercent');

        this.initializeEventListeners();
        this.initializeKeyboardShortcuts();
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

        // Búsqueda de subtítulos
        this.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.filterSubtitles();
        });

        this.clearSearchBtn.addEventListener('click', () => {
            this.clearSearch();
        });

        if (this.globalOffsetForm) {
            this.globalOffsetForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.subtitles.length === 0) {
                    alert('Carga subtítulos antes de aplicar un offset.');
                    return;
                }

                const value = parseFloat(this.globalOffsetInput.value);
                if (Number.isNaN(value)) {
                    alert('Ingresa un offset global válido en milisegundos.');
                    return;
                }

                const offsetMs = Math.round(value);
                if (offsetMs === 0) {
                    alert('El offset global no puede ser 0.');
                    return;
                }

                const confirmed = window.confirm(`¿Aplicar un offset global de ${offsetMs} ms a ${this.subtitles.length} subtítulos?`);
                if (!confirmed) return;

                const previousState = this.captureState();
                const changed = this.applyGlobalOffset(offsetMs);

                if (changed) {
                    this.renderSubtitles();
                    this.updateActiveSubtitle();
                    this.logHistory('global-offset', { offsetMs }, previousState, this.captureState());
                    this.globalOffsetInput.value = '';
                }
            });
        }

        if (this.rangeOffsetForm) {
            this.rangeOffsetForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.subtitles.length === 0) {
                    alert('Carga subtítulos antes de aplicar un offset.');
                    return;
                }

                const start = parseInt(this.rangeOffsetStartInput.value, 10);
                if (Number.isNaN(start) || start < 1) {
                    alert('Indica un índice inicial válido (1 o mayor).');
                    return;
                }

                const endRaw = parseInt(this.rangeOffsetEndInput.value, 10);
                const end = Number.isNaN(endRaw) ? this.subtitles.length : endRaw;
                if (end < start) {
                    alert('El índice final debe ser mayor o igual al inicial.');
                    return;
                }

                const value = parseFloat(this.rangeOffsetValueInput.value);
                if (Number.isNaN(value)) {
                    alert('Indica un offset válido en milisegundos.');
                    return;
                }

                const offsetMs = Math.round(value);
                if (offsetMs === 0) {
                    alert('El offset del rango no puede ser 0.');
                    return;
                }

                const totalAffected = Math.max(0, Math.min(end, this.subtitles.length) - start + 1);
                if (totalAffected === 0) {
                    alert('El rango indicado no coincide con subtítulos cargados.');
                    return;
                }

                const confirmed = window.confirm(`¿Aplicar un offset de ${offsetMs} ms del subtítulo #${start} al #${Math.min(end, this.subtitles.length)}?`);
                if (!confirmed) return;

                const previousState = this.captureState();
                const changed = this.applyRangeOffset(start - 1, end - 1, offsetMs);

                if (changed) {
                    this.renderSubtitles();
                    this.updateActiveSubtitle();
                    this.logHistory('range-offset', { offsetMs, start, end: Math.min(end, this.subtitles.length) }, previousState, this.captureState());
                    this.rangeOffsetValueInput.value = '';
                }
            });
        }

        if (this.stretchForm) {
            this.stretchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (this.subtitles.length === 0) {
                    alert('Carga subtítulos antes de aplicar estiramiento.');
                    return;
                }

                const value = parseFloat(this.stretchPercentInput.value);
                if (Number.isNaN(value)) {
                    alert('Indica un porcentaje válido (ej. 5 o -2.5).');
                    return;
                }

                const factor = 1 + value / 100;
                if (factor <= 0) {
                    alert('El estiramiento debe resultar en una escala positiva.');
                    return;
                }

                if (value === 0) {
                    alert('El porcentaje no puede ser 0.');
                    return;
                }

                const confirmed = window.confirm(`¿Aplicar un estiramiento de ${value}% a todos los subtítulos?`);
                if (!confirmed) return;

                const previousState = this.captureState();
                const changed = this.applyStretch(value);

                if (changed) {
                    this.renderSubtitles();
                    this.updateActiveSubtitle();
                    this.logHistory('stretch', { percent: value }, previousState, this.captureState());
                    this.stretchPercentInput.value = '';
                }
            });
        }
    }

    // Inicializar atajos de teclado
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // No activar shortcuts si se está editando un input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                // Permitir Ctrl+F incluso en inputs
                if (e.ctrlKey && e.key === 'f') {
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

        this.restoreSelection();
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
            subtitle[field] = value;

            // Actualizar también los milisegundos
            if (field === 'startTime') {
                const newStartMs = SRTParser.timeToMs(value);
                this.updateSubtitleTimesFromMs(subtitle, newStartMs, subtitle.endMs);
            } else if (field === 'endTime') {
                const newEndMs = SRTParser.timeToMs(value);
                this.updateSubtitleTimesFromMs(subtitle, subtitle.startMs, newEndMs);
            }

            console.log(`Tiempo actualizado para subtítulo #${index + 1}`);
        } catch (error) {
            console.error('Error al actualizar tiempo:', error);
            alert('Formato de tiempo inválido. Usa HH:MM:SS,mmm');
        }
    }

    // Actualizar texto de subtítulo
    updateSubtitleText(index, text) {
        this.subtitles[index].text = text;
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
        const currentMs = this.videoPlayer.currentTime * 1000;
        const newSubtitle = {
            id: this.subtitles.length + 1,
            startTime: '',
            endTime: '',
            startMs: 0,
            endMs: 0,
            text: 'Nuevo subtítulo'
        };

        this.updateSubtitleTimesFromMs(newSubtitle, currentMs, currentMs + 2000); // 2 segundos por defecto
        this.subtitles.push(newSubtitle);
        this.sortSubtitles();

        this.renderSubtitles();
        console.log('Nuevo subtítulo agregado');
    }

    // Eliminar subtítulo seleccionado
    deleteSelectedSubtitle() {
        if (this.selectedSubtitleId === null) {
            alert('Selecciona un subtítulo para eliminar.');
            return;
        }

        const index = this.subtitles.findIndex(s => s.id === this.selectedSubtitleId);
        if (index !== -1) {
            this.subtitles.splice(index, 1);
            this.selectedSubtitleId = null;
            this.currentSelectedIndex = -1;
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

    // Restaurar selección tras re-render
    restoreSelection() {
        if (this.selectedSubtitleId === null) {
            return;
        }

        const newIndex = this.subtitles.findIndex(sub => sub.id === this.selectedSubtitleId);
        if (newIndex === -1) {
            this.selectedSubtitleId = null;
            this.currentSelectedIndex = -1;
            return;
        }

        const item = this.subtitleList.querySelector(`[data-index="${newIndex}"]`);
        if (!item || item.classList.contains('hidden')) {
            this.selectedSubtitleId = null;
            this.currentSelectedIndex = -1;
            return;
        }

        this.selectSubtitle(newIndex, false);
    }

    // Guardar snapshot del estado actual
    captureState() {
        return this.subtitles.map(subtitle => ({ ...subtitle }));
    }

    // Registrar entrada en historial para undo/redo
    logHistory(action, details, beforeState, afterState) {
        const entry = {
            action,
            details,
            before: beforeState,
            after: afterState,
            timestamp: new Date().toISOString()
        };

        this.history.push(entry);
        if (this.history.length > this.historyLimit) {
            this.history.shift();
        }

        console.log(`Historial registrado: ${action}`, details);
    }

    // Ordenar subtítulos por tiempo de inicio
    sortSubtitles() {
        this.subtitles.sort((a, b) => {
            if (a.startMs === b.startMs) {
                return a.endMs - b.endMs;
            }
            return a.startMs - b.startMs;
        });
    }

    // Actualizar representaciones de tiempo de un subtítulo
    updateSubtitleTimesFromMs(subtitle, startMs, endMs) {
        const safeStart = Math.max(0, Math.round(startMs));
        const safeEnd = Math.max(safeStart, Math.round(endMs));

        subtitle.startMs = safeStart;
        subtitle.endMs = safeEnd;
        subtitle.startTime = SRTParser.msToTime(safeStart);
        subtitle.endTime = SRTParser.msToTime(safeEnd);
    }

    // Aplicar offset global en milisegundos
    applyGlobalOffset(ms) {
        if (!Number.isFinite(ms) || ms === 0 || this.subtitles.length === 0) {
            return false;
        }

        this.subtitles.forEach(subtitle => {
            const newStart = subtitle.startMs + ms;
            const newEnd = subtitle.endMs + ms;
            this.updateSubtitleTimesFromMs(subtitle, newStart, newEnd);
        });

        this.sortSubtitles();
        return true;
    }

    // Aplicar offset a un rango de subtítulos (índices basados en 0)
    applyRangeOffset(startIndex, endIndex, ms) {
        if (!Number.isFinite(ms) || ms === 0 || this.subtitles.length === 0) {
            return false;
        }

        const safeStart = Math.max(0, Math.min(startIndex, endIndex));
        const safeEnd = Math.min(this.subtitles.length - 1, Math.max(startIndex, endIndex));

        if (safeStart > safeEnd) {
            return false;
        }

        for (let i = safeStart; i <= safeEnd; i++) {
            const subtitle = this.subtitles[i];
            const newStart = subtitle.startMs + ms;
            const newEnd = subtitle.endMs + ms;
            this.updateSubtitleTimesFromMs(subtitle, newStart, newEnd);
        }

        this.sortSubtitles();
        return true;
    }

    // Estirar todos los subtítulos a partir del primero
    applyStretch(percent) {
        if (!Number.isFinite(percent) || percent === 0 || this.subtitles.length === 0) {
            return false;
        }

        const factor = 1 + percent / 100;
        if (factor <= 0) {
            return false;
        }

        const anchor = this.subtitles[0].startMs;

        this.subtitles.forEach(subtitle => {
            const startOffset = subtitle.startMs - anchor;
            const endOffset = subtitle.endMs - anchor;
            const newStart = anchor + startOffset * factor;
            const newEnd = anchor + endOffset * factor;
            this.updateSubtitleTimesFromMs(subtitle, newStart, newEnd);
        });

        this.sortSubtitles();
        return true;
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
