import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { Contract, ContractStatus } from "../entities/Contract";
import { ContractVersion } from "../entities/ContractVersion";
import {
  PaymentNode,
  PaymentNodeStatus,
  PaymentNodeType,
} from "../entities/PaymentNode";
import { PaymentNodeVersion } from "../entities/PaymentNodeVersion";
import { OperationTrace, OperationType } from "../entities/OperationTrace";
import { formatISO } from "date-fns";
import { v4 as uuidv4 } from "uuid";

export class ContractService {
  private contractRepo: Repository<Contract>;
  private contractVersionRepo: Repository<ContractVersion>;
  private paymentNodeRepo: Repository<PaymentNode>;
  private paymentNodeVersionRepo: Repository<PaymentNodeVersion>;
  private operationTraceRepo: Repository<OperationTrace>;

  constructor() {
    this.contractRepo = AppDataSource.getRepository(Contract);
    this.contractVersionRepo = AppDataSource.getRepository(ContractVersion);
    this.paymentNodeRepo = AppDataSource.getRepository(PaymentNode);
    this.paymentNodeVersionRepo = AppDataSource.getRepository(PaymentNodeVersion);
    this.operationTraceRepo = AppDataSource.getRepository(OperationTrace);
  }

  async createContract(
    data: Partial<Contract>,
    operator?: string
  ): Promise<Contract> {
    const contract = this.contractRepo.create({
      ...data,
      contractNo: data.contractNo || this.generateContractNo(),
      version: 1,
      createdBy: operator,
      updatedBy: operator,
    });

    const saved = await this.contractRepo.save(contract);

    await this.createContractVersion(saved, 1, "合同创建", operator);

    await this.traceOperation(
      "CREATE",
      "Contract",
      saved.id,
      null,
      JSON.stringify(saved),
      "创建合同",
      operator
    );

    return saved;
  }

  async updateContract(
    contractId: string,
    updates: Partial<Contract>,
    changeReason: string,
    operator?: string
  ): Promise<Contract> {
    const contract = await this.contractRepo.findOneBy({ id: contractId });
    if (!contract) throw new Error("合同不存在");

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

    await this.traceOperation(
      "UPDATE",
      "Contract",
      contractId,
      beforeSnapshot,
      JSON.stringify(saved),
      changeReason,
      operator
    );

    return saved;
  }

  async getContract(contractId: string): Promise<Contract | null> {
    return await this.contractRepo.findOne({
      where: { id: contractId, isDeleted: false },
      relations: ["paymentNodes", "versions"],
    });
  }

  async getContractByNo(contractNo: string): Promise<Contract | null> {
    return await this.contractRepo.findOne({
      where: { contractNo, isDeleted: false },
      relations: ["paymentNodes", "versions"],
    });
  }

  async addPaymentNode(
    contractId: string,
    nodeData: Partial<PaymentNode>,
    operator?: string
  ): Promise<PaymentNode> {
    const contract = await this.contractRepo.findOneBy({ id: contractId });
    if (!contract) throw new Error("合同不存在");

    const node = this.paymentNodeRepo.create({
      ...nodeData,
      contractId,
      version: 1,
      createdBy: operator,
      updatedBy: operator,
    });

    const saved = await this.paymentNodeRepo.save(node);

    await this.createPaymentNodeVersion(saved, 1, "添加付款节点", operator);

    await this.traceOperation(
      "CREATE",
      "PaymentNode",
      saved.id,
      null,
      JSON.stringify(saved),
      "添加付款节点",
      operator
    );

    return saved;
  }

  async updatePaymentNode(
    nodeId: string,
    updates: Partial<PaymentNode>,
    changeReason: string,
    operator?: string
  ): Promise<PaymentNode> {
    const node = await this.paymentNodeRepo.findOneBy({ id: nodeId });
    if (!node) throw new Error("付款节点不存在");

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

    await this.traceOperation(
      "UPDATE",
      "PaymentNode",
      nodeId,
      beforeSnapshot,
      JSON.stringify(saved),
      changeReason,
      operator
    );

    return saved;
  }

  async getPaymentNodes(contractId: string): Promise<PaymentNode[]> {
    return await this.paymentNodeRepo.find({
      where: { contractId, isDeleted: false },
      order: { sortOrder: "ASC", createdAt: "ASC" },
      relations: ["versions"],
    });
  }

  async getContractHistory(contractId: string): Promise<ContractVersion[]> {
    return await this.contractVersionRepo.find({
      where: { contractId },
      order: { version: "DESC" },
    });
  }

  async getPaymentNodeHistory(nodeId: string): Promise<PaymentNodeVersion[]> {
    return await this.paymentNodeVersionRepo.find({
      where: { paymentNodeId: nodeId },
      order: { version: "DESC" },
    });
  }

  async getContractWithAllRelations(contractId: string) {
    const contract = await this.getContract(contractId);
    if (!contract) return null;

    const paymentNodes = await this.getPaymentNodes(contractId);
    const history = await this.getContractHistory(contractId);

    return {
      contract,
      paymentNodes,
      history,
    };
  }

  async exportContractData(contractId: string) {
    const fullData = await this.getContractWithAllRelations(contractId);
    if (!fullData) throw new Error("合同不存在");

    const exportData = {
      exportTime: formatISO(new Date()),
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

    await this.traceOperation(
      "EXPORT",
      "Contract",
      contractId,
      null,
      JSON.stringify({ dataVersion: exportData.dataVersion }),
      "导出合同数据",
      "system"
    );

    return exportData;
  }

  private async createContractVersion(
    contract: Contract,
    version: number,
    changeReason: string,
    changedBy?: string
  ): Promise<ContractVersion> {
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

  private async createPaymentNodeVersion(
    node: PaymentNode,
    version: number,
    changeReason: string,
    changedBy?: string
  ): Promise<PaymentNodeVersion> {
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

  private async traceOperation(
    operationType: OperationType,
    entityType: string,
    entityId: string,
    beforeSnapshot: string | null,
    afterSnapshot: string | null,
    changeSummary: string,
    operator?: string
  ): Promise<any> {
    const trace: any = {
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

  private sanitizeContract(contract: Contract) {
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

  private sanitizePaymentNode(node: PaymentNode) {
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

  private generateContractNo(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const random = uuidv4().substring(0, 8).toUpperCase();
    return `HT-${year}${month}-${random}`;
  }
}
