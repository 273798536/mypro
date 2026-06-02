import Papa from "papaparse";
import type {
  SalesRecord,
  PromoCalendar,
  InventorySnapshot,
  OutOfStockRecord,
} from "@/types";

function pick<T extends Record<string, unknown>>(
  row: Record<string, string>,
  keys: string[],
  fallback = ""
): string {
  for (const k of keys) {
    const lower = k.toLowerCase();
    for (const hdr of Object.keys(row)) {
      if (hdr.toLowerCase().replace(/[\s_-]/g, "") === lower.replace(/[\s_-]/g, "")) {
        const v = row[hdr];
        return v ?? fallback;
      }
    }
  }
  return fallback;
}

function num(v: string, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const SALES_KEYS = {
  skuId: ["sku_id", "skuid", "sku", "商品编号", "SKU"],
  saleDate: ["sale_date", "saledate", "date", "销售日期", "日期"],
  saleQty: ["sale_qty", "saleqty", "qty", "quantity", "销量", "销售数量"],
  remark: ["remark", "note", "备注", "说明"],
  remarkVersion: ["remark_version", "remarkversion", "version", "备注版本", "版本"],
  updatedAt: ["updated_at", "updatedat", "更新时间"],
};

const PROMO_KEYS = {
  calendarId: ["calendar_id", "calendarid", "id", "促销编号"],
  version: ["version", "版本"],
  startDate: ["start_date", "startdate", "开始日期", "开始"],
  endDate: ["end_date", "enddate", "结束日期", "结束"],
  promoType: ["promo_type", "promotype", "type", "促销类型"],
  promoName: ["promo_name", "promoname", "name", "促销名称"],
  discountRate: ["discount_rate", "discountrate", "rate", "折扣率"],
};

const INVENTORY_KEYS = {
  skuId: ["sku_id", "skuid", "sku", "商品编号", "SKU"],
  snapshotDate: ["snapshot_date", "snapshotdate", "date", "快照日期", "日期"],
  onHandQty: ["on_hand_qty", "onhandqty", "on_hand", "在手数量", "库存量"],
  inTransitQty: ["in_transit_qty", "intransitqty", "in_transit", "在途数量"],
  availableQty: ["available_qty", "availableqty", "available", "可用数量"],
  conclusion: ["conclusion", "结论", "库存结论", "状态"],
};

const OOS_KEYS = {
  recordId: ["record_id", "recordid", "id", "编号"],
  skuId: ["sku_id", "skuid", "sku", "商品编号", "SKU"],
  oosDate: ["oos_date", "oosdate", "date", "缺货日期", "日期"],
  oosQty: ["oos_qty", "oosqty", "qty", "缺货数量"],
  lostSalesEst: ["lost_sales_est", "lostsalesest", "lost_sales", "预估损失"],
  source: ["source", "来源", "数据源"],
  evidenceType: ["evidence_type", "evidencetype", "type", "证据类型"],
};

export function parseSalesCSV(text: string): SalesRecord[] {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  return result.data.map((row) => ({
    skuId: pick(row, SALES_KEYS.skuId),
    saleDate: pick(row, SALES_KEYS.saleDate),
    saleQty: num(pick(row, SALES_KEYS.saleQty)),
    remark: pick(row, SALES_KEYS.remark, "正常销售"),
    remarkVersion: pick(row, SALES_KEYS.remarkVersion, "v1"),
    updatedAt: pick(row, SALES_KEYS.updatedAt, new Date().toISOString()),
  }));
}

export function parsePromoCSV(text: string): PromoCalendar[] {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  return result.data.map((row, i) => ({
    calendarId: pick(row, PROMO_KEYS.calendarId, `P-${String(i + 1).padStart(3, "0")}`),
    version: num(pick(row, PROMO_KEYS.version), 1),
    startDate: pick(row, PROMO_KEYS.startDate),
    endDate: pick(row, PROMO_KEYS.endDate),
    promoType: pick(row, PROMO_KEYS.promoType, "未指定"),
    promoName: pick(row, PROMO_KEYS.promoName, "未命名促销"),
    discountRate: num(pick(row, PROMO_KEYS.discountRate), 1),
  }));
}

export function parseInventoryCSV(text: string): InventorySnapshot[] {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  return result.data.map((row) => {
    const onHand = num(pick(row, INVENTORY_KEYS.onHandQty));
    const inTransit = num(pick(row, INVENTORY_KEYS.inTransitQty));
    const available = num(pick(row, INVENTORY_KEYS.availableQty), onHand + inTransit);
    let conclusion = pick(row, INVENTORY_KEYS.conclusion);
    if (!conclusion) {
      if (onHand < 0) conclusion = "负库存";
      else if (available < 20) conclusion = "严重缺货";
      else if (available < 50) conclusion = "库存偏低";
      else if (available < 100) conclusion = "库存适中";
      else conclusion = "库存充足";
    }
    return {
      skuId: pick(row, INVENTORY_KEYS.skuId),
      snapshotDate: pick(row, INVENTORY_KEYS.snapshotDate),
      onHandQty: onHand,
      inTransitQty: inTransit,
      availableQty: available,
      conclusion,
    };
  });
}

export function parseOOSCSV(text: string): OutOfStockRecord[] {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  return result.data.map((row, i) => ({
    recordId: pick(row, OOS_KEYS.recordId, `OOS-${String(i + 1).padStart(3, "0")}`),
    skuId: pick(row, OOS_KEYS.skuId),
    oosDate: pick(row, OOS_KEYS.oosDate),
    oosQty: num(pick(row, OOS_KEYS.oosQty)),
    lostSalesEst: num(pick(row, OOS_KEYS.lostSalesEst)),
    source: pick(row, OOS_KEYS.source, "CSV导入"),
    evidenceType: pick(row, OOS_KEYS.evidenceType, "shortage"),
  }));
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file, "utf-8");
  });
}
