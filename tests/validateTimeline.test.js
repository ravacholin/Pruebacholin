const assert = require('assert');
const { validateTimelineData } = require('../app.js');

const makeSubtitle = (id, startMs, endMs) => ({
    id,
    startMs,
    endMs
});

(() => {
    const result = validateTimelineData([
        makeSubtitle(1, 0, 2000),
        makeSubtitle(2, 1500, 3200)
    ]);

    assert.strictEqual(result.overlaps.length, 1, 'Debe detectar un solapamiento');
    assert.strictEqual(result.hasBlockingConflicts, true, 'Los solapamientos son conflictos bloqueantes');
    assert.ok(result.issuesById[1].some(issue => issue.type === 'overlap'), 'El subtítulo #1 debe registrar el solapamiento');
    assert.ok(result.issuesById[2].some(issue => issue.type === 'overlap'), 'El subtítulo #2 debe registrar el solapamiento');
})();

(() => {
    const result = validateTimelineData([
        makeSubtitle(1, 5000, 4000)
    ]);

    assert.strictEqual(result.negativeDurations.length, 1, 'Debe identificar duraciones negativas');
    assert.strictEqual(result.hasBlockingConflicts, true, 'Las duraciones negativas son conflictos bloqueantes');
})();

(() => {
    const result = validateTimelineData([
        makeSubtitle(1, 0, 1000),
        makeSubtitle(2, 1400, 2000),
        makeSubtitle(3, 2200, 3000)
    ]);

    assert.strictEqual(result.hasBlockingConflicts, false, 'No debe haber conflictos en una cronología correcta');
    assert.strictEqual(result.warningsCount, 0, 'No debe haber advertencias en una cronología ajustada');
})();

(() => {
    const result = validateTimelineData([
        makeSubtitle(1, 0, 1000),
        makeSubtitle(2, 4500, 5200)
    ]);

    assert.strictEqual(result.largeGaps.length, 1, 'Debe detectar huecos extensos');
    assert.strictEqual(result.hasBlockingConflicts, false, 'Los huecos extensos no son bloqueantes');
    assert.strictEqual(result.warningsCount, 1, 'Los huecos extensos cuentan como advertencias');
    assert.ok(result.issuesById[2].some(issue => issue.type === 'largeGap' && issue.fromId === 1), 'El hueco debe asociarse al subtítulo posterior');
})();

console.log('validateTimelineData tests passed');
