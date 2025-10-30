# Editor de Subtítulos SRT

Editor web profesional para archivos de subtítulos SRT con reproductor de video integrado y sincronización bidireccional.

## Características

- **Reproductor de video integrado**: Carga videos directamente en el navegador
- **Editor de subtítulos**: Edita texto, tiempos de inicio y fin de cada subtítulo
- **Sincronización bidireccional**:
  - Los subtítulos se muestran automáticamente mientras el video se reproduce
  - Haz click en cualquier subtítulo para saltar a ese momento en el video
- **Controles de reproducción**: Play/pause, saltos de 5 segundos, velocidad de reproducción ajustable
- **Agregar/eliminar subtítulos**: Crea nuevos subtítulos o elimina los existentes
- **Exportar**: Guarda tus cambios en un nuevo archivo SRT

## Cómo usar

1. **Abrir la aplicación**:
   - Abre el archivo `index.html` en tu navegador web
   - O sirve los archivos con un servidor web local

2. **Cargar un video**:
   - Haz click en "Cargar Video"
   - Selecciona un archivo de video (MP4, WebM, etc.)

3. **Cargar subtítulos**:
   - Haz click en "Cargar SRT"
   - Selecciona tu archivo de subtítulos .srt

4. **Editar subtítulos**:
   - **Editar texto**: Click en el área de texto del subtítulo y escribe
   - **Editar tiempos**: Click en los campos de tiempo y modifica (formato: HH:MM:SS,mmm)
   - **Saltar al video**: Click en cualquier parte del subtítulo (excepto inputs) para saltar a ese momento
   - **Ver en vivo**: Los subtítulos activos se resaltan con borde verde y se muestran sobre el video

5. **Agregar/eliminar**:
   - **Nuevo subtítulo**: Click en "+ Nuevo" (se crea en el tiempo actual del video)
   - **Eliminar**: Selecciona un subtítulo y haz click en "🗑 Eliminar"

6. **Guardar cambios**:
   - Haz click en "Guardar SRT"
   - Se descargará un archivo `subtitulos_editados.srt` con tus cambios

## Controles de video

- **▶ Play / ⏸ Pause**: Reproducir/pausar el video
- **⏪ -5s**: Retroceder 5 segundos
- **⏩ +5s**: Avanzar 5 segundos
- **Velocidad**: Ajustar velocidad de reproducción (0.25x a 2x)

## Formato SRT

El editor soporta el formato estándar SRT:

```
1
00:00:00,000 --> 00:00:02,000
Primer subtítulo

2
00:00:02,500 --> 00:00:05,000
Segundo subtítulo
```

## Indicadores visuales

- **Borde azul**: Subtítulo seleccionado
- **Borde verde**: Subtítulo actualmente visible en el video
- **Fondo oscuro**: Hover sobre subtítulo

## Requisitos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- JavaScript habilitado
- Archivos de video en formatos soportados por HTML5 (MP4, WebM, etc.)

## Tecnologías

- HTML5
- CSS3
- JavaScript (Vanilla)
- No requiere dependencias externas

## Archivos

- `index.html` - Interfaz principal
- `styles.css` - Estilos de la aplicación
- `app.js` - Lógica de la aplicación
- `srt-parser.js` - Parser de archivos SRT
- `Index.js` - Punto de entrada (legacy)

## Licencia

MIT
