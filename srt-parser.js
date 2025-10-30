// SRT Parser - Parsea archivos de subtítulos SRT
class SRTParser {
    /**
     * Parsea un archivo SRT y devuelve un array de subtítulos
     * @param {string} srtContent - El contenido del archivo SRT
     * @returns {Array} Array de objetos de subtítulo
     */
    static parse(srtContent) {
        const subtitles = [];

        // Normalizar saltos de línea
        const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Dividir por bloques de subtítulos (separados por líneas en blanco)
        const blocks = normalized.split(/\n\n+/).filter(block => block.trim());

        blocks.forEach((block, index) => {
            const lines = block.split('\n');

            if (lines.length < 3) return; // Bloque inválido

            // Primera línea: número de secuencia
            const sequence = parseInt(lines[0].trim());

            // Segunda línea: timestamps
            const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);

            if (!timeMatch) return; // Timestamps inválidos

            const startTime = timeMatch[1];
            const endTime = timeMatch[2];

            // Resto de líneas: texto del subtítulo
            const text = lines.slice(2).join('\n');

            subtitles.push({
                id: sequence || index + 1,
                startTime: startTime,
                endTime: endTime,
                startMs: this.timeToMs(startTime),
                endMs: this.timeToMs(endTime),
                text: text
            });
        });

        // Ordenar por tiempo de inicio
        subtitles.sort((a, b) => a.startMs - b.startMs);

        return subtitles;
    }

    /**
     * Convierte tiempo SRT (HH:MM:SS,mmm) a milisegundos
     * @param {string} timeStr - Tiempo en formato SRT
     * @returns {number} Tiempo en milisegundos
     */
    static timeToMs(timeStr) {
        const [time, ms] = timeStr.split(',');
        const [hours, minutes, seconds] = time.split(':').map(Number);

        return (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + Number(ms);
    }

    /**
     * Convierte milisegundos a formato SRT (HH:MM:SS,mmm)
     * @param {number} ms - Tiempo en milisegundos
     * @returns {string} Tiempo en formato SRT
     */
    static msToTime(ms) {
        const hours = Math.floor(ms / 3600000);
        ms %= 3600000;
        const minutes = Math.floor(ms / 60000);
        ms %= 60000;
        const seconds = Math.floor(ms / 1000);
        const milliseconds = ms % 1000;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
    }

    /**
     * Convierte un array de subtítulos de vuelta a formato SRT
     * @param {Array} subtitles - Array de objetos de subtítulo
     * @returns {string} Contenido del archivo SRT
     */
    static stringify(subtitles) {
        let srtContent = '';

        subtitles.forEach((subtitle, index) => {
            srtContent += `${index + 1}\n`;
            srtContent += `${subtitle.startTime} --> ${subtitle.endTime}\n`;
            srtContent += `${subtitle.text}\n\n`;
        });

        return srtContent.trim();
    }

    /**
     * Encuentra el subtítulo activo en un momento dado
     * @param {Array} subtitles - Array de subtítulos
     * @param {number} currentMs - Tiempo actual en milisegundos
     * @returns {object|null} Subtítulo activo o null
     */
    static findActiveSubtitle(subtitles, currentMs) {
        return subtitles.find(sub =>
            currentMs >= sub.startMs && currentMs <= sub.endMs
        ) || null;
    }
}
