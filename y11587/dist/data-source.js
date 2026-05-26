"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const Contract_1 = require("./entities/Contract");
const ContractVersion_1 = require("./entities/ContractVersion");
const PaymentNode_1 = require("./entities/PaymentNode");
const PaymentNodeVersion_1 = require("./entities/PaymentNodeVersion");
const AcceptanceEmail_1 = require("./entities/AcceptanceEmail");
const CustomerRemark_1 = require("./entities/CustomerRemark");
const ManualOpinion_1 = require("./entities/ManualOpinion");
const SupplementaryAgreement_1 = require("./entities/SupplementaryAgreement");
const RetryQueue_1 = require("./entities/RetryQueue");
const RetryLog_1 = require("./entities/RetryLog");
const DeadLetter_1 = require("./entities/DeadLetter");
const DirtyRecord_1 = require("./entities/DirtyRecord");
const OperationTrace_1 = require("./entities/OperationTrace");
const ExternalReceipt_1 = require("./entities/ExternalReceipt");
const CompensationRecord_1 = require("./entities/CompensationRecord");
const ExceptionPhoto_1 = require("./entities/ExceptionPhoto");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "sqlite",
    database: "./data/legal_contract.db",
    synchronize: true,
    logging: false,
    entities: [
        Contract_1.Contract,
        ContractVersion_1.ContractVersion,
        PaymentNode_1.PaymentNode,
        PaymentNodeVersion_1.PaymentNodeVersion,
        AcceptanceEmail_1.AcceptanceEmail,
        CustomerRemark_1.CustomerRemark,
        ManualOpinion_1.ManualOpinion,
        SupplementaryAgreement_1.SupplementaryAgreement,
        RetryQueue_1.RetryQueue,
        RetryLog_1.RetryLog,
        DeadLetter_1.DeadLetter,
        DirtyRecord_1.DirtyRecord,
        OperationTrace_1.OperationTrace,
        ExternalReceipt_1.ExternalReceipt,
        CompensationRecord_1.CompensationRecord,
        ExceptionPhoto_1.ExceptionPhoto,
    ],
    migrations: [],
    subscribers: [],
});
