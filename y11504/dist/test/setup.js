"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
afterAll(async () => {
    if (global.__DATA_SOURCE__) {
        try {
            await global.__DATA_SOURCE__.destroy();
        }
        catch (e) {
        }
    }
});
//# sourceMappingURL=setup.js.map