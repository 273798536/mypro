"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const path = __importStar(require("path"));
const Review_1 = require("./entity/Review");
const CadLayer_1 = require("./entity/CadLayer");
const Material_1 = require("./entity/Material");
const Collision_1 = require("./entity/Collision");
const Remark_1 = require("./entity/Remark");
const ReviewHistory_1 = require("./entity/ReviewHistory");
const ViewConfig_1 = require("./entity/ViewConfig");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "sqlite",
    database: path.resolve(__dirname, "../data/app.db"),
    synchronize: true,
    logging: false,
    entities: [Review_1.Review, CadLayer_1.CadLayer, Material_1.Material, Collision_1.Collision, Remark_1.Remark, ReviewHistory_1.ReviewHistory, ViewConfig_1.ViewConfig],
    migrations: [],
    subscribers: [],
});
