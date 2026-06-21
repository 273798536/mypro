"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTimecode = parseTimecode;
exports.formatTimecode = formatTimecode;
exports.calculateTimecodeDeviation = calculateTimecodeDeviation;
exports.formatDeviation = formatDeviation;
exports.isDeviationHalfFrame = isDeviationHalfFrame;
function parseTimecode(tc) {
    const parts = tc.split(':');
    if (parts.length !== 4) {
        throw new Error(`无效时码格式: ${tc}, 应为 HH:MM:SS:FF`);
    }
    const [hours, minutes, seconds, frames] = parts.map(Number);
    return (hours * 3600 + minutes * 60 + seconds) * 1000 + Math.round((frames / 25) * 1000);
}
function formatTimecode(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const frames = Math.round(((ms % 1000) / 1000) * 25);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}
function calculateTimecodeDeviation(tc1, tc2) {
    return parseTimecode(tc1) - parseTimecode(tc2);
}
function formatDeviation(ms) {
    const absMs = Math.abs(ms);
    const direction = ms > 0 ? '晚' : ms < 0 ? '早' : '同步';
    if (absMs === 0)
        return '0ms (同步)';
    if (absMs < 1000)
        return `${absMs}ms (${direction})`;
    const seconds = (absMs / 1000).toFixed(2);
    return `${seconds}s (${direction})`;
}
function isDeviationHalfFrame(ms) {
    const halfFrameMs = 20;
    return Math.abs(ms) <= halfFrameMs && Math.abs(ms) > 0;
}
