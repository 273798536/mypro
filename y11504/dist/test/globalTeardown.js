"use strict";
module.exports = async () => {
    if (global.__DATA_SOURCE__) {
        await global.__DATA_SOURCE__.destroy();
    }
};
//# sourceMappingURL=globalTeardown.js.map