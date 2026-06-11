import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { Review } from "../entity/Review";
import { Collision } from "../entity/Collision";
import { ReviewHistory } from "../entity/ReviewHistory";
import { ViewConfig } from "../entity/ViewConfig";
import { ExportOptions } from "../types";
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { Parser } from "json2csv";
import { HistoryService } from "./HistoryService";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { join } from "path";

export class ExportService {
  private reviewRepository: Repository<Review>;
  private historyService: HistoryService;
  private exportDir: string;

  constructor() {
    this.reviewRepository = AppDataSource.getRepository(Review);
    this.historyService = new HistoryService();
    this.exportDir = join(__dirname, "../../exports");
    if (!existsSync(this.exportDir)) {
      mkdirSync(this.exportDir, { recursive: true });
    }
  }

  async exportReview(
    reviewId: string,
    options: ExportOptions,
    operator: string = "运营主管"
  ): Promise<{ filePath: string; fileName: string }> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ["cadLayers", "materials", "collisions", "histories", "viewConfigs"]
    });

    if (!review) {
      throw new Error("预审记录不存在");
    }

    await this.historyService.addHistory(reviewId, "export", {
      operator,
      description: `导出${options.format.toUpperCase()}格式文件`
    });

    let result: { filePath: string; fileName: string };

    switch (options.format) {
      case "pdf":
        result = await this.exportToPDF(review, options);
        break;
      case "excel":
        result = await this.exportToExcel(review, options);
        break;
      case "csv":
        result = await this.exportToCSV(review, options);
        break;
      default:
        throw new Error("不支持的导出格式");
    }

    return result;
  }

  private async exportToPDF(
    review: Review,
    options: ExportOptions
  ): Promise<{ filePath: string; fileName: string }> {
    const fileName = `${review.code}_碰撞预审报告.pdf`;
    const filePath = join(this.exportDir, fileName);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = createWriteStream(filePath);

      doc.pipe(stream);

      doc.fontSize(20).text("数据中心冷通道碰撞预审报告", { align: "center" });
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`预审编号: ${review.code}`);
      doc.text(`预审名称: ${review.name}`);
      doc.text(`预审状态: ${this.getStatusText(review.status)}`);
      doc.text(`预审结论: ${this.getConclusionText(review.conclusion)}`);
      doc.text(`运营备注: ${review.operatorRemark || "无"}`);
      doc.text(`导出时间: ${new Date().toLocaleString("zh-CN")}`);
      doc.moveDown();
      
      doc.fontSize(16).text("一、CAD图层信息");
      doc.fontSize(10);
      review.cadLayers.forEach((layer, idx) => {
        doc.text(`${idx + 1}. ${layer.name} (版本: ${layer.version})${layer.isOldVersion ? " ⚠️ 版本过旧" : ""}`);
      });
      doc.moveDown();

      doc.fontSize(16).text("二、材料清单");
      doc.fontSize(10);
      review.materials.forEach((material, idx) => {
        const issues = [];
        if (material.isNameMismatch) issues.push("名称不一致");
        if (material.isUnitMixed) issues.push("单位混用");
        const issueText = issues.length > 0 ? ` ⚠️ ${issues.join("、")}` : "";
        doc.text(`${idx + 1}. ${material.name} - ${material.quantity}${material.unit}${issueText}`);
      });
      doc.moveDown();

      if (options.includeCollisions && review.collisions.length > 0) {
        doc.fontSize(16).text("三、异常检测结果");
        doc.fontSize(10);
        const severityMap = { high: "高", medium: "中", low: "低" };
        review.collisions.forEach((collision, idx) => {
          doc.text(`${idx + 1}. [${severityMap[collision.severity]}] ${collision.description}`);
          doc.text(`   位置: ${collision.location || "无"}`);
          doc.text(`   影响: ${collision.impactOnConclusion}`);
          doc.text(`   状态: ${collision.isConfirmed ? "已确认" : "待确认"}`);
          if (collision.isConfirmed) {
            doc.text(`   确认人: ${collision.confirmedBy}`);
          }
        });
        doc.moveDown();
      }

      if (options.includeHistory && review.histories.length > 0) {
        doc.addPage();
        doc.fontSize(16).text("四、历史变更记录");
        doc.fontSize(10);
        const actionMap: Record<string, string> = {
          create: "创建", update: "更新", confirm_collision: "确认异常",
          update_remark: "更新备注", export: "导出",
          status_change: "状态变更", conclusion_change: "结论变更"
        };
        review.histories.slice(0, 20).forEach((history, idx) => {
          const time = history.createdAt.toLocaleString("zh-CN");
          const action = actionMap[history.action] || history.action;
          doc.text(`${idx + 1}. [${time}] ${history.operator} - ${action}`);
          if (history.description) {
            doc.text(`   ${history.description}`);
          }
        });
      }

      doc.end();

      stream.on("finish", () => {
        resolve({ filePath, fileName });
      });

      stream.on("error", reject);
    });
  }

  private async exportToExcel(
    review: Review,
    options: ExportOptions
  ): Promise<{ filePath: string; fileName: string }> {
    const fileName = `${review.code}_碰撞预审报告.xlsx`;
    const filePath = join(this.exportDir, fileName);

    const wb = XLSX.utils.book_new();

    const basicData = [
      { 项目: "预审编号", 值: review.code },
      { 项目: "预审名称", 值: review.name },
      { 项目: "预审状态", 值: this.getStatusText(review.status) },
      { 项目: "预审结论", 值: this.getConclusionText(review.conclusion) },
      { 项目: "运营备注", 值: review.operatorRemark || "无" },
      { 项目: "导出时间", 值: new Date().toLocaleString("zh-CN") }
    ];
    const ws1 = XLSX.utils.json_to_sheet(basicData);
    XLSX.utils.book_append_sheet(wb, ws1, "基本信息");

    const layerData = review.cadLayers.map(layer => ({
      图层名称: layer.name,
      版本: layer.version,
      类型: layer.layerType || "",
      是否旧版: layer.isOldVersion ? "是" : "否",
      问题描述: layer.issueDescription || ""
    }));
    const ws2 = XLSX.utils.json_to_sheet(layerData);
    XLSX.utils.book_append_sheet(wb, ws2, "CAD图层");

    const materialData = review.materials.map(material => ({
      材料名称: material.name,
      标准名称: material.standardName || "",
      单位: material.unit,
      数量: material.quantity,
      楼层: material.floor || "",
      名称不一致: material.isNameMismatch ? "是" : "否",
      单位混用: material.isUnitMixed ? "是" : "否",
      问题描述: material.issueDescription || ""
    }));
    const ws3 = XLSX.utils.json_to_sheet(materialData);
    XLSX.utils.book_append_sheet(wb, ws3, "材料清单");

    if (options.includeCollisions && review.collisions.length > 0) {
      const severityMap = { high: "高", medium: "中", low: "低" };
      const collisionData = review.collisions.map(collision => ({
        异常类型: this.getCollisionTypeText(collision.type),
        严重程度: severityMap[collision.severity],
        描述: collision.description,
        位置: collision.location || "",
        对结论的影响: collision.impactOnConclusion,
        状态: collision.isConfirmed ? "已确认" : "待确认",
        确认人: collision.confirmedBy || ""
      }));
      const ws4 = XLSX.utils.json_to_sheet(collisionData);
      XLSX.utils.book_append_sheet(wb, ws4, "异常检测");
    }

    XLSX.writeFile(wb, filePath);

    return { filePath, fileName };
  }

  private async exportToCSV(
    review: Review,
    options: ExportOptions
  ): Promise<{ filePath: string; fileName: string }> {
    const fileName = `${review.code}_碰撞预审报告.csv`;
    const filePath = join(this.exportDir, fileName);

    const severityMap = { high: "高", medium: "中", low: "低" };
    const data = review.collisions.map(collision => ({
      预审编号: review.code,
      预审名称: review.name,
      异常类型: this.getCollisionTypeText(collision.type),
      严重程度: severityMap[collision.severity],
      描述: collision.description,
      位置: collision.location || "",
      对结论的影响: collision.impactOnConclusion,
      状态: collision.isConfirmed ? "已确认" : "待确认",
      确认人: collision.confirmedBy || "",
      运营备注: review.operatorRemark || ""
    }));

    const parser = new Parser();
    const csv = parser.parse(data);
    
    const fs = require("fs");
    fs.writeFileSync(filePath, "\ufeff" + csv);

    return { filePath, fileName };
  }

  private getStatusText(status: string): string {
    const map: Record<string, string> = {
      pending: "待处理",
      processing: "处理中",
      completed: "已完成",
      has_issues: "存在问题"
    };
    return map[status] || status;
  }

  private getConclusionText(conclusion: string): string {
    const map: Record<string, string> = {
      pass: "通过",
      fail: "不通过",
      pending: "待判定"
    };
    return map[conclusion] || conclusion;
  }

  private getCollisionTypeText(type: string): string {
    const map: Record<string, string> = {
      old_cad_layer: "旧版CAD图层",
      material_name_mismatch: "材料名称不一致",
      unit_mixed: "单位混用",
      floor_unit_mismatch: "楼层格式不统一",
      verbal_remark: "口头备注",
      other: "其他"
    };
    return map[type] || type;
  }
}
