// Editor de Subtítulos SRT - Aplicación Principal

class SubtitleEditor {
    constructor() {
        this.subtitles = [];
        this.videoFile = null;
        this.selectedSubtitleId = null;

        // Elementos del DOM
        this.videoPlayer = document.getElementById('videoPlayer');
        this.subtitleOverlay = document.getElementById('subtitleOverlay');
        this.subtitleList = document.getElementById('subtitleList');
        this.currentTimeDisplay = document.getElementById('currentTime');
        this.durationDisplay = document.getElementById('duration');

        this.initializeEventListeners();
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
    selectSubtitle(index) {
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

            // Scroll al elemento seleccionado
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
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
        items.forEach(item => {
            if (parseInt(item.dataset.id) === id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
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
            this.renderSubtitles();
            console.log('Subtítulo eliminado');
        }
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const editor = new SubtitleEditor();
    console.log('Editor de Subtítulos SRT iniciado');
});
