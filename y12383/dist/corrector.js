"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatChordsForDisplay = formatChordsForDisplay;
exports.createSideBySideComparison = createSideBySideComparison;
exports.updateChordProgression = updateChordProgression;
exports.updateNotes = updateNotes;
exports.updateMetaData = updateMetaData;
exports.markAsReviewed = markAsReviewed;
exports.getChordHistory = getChordHistory;
const analyzer_1 = require("./analyzer");
function formatChordsForDisplay(chords) {
    const bars = {};
    chords.forEach(chord => {
        if (!bars[chord.bar])
            bars[chord.bar] = [];
        bars[chord.bar].push(chord.name);
    });
    const maxBar = Math.max(...Object.keys(bars).map(Number));
    const result = [];
    for (let i = 1; i <= maxBar; i++) {
        if (bars[i]) {
            result.push(`[${i}] ${bars[i].join(' ')}`);
        }
    }
    return result.join(' | ');
}
function createSideBySideComparison(oldChords, newChords, width = 40) {
    const oldStr = formatChordsForDisplay(oldChords);
    const newStr = formatChordsForDisplay(newChords);
    const oldLines = oldStr.split(' | ');
    const newLines = newStr.split(' | ');
    const maxLines = Math.max(oldLines.length, newLines.length);
    let output = '\n';
    output += '┌' + '─'.repeat(width) + '┬' + '─'.repeat(width) + '┐\n';
    output += '│' + ' 旧和弦进行'.padEnd(width - 1) + '│' + ' 新和弦进行'.padEnd(width - 1) + '│\n';
    output += '├' + '─'.repeat(width) + '┼' + '─'.repeat(width) + '┤\n';
    for (let i = 0; i < maxLines; i++) {
        const oldLine = oldLines[i] || '';
        const newLine = newLines[i] || '';
        const changed = oldLine !== newLine;
        const marker = changed ? '*' : ' ';
        output += '│' + marker + ' ' + oldLine.padEnd(width - 3) + '│' + marker + ' ' + newLine.padEnd(width - 3) + '│\n';
    }
    output += '└' + '─'.repeat(width) + '┴' + '─'.repeat(width) + '┘\n';
    output += '\n* = 有变更的行\n';
    return output;
}
function updateChordProgression(analysis, newProgressionStr, author) {
    const newChords = (0, analyzer_1.parseChordProgression)(newProgressionStr);
    const oldChords = [...analysis.chordProgression];
    const totalBars = newChords.length > 0 ? Math.max(...newChords.map(c => c.bar)) : 0;
    const { aligned, issues } = (0, analyzer_1.alignHarmony)(newChords);
    const motifs = (0, analyzer_1.detectMotifs)(newChords);
    const beatDrifts = totalBars > 0 ? (0, analyzer_1.detectBeatDriftDetailed)(totalBars, newChords) : [];
    const segments = totalBars > 0 ? (0, analyzer_1.generatePlaybackSegments)(totalBars) : [];
    const newStatus = beatDrifts.length > 0 ? 'draft' : 'corrected';
    const updated = {
        ...analysis,
        chordProgression: aligned,
        motifs,
        beatDrifts,
        harmonyIssues: issues,
        segments,
        status: newStatus,
        history: [
            ...analysis.history,
            {
                id: (0, analyzer_1.generateId)(),
                timestamp: new Date().toISOString(),
                action: 'corrected',
                author,
                description: '手动修正和弦进行',
                chordProgression: oldChords,
            },
        ],
    };
    return updated;
}
function updateNotes(analysis, newNotes, author) {
    const updated = {
        ...analysis,
        notes: newNotes,
        history: [
            ...analysis.history,
            {
                id: (0, analyzer_1.generateId)(),
                timestamp: new Date().toISOString(),
                action: 'noted',
                author,
                description: '更新备注',
            },
        ],
    };
    return updated;
}
function updateMetaData(analysis, updates, author) {
    const updated = {
        ...analysis,
        ...updates,
        hasMissingFields: !(updates.artist && updates.dateRecorded),
        history: [
            ...analysis.history,
            {
                id: (0, analyzer_1.generateId)(),
                timestamp: new Date().toISOString(),
                action: 'corrected',
                author,
                description: '更新元数据',
            },
        ],
    };
    return updated;
}
function markAsReviewed(analysis, author) {
    return {
        ...analysis,
        status: 'reviewed',
        history: [
            ...analysis.history,
            {
                id: (0, analyzer_1.generateId)(),
                timestamp: new Date().toISOString(),
                action: 'corrected',
                author,
                description: '标记为已审核',
            },
        ],
    };
}
function getChordHistory(analysis) {
    const history = [];
    let version = 1;
    analysis.history.forEach(entry => {
        if (entry.chordProgression) {
            history.push({
                version,
                timestamp: entry.timestamp,
                author: entry.author,
                chords: entry.chordProgression,
            });
            version++;
        }
    });
    history.push({
        version,
        timestamp: analysis.dateAnalyzed,
        author: 'current',
        chords: analysis.chordProgression,
    });
    return history;
}
