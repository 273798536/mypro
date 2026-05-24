"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmationParser = exports.CancellationParser = exports.AccessParser = exports.BookingParser = exports.BaseParser = void 0;
exports.getParser = getParser;
const bookingParser_1 = require("./bookingParser");
const accessParser_1 = require("./accessParser");
const cancellationParser_1 = require("./cancellationParser");
const confirmationParser_1 = require("./confirmationParser");
function getParser(sourceType) {
    switch (sourceType) {
        case 'booking':
            return new bookingParser_1.BookingParser();
        case 'access':
            return new accessParser_1.AccessParser();
        case 'cancellation':
            return new cancellationParser_1.CancellationParser();
        case 'confirmation':
            return new confirmationParser_1.ConfirmationParser();
        default:
            throw new Error(`未知的数据源类型: ${sourceType}`);
    }
}
var baseParser_1 = require("./baseParser");
Object.defineProperty(exports, "BaseParser", { enumerable: true, get: function () { return baseParser_1.BaseParser; } });
var bookingParser_2 = require("./bookingParser");
Object.defineProperty(exports, "BookingParser", { enumerable: true, get: function () { return bookingParser_2.BookingParser; } });
var accessParser_2 = require("./accessParser");
Object.defineProperty(exports, "AccessParser", { enumerable: true, get: function () { return accessParser_2.AccessParser; } });
var cancellationParser_2 = require("./cancellationParser");
Object.defineProperty(exports, "CancellationParser", { enumerable: true, get: function () { return cancellationParser_2.CancellationParser; } });
var confirmationParser_2 = require("./confirmationParser");
Object.defineProperty(exports, "ConfirmationParser", { enumerable: true, get: function () { return confirmationParser_2.ConfirmationParser; } });
//# sourceMappingURL=index.js.map