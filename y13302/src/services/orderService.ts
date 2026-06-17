import type { WorkOrder, Screenshot, SupplementNote, SourceType } from "@/types";
import { storage } from "@/services/storage";
import { uid } from "@/utils/helpers";

export const orderService = {
  getAll(): WorkOrder[] {
    const data = storage.load();
    return data.work_orders.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  getById(id: string): WorkOrder | undefined {
    return storage.load().work_orders.find((o) => o.id === id);
  },

  getBySource(source: SourceType | "all"): WorkOrder[] {
    const all = this.getAll();
    if (source === "all") return all;
    return all.filter((o) => o.source_type === source);
  },

  getByStatus(status: string): WorkOrder[] {
    return this.getAll().filter((o) => o.status === status);
  },

  updateStatus(
    id: string,
    status: "confirmed" | "revoked",
    confirmedSummary?: string
  ): WorkOrder | undefined {
    const data = storage.load();
    const idx = data.work_orders.findIndex((o) => o.id === id);
    if (idx === -1) return undefined;
    data.work_orders[idx].status = status;
    data.work_orders[idx].updated_at = new Date().toISOString();
    if (confirmedSummary !== undefined) {
      data.work_orders[idx].confirmed_summary = confirmedSummary;
    }
    storage.save(data);
    return data.work_orders[idx];
  },

  revertToPending(id: string): WorkOrder | undefined {
    const data = storage.load();
    const idx = data.work_orders.findIndex((o) => o.id === id);
    if (idx === -1) return undefined;
    data.work_orders[idx].status = "pending";
    data.work_orders[idx].updated_at = new Date().toISOString();
    storage.save(data);
    return data.work_orders[idx];
  },

  create(newOrder: Omit<WorkOrder, "id" | "created_at" | "updated_at" | "status">): WorkOrder {
    const data = storage.load();
    const order: WorkOrder = {
      ...newOrder,
      id: uid("wo"),
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    data.work_orders.unshift(order);
    storage.save(data);
    return order;
  },

  getScreenshots(orderId: string): Screenshot[] {
    return storage.load().screenshots.filter((s) => s.order_id === orderId);
  },

  addScreenshot(
    orderId: string,
    url: string,
    description: string
  ): Screenshot {
    const data = storage.load();
    const shot: Screenshot = {
      id: uid("sc"),
      order_id: orderId,
      url,
      description,
      uploaded_at: new Date().toISOString(),
    };
    data.screenshots.push(shot);
    storage.save(data);
    return shot;
  },

  getSupplementNotes(orderId: string): SupplementNote[] {
    return storage
      .load()
      .supplement_notes.filter((s) => s.order_id === orderId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  },

  addSupplementNote(
    orderId: string,
    content: string,
    operator: string
  ): SupplementNote {
    const data = storage.load();
    const note: SupplementNote = {
      id: uid("sn"),
      order_id: orderId,
      content,
      operator,
      created_at: new Date().toISOString(),
    };
    data.supplement_notes.push(note);
    storage.save(data);
    return note;
  },

  getThresholdAffected(): WorkOrder[] {
    return this.getAll().filter((o) => o.threshold_affected);
  },

  getTopImpact(limit = 10): WorkOrder[] {
    return this.getAll()
      .sort((a, b) => b.impact_weight - a.impact_weight)
      .slice(0, limit);
  },
};
