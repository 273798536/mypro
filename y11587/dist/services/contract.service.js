"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractService = void 0;
const data_source_1 = require("../data-source");
const Contract_1 = require("../entities/Contract");
const ContractVersion_1 = require("../entities/ContractVersion");
const PaymentNode_1 = require("../entities/PaymentNode");
const PaymentNodeVersion_1 = require("../entities/PaymentNodeVersion");
const OperationTrace_1 = require("../entities/OperationTrace");
const date_fns_1 = require("date-fns");
const uuid_1 = require("uuid");
class ContractService {
    constructor() {
        this.contractRepo = data_source_1.AppDataSource.getRepository(Contract_1.Contract);
        this.contractVersionRepo = data_source_1.AppDataSource.getRepository(ContractVersion_1.ContractVersion);
        this.paymentNodeRepo = data_source_1.AppDataSource.getRepository(PaymentNode_1.PaymentNode);
        this.paymentNodeVersionRepo = data_source_1.AppDataSource.getRepository(PaymentNodeVersion_1.PaymentNodeVersion);
        this.operationTraceRepo = data_source_1.AppDataSource.getRepository(OperationTrace_1.OperationTrace);
    }
    async createContract(data, operator) {
        const contract = this.contractRepo.create({
            ...data,
            contractNo: data.contractNo || this.generateContractNo(),
            version: 1,
            createdBy: operator,
            updatedBy: operator,
        });
        const saved = await this.contractRepo.save(contract);
        await this.createContractVersion(saved, 1, "合同创建", operator);
        await this.traceOperation("CREATE", "Contract", saved.id, null, JSON.stringify(saved), "创建合同", operator);
        return saved;
    }
    async updateContract(contractId, updates, changeReason, operator) {
        const contract = await this.contractRepo.findOneBy({ id: contractId });
        if (!contract)
            throw new Error("合同不存在");
        const beforeSnapshot = JSON.stringify(contract);
        const oldVersion = contract.version;
        const newVersion = oldVersion + 1;
        Object.assign(contract, updates, {
            version: newVersion,
            updatedBy: operator,
            updatedAt: new Date(),
        });
        const saved = await this.contractRepo.save(contract);
        await this.createContractVersion(saved, newVersion, changeReason, operator);
        await this.traceOperation("UPDATE", "Contract", contractId, beforeSnapshot, JSON.stringify(saved), changeReason, operator);
        return saved;
    }
    async getContract(contractId) {
        return await this.contractRepo.findOne({
            where: { id: contractId, isDeleted: false },
            relations: ["paymentNodes", "versions"],
        });
    }
    async getContractByNo(contractNo) {
        return await this.contractRepo.findOne({
            where: { contractNo, isDeleted: false },
            relations: ["paymentNodes", "versions"],
        });
    }
    async addPaymentNode(contractId, nodeData, operator) {
        const contract = await this.contractRepo.findOneBy({ id: contractId });
        if (!contract)
            throw new Error("合同不存在");
        const node = this.paymentNodeRepo.create({
            ...nodeData,
            contractId,
            version: 1,
            createdBy: operator,
            updatedBy: operator,
        });
        const saved = await this.paymentNodeRepo.save(node);
        await this.createPaymentNodeVersion(saved, 1, "添加付款节点", operator);
        await this.traceOperation("CREATE", "PaymentNode", saved.id, null, JSON.stringify(saved), "添加付款节点", operator);
        return saved;
    }
    async updatePaymentNode(nodeId, updates, changeReason, operator) {
        const node = await this.paymentNodeRepo.findOneBy({ id: nodeId });
        if (!node)
            throw new Error("付款节点不存在");
        const beforeSnapshot = JSON.stringify(node);
        const oldVersion = node.version;
        const newVersion = oldVersion + 1;
        Object.assign(node, updates, {
            version: newVersion,
            updatedBy: operator,
            updatedAt: new Date(),
        });
        const saved = await this.paymentNodeRepo.save(node);
        await this.createPaymentNodeVersion(saved, newVersion, changeReason, operator);
        await this.traceOperation("UPDATE", "PaymentNode", nodeId, beforeSnapshot, JSON.stringify(saved), changeReason, operator);
        return saved;
    }
    async getPaymentNodes(contractId) {
        return await this.paymentNodeRepo.find({
            where: { contractId, isDeleted: false },
            order: { sortOrder: "ASC", createdAt: "ASC" },
            relations: ["versions"],
        });
    }
    async getContractHistory(contractId) {
        return await this.contractVersionRepo.find({
            where: { contractId },
            order: { version: "DESC" },
        });
    }
    async getPaymentNodeHistory(nodeId) {
        return await this.paymentNodeVersionRepo.find({
            where: { paymentNodeId: nodeId },
            order: { version: "DESC" },
        });
    }
    async getContractWithAllRelations(contractId) {
        const contract = await this.getContract(contractId);
        if (!contract)
            return null;
        const paymentNodes = await this.getPaymentNodes(contractId);
        const history = await this.getContractHistory(contractId);
        return {
            contract,
            paymentNodes,
            history,
        };
    }
    async exportContractData(contractId) {
        const fullData = await this.getContractWithAllRelations(contractId);
        if (!fullData)
            throw new Error("合同不存在");
        const exportData = {
            exportTime: (0, date_fns_1.formatISO)(new Date()),
            contract: this.sanitizeContract(fullData.contract),
            paymentNodes: fullData.paymentNodes.map((n) => this.sanitizePaymentNode(n)),
            history: fullData.history.map((h) => ({
                version: h.version,
                changeReason: h.changeReason,
                changedBy: h.changedBy,
                createdAt: h.createdAt,
            })),
            dataVersion: fullData.contract.version,
        };
        await this.traceOperation("EXPORT", "Contract", contractId, null, JSON.stringify({ dataVersion: exportData.dataVersion }), "导出合同数据", "system");
        return exportData;
    }
    async createContractVersion(contract, version, changeReason, changedBy) {
        const snapshot = {
            contractNo: contract.contractNo,
            contractName: contract.contractName,
            repairSection: contract.repairSection,
            partyA: contract.partyA,
            partyB: contract.partyB,
            totalAmount: contract.totalAmount,
            status: contract.status,
            signDate: contract.signDate,
            effectiveDate: contract.effectiveDate,
            expiryDate: contract.expiryDate,
            pdfPath: contract.pdfPath,
        };
        const versionRecord = this.contractVersionRepo.create({
            contractId: contract.id,
            version,
            snapshot: JSON.stringify(snapshot),
            changeReason,
            changedBy,
        });
        return await this.contractVersionRepo.save(versionRecord);
    }
    async createPaymentNodeVersion(node, version, changeReason, changedBy) {
        const snapshot = {
            nodeName: node.nodeName,
            nodeType: node.nodeType,
            amount: node.amount,
            percentage: node.percentage,
            expectedDate: node.expectedDate,
            actualDate: node.actualDate,
            status: node.status,
            remark: node.remark,
            sortOrder: node.sortOrder,
        };
        const versionRecord = this.paymentNodeVersionRepo.create({
            paymentNodeId: node.id,
            version,
            snapshot: JSON.stringify(snapshot),
            changeReason,
            changedBy,
        });
        return await this.paymentNodeVersionRepo.save(versionRecord);
    }
    async traceOperation(operationType, entityType, entityId, beforeSnapshot, afterSnapshot, changeSummary, operator) {
        const trace = {
            operationType,
            entityType,
            entityId,
            beforeSnapshot: beforeSnapshot || undefined,
            afterSnapshot: afterSnapshot || undefined,
            changeSummary,
            operator,
        };
        return await this.operationTraceRepo.save(trace);
    }
    sanitizeContract(contract) {
        return {
            id: contract.id,
            contractNo: contract.contractNo,
            contractName: contract.contractName,
            repairSection: contract.repairSection,
            partyA: contract.partyA,
            partyB: contract.partyB,
            totalAmount: contract.totalAmount,
            status: contract.status,
            signDate: contract.signDate,
            effectiveDate: contract.effectiveDate,
            expiryDate: contract.expiryDate,
            version: contract.version,
            createdAt: contract.createdAt,
            updatedAt: contract.updatedAt,
        };
    }
    sanitizePaymentNode(node) {
        return {
            id: node.id,
            nodeName: node.nodeName,
            nodeType: node.nodeType,
            amount: node.amount,
            percentage: node.percentage,
            expectedDate: node.expectedDate,
            actualDate: node.actualDate,
            status: node.status,
            remark: node.remark,
            sortOrder: node.sortOrder,
            version: node.version,
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
        };
    }
    generateContractNo() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const random = (0, uuid_1.v4)().substring(0, 8).toUpperCase();
        return `HT-${year}${month}-${random}`;
    }
}
exports.ContractService = ContractService;
