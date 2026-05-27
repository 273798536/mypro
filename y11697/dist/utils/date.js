"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATE_FORMAT = void 0;
exports.formatDate = formatDate;
exports.parseDate = parseDate;
exports.getDateRange = getDateRange;
exports.isDateInRange = isDateInRange;
exports.getShiftHours = getShiftHours;
exports.isNightShift = isNightShift;
exports.getConsecutiveDays = getConsecutiveDays;
const date_fns_1 = require("date-fns");
exports.DATE_FORMAT = 'yyyy-MM-dd';
function formatDate(date) {
    if (typeof date === 'string') {
        return date;
    }
    return (0, date_fns_1.format)(date, exports.DATE_FORMAT);
}
function parseDate(dateStr) {
    return (0, date_fns_1.parseISO)(dateStr);
}
function getDateRange(startDate, endDate) {
    const dates = [];
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const days = (0, date_fns_1.differenceInDays)(end, start);
    for (let i = 0; i <= days; i++) {
        dates.push(formatDate((0, date_fns_1.addDays)(start, i)));
    }
    return dates;
}
function isDateInRange(date, startDate, endDate) {
    return (0, date_fns_1.isWithinInterval)(parseDate(date), {
        start: parseDate(startDate),
        end: parseDate(endDate)
    });
}
function getShiftHours(shiftType) {
    const hours = {
        morning: 8,
        afternoon: 8,
        night: 8,
        off: 0
    };
    return hours[shiftType] || 0;
}
function isNightShift(shiftType) {
    return shiftType === 'night';
}
function getConsecutiveDays(dates, targetDate, direction = 'both') {
    const sortedDates = [...dates].sort();
    const targetIndex = sortedDates.findIndex(d => (0, date_fns_1.isSameDay)(parseDate(d), parseDate(targetDate)));
    if (targetIndex === -1)
        return [];
    const consecutive = [];
    if (direction === 'before' || direction === 'both') {
        let i = targetIndex - 1;
        while (i >= 0) {
            const expectedDate = formatDate((0, date_fns_1.addDays)(parseDate(targetDate), -(targetIndex - i)));
            if (sortedDates[i] === expectedDate) {
                consecutive.push(sortedDates[i]);
                i--;
            }
            else {
                break;
            }
        }
    }
    if (direction === 'after' || direction === 'both') {
        let i = targetIndex + 1;
        while (i < sortedDates.length) {
            const expectedDate = formatDate((0, date_fns_1.addDays)(parseDate(targetDate), i - targetIndex));
            if (sortedDates[i] === expectedDate) {
                consecutive.push(sortedDates[i]);
                i++;
            }
            else {
                break;
            }
        }
    }
    return consecutive;
}
//# sourceMappingURL=date.js.map