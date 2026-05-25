import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { WorkOrder } from "../entities/WorkOrder";
import { ValveInventory } from "../entities/ValveInventory";
import { MaterialUsage } from "../entities/MaterialUsage";
import { SupplierBill } from "../entities/SupplierBill";
import { BillItem } from "../entities/BillItem";
import { SitePhoto, PhotoType } from "../entities/SitePhoto";
import { ApprovalEmail } from "../entities/ApprovalEmail";
import { DirtyRecordService } from "../services/DirtyRecordService";
import moment from "moment";

const MATERIALS = [
  { code: "VLV-001", name: "DN50闸阀", spec: "DN50,1.6MPa", unit: "个", price: 280.0 },
  { code: "VLV-002", name: "DN80闸阀", spec: "DN80,1.6MPa", unit: "个", price: 450.0 },
  { code: "VLV-003", name: "DN100闸阀", spec: "DN100,1.6MPa", unit: "个", price: 680.0 },
  { code: "PIPE-001", name: "PE管DN50", spec: "DN50,1.0MPa", unit: "米", price: 85.0 },
  { code: "PIPE-002", name: "PE管DN80", spec: "DN80,1.0MPa", unit: "米", price: 120.0 },
  { code: "FIT-001", name: "弯头DN50", spec: "90度", unit: "个", price: 25.0 },
  { code: "FIT-002", name: "三通DN50", spec: "等径", unit: "个", price: 35.0 },
  { code: "SEAL-001", name: "橡胶密封圈", spec: "DN50", unit: "个", price: 8.5 },
];

async function seed() {
  await AppDataSource.initialize();
  console.log("开始造数...");

  const workOrderRepo = AppDataSource.getRepository(WorkOrder);
  const inventoryRepo = AppDataSource.getRepository(ValveInventory);
  const materialUsageRepo = AppDataSource.getRepository(MaterialUsage);
  const billRepo = AppDataSource.getRepository(SupplierBill);
  const billItemRepo = AppDataSource.getRepository(BillItem);
  const sitePhotoRepo = AppDataSource.getRepository(SitePhoto);
  const approvalEmailRepo = AppDataSource.getRepository(ApprovalEmail);
  const dirtyRecordService = new DirtyRecordService();

  for (let i = 1; i <= 5; i++) {
    const isNightShift = i <= 2;
    const reportDate = isNightShift
      ? moment().subtract(i, "days").hour(23).minute(30)
      : moment().subtract(i, "days").hour(9).minute(15);

    const completeDate = isNightShift
      ? moment(reportDate).add(3, "hours")
      : moment(reportDate).add(4, "hours");

    const workOrder = new WorkOrder();
    workOrder.orderNo = `WO${moment().format("YYYYMMDD")}${String(i).padStart(4, "0")}`;
    workOrder.siteName = `站点${["A", "B", "C", "D", "E"][i - 1]}区`;
    workOrder.siteAddress = `XX街道${i * 100}号`;
    workOrder.reporter = `用户${i}`;
    workOrder.reporterPhone = `138${String(10000000 + i).slice(0, 8)}`;
    workOrder.reportTime = reportDate.toDate();
    workOrder.dispatchTime = moment(reportDate).add(15, "minutes").toDate();
    workOrder.repairTeam = isNightShift ? "夜间抢修1队" : "抢修队";
    workOrder.teamLeader = isNightShift ? "李夜" : "张队";
    workOrder.faultDescription = ["主管道漏水", "阀门损坏", "接头漏水", "水压异常", "水表故障"][i - 1];
    workOrder.status = "completed";
    workOrder.repairContent = "已更换损坏部件，恢复供水";
    workOrder.completeTime = completeDate.toDate();
    workOrder.laborCost = isNightShift ? 800 : 500;
    workOrder.approver = "王主管";
    workOrder.approvalTime = moment(completeDate).add(1, "day").toDate();
    workOrder.approvalRemark = "同意";

    const savedWO = await workOrderRepo.save(workOrder);
    console.log(`创建工单: ${savedWO.orderNo} (${isNightShift ? "夜间抢修" : "常规抢修"})`);

    const materialsCount = 2 + Math.floor(Math.random() * 3);
    const selectedMaterials = MATERIALS.slice(0, materialsCount);
    let totalAmount = 0;

    for (let j = 0; j < selectedMaterials.length; j++) {
      const mat = selectedMaterials[j];
      const qty = 1 + Math.floor(Math.random() * 5);
      const amount = qty * mat.price;
      totalAmount += amount;

      const usage = new MaterialUsage();
      usage.workOrderId = savedWO.id;
      usage.materialCode = mat.code;
      usage.materialName = mat.name;
      usage.specification = mat.spec;
      usage.unit = mat.unit;
      usage.quantity = qty;
      usage.unitPrice = mat.price;
      usage.totalAmount = amount;
      usage.usageTime = completeDate.toDate();
      usage.remark = isNightShift ? "夜间抢修用料" : "抢修用料";
      await materialUsageRepo.save(usage);
      await dirtyRecordService.validateMaterialUsage(usage);
    }

    await workOrderRepo.update(savedWO.id, { materialTotalAmount: totalAmount });

    if (isNightShift) {
      console.log(`  [夜间补录] 工单${savedWO.orderNo}现场用料，库存次日补录`);
    }

    for (let j = 0; j < selectedMaterials.length; j++) {
      const mat = selectedMaterials[j];
      const qty = 1 + Math.floor(Math.random() * 5);

      const inv = new ValveInventory();
      inv.materialCode = mat.code;
      inv.materialName = mat.name;
      inv.specification = mat.spec;
      inv.unit = mat.unit;
      inv.unitPrice = mat.price;
      inv.quantity = qty;
      inv.operation = "out";
      inv.operationTime = isNightShift
        ? moment(completeDate).add(1, "day").hour(8).minute(0).toDate()
        : completeDate.toDate();
      inv.balanceAfter = 10 + Math.floor(Math.random() * 20) - qty;
      inv.warehouse = "中心仓库";
      inv.operator = isNightShift ? "补录员" : "仓管员";
      inv.workOrderNo = savedWO.orderNo;
      inv.remark = isNightShift ? "夜间抢修用料次日补录" : "抢修出库";
      if (isNightShift) {
        inv.isBackfilled = true;
        inv.backfillTime = new Date();
      }
      await inventoryRepo.save(inv);
      await dirtyRecordService.validateInventory(inv);
    }

    const bill = new SupplierBill();
    bill.billNo = `BILL${moment().format("YYYYMMDD")}${String(i).padStart(4, "0")}`;
    bill.supplierName = "水务材料供应商";
    bill.supplierCode = "SUP001";
    bill.billDate = moment().subtract(i, "days").toDate();
    bill.dueDate = moment().add(30, "days").toDate();
    bill.status = "submitted";
    bill.submitter = "供应商业务员";
    bill.submitTime = new Date().toISOString();

    let billTotal = 0;
    const billItems: BillItem[] = [];
    for (let j = 0; j < selectedMaterials.length; j++) {
      const mat = selectedMaterials[j];
      const qty = 1 + Math.floor(Math.random() * 5);
      const amount = qty * mat.price;
      billTotal += amount;

      const item = new BillItem();
      item.materialCode = mat.code;
      item.materialName = mat.name;
      item.specification = mat.spec;
      item.unit = mat.unit;
      item.quantity = qty;
      item.unitPrice = mat.price;
      item.totalAmount = amount;
      item.workOrderNo = savedWO.orderNo;
      billItems.push(item);
    }
    bill.totalAmount = billTotal;
    bill.items = billItems;
    await billRepo.save(bill);

    await dirtyRecordService.validateWorkOrder(savedWO);

    const photoTypes: PhotoType[] = ["before_repair", "during_repair", "after_repair", "material_usage"];
    for (let p = 0; p < 4; p++) {
      const photo = new SitePhoto();
      photo.workOrderId = savedWO.id;
      photo.photoType = photoTypes[p];
      photo.fileName = `${savedWO.orderNo}_${photoTypes[p]}.jpg`;
      photo.filePath = `/uploads/photos/${savedWO.orderNo}_${photoTypes[p]}.jpg`;
      photo.fileSize = 1024 * 1024 * (1 + Math.floor(Math.random() * 3));
      photo.mimeType = "image/jpeg";
      photo.captureTime = completeDate.toDate();
      photo.uploader = isNightShift ? "李夜" : "张队";
      photo.latitude = 31.2304 + Math.random() * 0.1;
      photo.longitude = 121.4737 + Math.random() * 0.1;
      photo.description = `${["抢修前", "抢修中", "抢修后", "材料使用"][p]}照片`;
      photo.rawData = { ...photo };
      await sitePhotoRepo.save(photo);
    }
    console.log(`  [现场照片] 上传${isNightShift ? "夜间" : ""}抢修照片4张`);

    const email = new ApprovalEmail();
    email.workOrderNo = savedWO.orderNo;
    email.messageId = `MSG-${savedWO.orderNo}-001`;
    email.subject = `【抢修审批】${savedWO.orderNo} ${savedWO.siteName} ${savedWO.faultDescription}`;
    email.from = `${isNightShift ? "李夜" : "张队"} <repair@water.com>`;
    email.to = "王主管 <approver@water.com>";
    email.cc = "调度中心 <dispatch@water.com>";
    email.body = `
工单编号: ${savedWO.orderNo}
站点: ${savedWO.siteName}
报修人: ${savedWO.reporter}
故障描述: ${savedWO.faultDescription}
抢修内容: ${savedWO.repairContent}
人工费用: ${savedWO.laborCost}元
材料费用: ${totalAmount}元

请审批。

${isNightShift ? "注：此为夜间抢修工单，已先用料后补录。" : ""}
    `.trim();
    email.sentTime = moment(completeDate).add(10, "minutes").toDate();
    email.receivedTime = moment(completeDate).add(12, "minutes").toDate();
    email.approvalStatus = "approved";
    email.approvalComment = "同意，已紧急处理";
    email.approvalTime = moment(completeDate).add(30, "minutes").toDate();
    email.approver = "王主管";
    email.rawData = { ...email };
    await approvalEmailRepo.save(email);
    console.log(`  [审批邮件] 发送审批邮件1封，状态: 已批准`);
  }

  const dirtyInventory = new ValveInventory();
  dirtyInventory.materialCode = "VLV-001";
  dirtyInventory.materialName = "闸阀DN50(错误名称)";
  dirtyInventory.specification = "DN50";
  dirtyInventory.unit = "个";
  dirtyInventory.unitPrice = 280;
  dirtyInventory.quantity = 10;
  dirtyInventory.operation = "out";
  dirtyInventory.operationTime = new Date();
  dirtyInventory.balanceAfter = -5;
  dirtyInventory.workOrderNo = "WO000";
  await inventoryRepo.save(dirtyInventory);
  await dirtyRecordService.validateInventory(dirtyInventory);
  console.log("创建含错误的库存记录（负库存 + 名称不一致）");

  console.log("\n造数完成!");
  console.log("- 工单: 5个（含2个夜间抢修工单）");
  console.log("- 库存记录: 自动生成");
  console.log("- 材料使用: 自动生成");
  console.log("- 供应商对账单: 5个");
  console.log("- 现场照片: 20张（每工单4张）");
  console.log("- 审批邮件: 5封");
  console.log("- 异常记录: 自动识别");

  process.exit(0);
}

seed().catch(console.error);
