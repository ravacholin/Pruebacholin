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
        this.matchIndices = [];
        this.activeMatchIndex = -1;
        this.keepOnlyMatches = false;

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
        this.prevMatchBtn = document.getElementById('prevMatch');
        this.nextMatchBtn = document.getElementById('nextMatch');
        this.keepMatchesSwitch = document.getElementById('keepMatchesSwitch');

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

        this.nextMatchBtn.addEventListener('click', () => {
            this.focusNextMatch();
        });

        this.prevMatchBtn.addEventListener('click', () => {
            this.focusPrevMatch();
        });

        this.keepMatchesSwitch.addEventListener('change', (e) => {
            this.keepOnlyMatches = e.target.checked;
            this.filterSubtitles();
        });
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
            <div class="subtitle-text-wrapper">
                <div class="subtitle-text-overlay" aria-hidden="true"></div>
                <textarea class="subtitle-text" rows="2">${subtitle.text}</textarea>
            </div>
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
        const overlay = item.querySelector('.subtitle-text-overlay');
        this.updateSubtitleOverlay(item, subtitle.text);

        textarea.addEventListener('input', (e) => {
            this.updateSubtitleText(index, e.target.value);
        });

        textarea.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        textarea.addEventListener('scroll', () => {
            if (overlay) {
                this.syncOverlayScroll(textarea, overlay);
            }
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

            if (this.matchIndices.length > 0) {
                const matchPosition = this.matchIndices.indexOf(index);
                if (matchPosition !== -1) {
                    this.activeMatchIndex = matchPosition;
                    this.updateSearchStatus();
                } else if (this.activeMatchIndex !== -1) {
                    this.activeMatchIndex = -1;
                    this.updateSearchStatus();
                }
            }

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
                subtitle.startMs = SRTParser.timeToMs(value);
            } else if (field === 'endTime') {
                subtitle.endMs = SRTParser.timeToMs(value);
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
        const item = this.subtitleList.querySelector(`[data-index="${index}"]`);
        if (item) {
            this.updateSubtitleOverlay(item, text);
        }
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
        const startTime = SRTParser.msToTime(currentMs);
        const endTime = SRTParser.msToTime(currentMs + 2000); // 2 segundos de duración por defecto

        const newSubtitle = {
            id: this.subtitles.length + 1,
            startTime: startTime,
            endTime: endTime,
            startMs: currentMs,
            endMs: currentMs + 2000,
            text: 'Nuevo subtítulo'
        };

        this.subtitles.push(newSubtitle);
        this.subtitles.sort((a, b) => a.startMs - b.startMs);

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
        const items = this.subtitleList.querySelectorAll('.subtitle-item');
        this.matchIndices = [];
        this.activeMatchIndex = -1;

        if (!query) {
            // Mostrar todos los subtítulos
            items.forEach(item => {
                item.classList.remove('hidden', 'search-match');
                // Restaurar texto sin highlights
                const textarea = item.querySelector('.subtitle-text');
                const index = parseInt(item.dataset.index);
                const subtitle = this.subtitles[index];
                if (textarea && subtitle) {
                    textarea.value = subtitle.text;
                }
                this.updateSubtitleOverlay(item, subtitle ? subtitle.text : '', '');
            });
            this.clearSearchBtn.classList.remove('visible');
            this.searchResults.textContent = '';
            return;
        }

        this.clearSearchBtn.classList.add('visible');

        let matchCount = 0;

        items.forEach(item => {
            const index = parseInt(item.dataset.index);
            const subtitle = this.subtitles[index];
            if (!subtitle) {
                item.classList.remove('search-match');
                item.classList.remove('hidden');
                this.updateSubtitleOverlay(item, '', '');
                return;
            }
            const text = subtitle.text.toLowerCase();

            if (text.includes(query)) {
                // Mostrar y marcar como coincidencia
                item.classList.remove('hidden');
                item.classList.add('search-match');
                matchCount++;
                this.matchIndices.push(index);

                // Highlight del texto coincidente en el textarea
                const textarea = item.querySelector('.subtitle-text');
                if (textarea) {
                    // Para textareas no podemos usar HTML, así que solo restauramos el texto
                    textarea.value = subtitle.text;
                }
                this.updateSubtitleOverlay(item, subtitle.text, query);
            } else {
                // Ocultar
                if (this.keepOnlyMatches) {
                    item.classList.add('hidden');
                } else {
                    item.classList.remove('hidden');
                }
                item.classList.remove('search-match');
                this.updateSubtitleOverlay(item, subtitle.text, '');
            }
        });

        if (matchCount > 0) {
            const currentMatchPosition = this.matchIndices.indexOf(this.currentSelectedIndex);
            if (currentMatchPosition !== -1) {
                this.activeMatchIndex = currentMatchPosition;
            } else {
                this.activeMatchIndex = 0;
                const firstMatchIndex = this.matchIndices[0];
                if (typeof firstMatchIndex === 'number') {
                    this.selectSubtitle(firstMatchIndex, false);
                }
            }
        }

        this.updateSearchStatus(matchCount);
    }

    // Limpiar búsqueda
    clearSearch() {
        this.searchInput.value = '';
        this.searchQuery = '';
        this.filterSubtitles();
        this.searchInput.blur();
    }

    focusNextMatch() {
        if (this.matchIndices.length === 0) return;

        if (this.activeMatchIndex === -1) {
            this.activeMatchIndex = 0;
        } else {
            this.activeMatchIndex = (this.activeMatchIndex + 1) % this.matchIndices.length;
        }

        const subtitleIndex = this.matchIndices[this.activeMatchIndex];
        this.selectSubtitle(subtitleIndex);
        this.updateSearchStatus();
    }

    focusPrevMatch() {
        if (this.matchIndices.length === 0) return;

        if (this.activeMatchIndex === -1) {
            this.activeMatchIndex = this.matchIndices.length - 1;
        } else {
            this.activeMatchIndex = (this.activeMatchIndex - 1 + this.matchIndices.length) % this.matchIndices.length;
        }

        const subtitleIndex = this.matchIndices[this.activeMatchIndex];
        this.selectSubtitle(subtitleIndex);
        this.updateSearchStatus();
    }

    updateSearchStatus(matchCount = this.matchIndices.length) {
        if (!this.searchQuery.trim()) {
            this.searchResults.textContent = '';
            return;
        }

        if (matchCount === 0) {
            this.searchResults.textContent = 'No se encontraron resultados';
            return;
        }

        if (this.activeMatchIndex >= 0) {
            const current = this.activeMatchIndex + 1;
            this.searchResults.textContent = `${matchCount} resultado${matchCount !== 1 ? 's' : ''} • ${current} de ${matchCount}`;
        } else {
            this.searchResults.textContent = `${matchCount} resultado${matchCount !== 1 ? 's' : ''} • sin selección`;
        }
    }

    syncOverlayScroll(textarea, overlay) {
        if (!textarea || !overlay) return;
        overlay.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
    }

    updateSubtitleOverlay(item, text, query = this.searchQuery) {
        const overlay = item.querySelector('.subtitle-text-overlay');
        if (!overlay) return;

        if (typeof text !== 'string') {
            text = '';
        }

        if (!query) {
            overlay.innerHTML = this.escapeHtml(text);
            const textarea = item.querySelector('.subtitle-text');
            if (textarea) {
                this.syncOverlayScroll(textarea, overlay);
            } else {
                overlay.style.transform = 'translate(0, 0)';
            }
            return;
        }

        const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
        const parts = text.split(regex);
        const highlighted = parts.map(part => {
            if (part.toLowerCase() === query.toLowerCase()) {
                return `<mark>${this.escapeHtml(part)}</mark>`;
            }
            return this.escapeHtml(part);
        }).join('');

        overlay.innerHTML = highlighted;
        const textarea = item.querySelector('.subtitle-text');
        if (textarea) {
            this.syncOverlayScroll(textarea, overlay);
        } else {
            overlay.style.transform = 'translate(0, 0)';
        }
    }

    escapeHtml(text) {
        const normalized = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return normalized
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, '<br>');
    }

    escapeRegExp(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const editor = new SubtitleEditor();
    console.log('Editor de Subtítulos SRT iniciado');
});
