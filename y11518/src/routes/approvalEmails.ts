import { Router, Request, Response } from "express";
import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { ApprovalEmail } from "../entities/ApprovalEmail";
import { WorkOrder } from "../entities/WorkOrder";
import { AuditService } from "../services/AuditService";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const approvalEmailRepo: Repository<ApprovalEmail> = AppDataSource.getRepository(ApprovalEmail);
const workOrderRepo: Repository<WorkOrder> = AppDataSource.getRepository(WorkOrder);
const auditService = new AuditService();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, workOrderId, approvalType, approvalStatus } = req.query;
    const where: any = {};
    if (workOrderId) where.workOrderId = workOrderId;
    if (approvalType) where.approvalType = approvalType;
    if (approvalStatus) where.approvalStatus = approvalStatus;

    const [data, total] = await approvalEmailRepo.findAndCount({
      where,
      order: { sentTime: "DESC" },
      skip: (Number(page) - 1) * Number(pageSize),
      take: Number(pageSize),
    });

    res.json({
      success: true,
      data: {
        list: data,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const email = await approvalEmailRepo.findOne({
      where: { id: req.params.id },
    });

    if (!email) {
      return res
        .status(404)
        .json({ success: false, message: "审批邮件不存在" });
    }

    res.json({ success: true, data: email });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/workorder/:workOrderNo", async (req: Request, res: Response) => {
  try {
    const emails = await approvalEmailRepo.find({
      where: { workOrderNo: req.params.workOrderNo },
      order: { sentTime: "ASC" },
    });

    res.json({ success: true, data: emails });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const operationId = uuidv4();
  try {
    const { workOrderNo, ...emailData } = req.body;

    if (workOrderNo) {
      const workOrder = await workOrderRepo.findOne({
        where: { orderNo: workOrderNo },
      });
      if (!workOrder) {
        return res
          .status(404)
          .json({ success: false, message: "关联工单不存在" });
      }
    }

    const email = approvalEmailRepo.create({
      ...emailData,
      workOrderNo: workOrderNo || null,
      sentTime: emailData.sentTime || new Date(),
    }) as any;
    email.rawData = req.body;

    const saved = await approvalEmailRepo.save(email);

    await auditService.createSnapshot(
      "after_create",
      "approval_email",
      saved.id,
      saved,
      undefined,
      {
        operationId,
        operationName: "create_approval_email",
        operator: (req.headers["x-operator"] as string) || "system",
      }
    );

    res.json({ success: true, data: saved, operationId });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/append", async (req: Request, res: Response) => {
  const operationId = uuidv4();
  try {
    const { workOrderNo, messages } = req.body;

    if (!workOrderNo) {
      return res
        .status(400)
        .json({ success: false, message: "必须指定workOrderNo" });
    }

    const workOrder = await workOrderRepo.findOne({
      where: { orderNo: workOrderNo },
    });
    if (!workOrder) {
      return res
        .status(404)
        .json({ success: false, message: "关联工单不存在" });
    }

    const results: any[] = [];
    for (const msg of messages) {
      const email = approvalEmailRepo.create({
        ...msg,
        workOrderNo: workOrderNo,
        sentTime: msg.sentTime || new Date(),
      }) as any;
      email.rawData = msg;
      const saved = await approvalEmailRepo.save(email);
      results.push(saved);

      await auditService.createSnapshot(
        "after_create",
        "approval_email",
        saved.id,
        saved,
        undefined,
        {
          operationId,
          operationName: "append_approval_email",
          operator: (req.headers["x-operator"] as string) || "system",
        }
      );
    }

    res.json({
      success: true,
      data: results,
      count: results.length,
      operationId,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  const operationId = uuidv4();
  try {
    const email = await approvalEmailRepo.findOne({
      where: { id: req.params.id },
    });

    if (!email) {
      return res
        .status(404)
        .json({ success: false, message: "审批邮件不存在" });
    }

    const previousData = { ...email };

    await auditService.createSnapshot(
      "before_update",
      "approval_email",
      email.id,
      previousData,
      undefined,
      {
        operationId,
        operationName: "update_approval_email",
        operator: (req.headers["x-operator"] as string) || "system",
      }
    );

    approvalEmailRepo.merge(email as any, req.body);
    (email as any).rawData = { ...(email as any).rawData, ...req.body };
    const saved = await approvalEmailRepo.save(email as any);

    await auditService.createSnapshot(
      "after_update",
      "approval_email",
      saved.id,
      saved,
      previousData,
      {
        operationId,
        operationName: "update_approval_email",
        operator: (req.headers["x-operator"] as string) || "system",
      }
    );

    res.json({ success: true, data: saved, operationId });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const operationId = uuidv4();
  try {
    const email = await approvalEmailRepo.findOne({
      where: { id: req.params.id },
    });

    if (!email) {
      return res
        .status(404)
        .json({ success: false, message: "审批邮件不存在" });
    }

    await auditService.createSnapshot(
      "before_delete",
      "approval_email",
      email.id,
      email,
      undefined,
      {
        operationId,
        operationName: "delete_approval_email",
        operator: (req.headers["x-operator"] as string) || "system",
      }
    );

    await approvalEmailRepo.remove(email);

    await auditService.createSnapshot(
      "after_delete",
      "approval_email",
      email.id,
      { deleted: true, id: email.id },
      email,
      {
        operationId,
        operationName: "delete_approval_email",
        operator: (req.headers["x-operator"] as string) || "system",
      }
    );

    res.json({ success: true, operationId });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
