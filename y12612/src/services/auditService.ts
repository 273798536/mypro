import type { AuditEntry, BatchRecord, Command, Device, Screenshot } from '@/types';
import { loadScreenshot, saveScreenshot } from '@/utils/storage';
import { generateId } from '@/utils/helpers';

export class AuditService {
  static getAuditTrail(
    batch: BatchRecord,
    devices: Device[],
    anomalyId?: string
  ): AuditEntry[] {
    const commands = batch.commands.slice(0, batch.currentIndex + 1);

    if (anomalyId) {
      const anomalyDevice = devices.find((d) => d.id === anomalyId);
      if (!anomalyDevice) return [];

      const relatedCommands = commands.filter((cmd) => {
        const payload = cmd.payload as Record<string, unknown>;
        return (
          payload.deviceId === anomalyId ||
          (payload.devices as Device[] | undefined)?.some((d) => d.id === anomalyId)
        );
      });

      return relatedCommands.map((cmd) => this.buildAuditEntry(cmd, devices));
    }

    return commands.map((cmd) => this.buildAuditEntry(cmd, devices));
  }

  private static buildAuditEntry(
    command: Command,
    devices: Device[]
  ): AuditEntry {
    const entry: AuditEntry = { command };

    const payload = command.payload as Record<string, unknown>;

    if (payload.deviceId) {
      entry.device = devices.find((d) => d.id === payload.deviceId);
    }

    if (payload.annotation) {
      entry.annotation = payload.annotation as AuditEntry['annotation'];
    }

    if (command.screenshotId) {
      const screenshot = loadScreenshot(command.screenshotId);
      if (screenshot) {
        entry.screenshot = screenshot.dataUrl;
      }
    }

    return entry;
  }

  static captureScreenshot(canvas: HTMLCanvasElement, commandId: string): Screenshot {
    const dataUrl = canvas.toDataURL('image/png');
    const screenshot: Screenshot = {
      id: generateId(),
      commandId,
      dataUrl,
      timestamp: Date.now(),
    };
    saveScreenshot(screenshot);
    return screenshot;
  }

  static findRelatedCommands(
    commands: Command[],
    deviceId: string
  ): Command[] {
    return commands.filter((cmd) => {
      const payload = cmd.payload as Record<string, unknown>;
      if (payload.deviceId === deviceId) return true;
      if (Array.isArray(payload.devices)) {
        return (payload.devices as Array<{ id: string }>).some((d) => d.id === deviceId);
      }
      return false;
    });
  }

  static getAnomalyTimeline(
    device: Device,
    commands: Command[]
  ): Array<{ time: number; action: string; detail: string }> {
    const related = this.findRelatedCommands(commands, device.id);
    const timeline: Array<{ time: number; action: string; detail: string }> = [];

    for (const cmd of related) {
      timeline.push({
        time: cmd.timestamp,
        action: cmd.description,
        detail: this.getCommandDetail(cmd),
      });
    }

    if (device.coordinateFlip) {
      timeline.push({
        time: 0,
        action: '坐标异常检测',
        detail: device.coordinateFlip.reason,
      });
    }

    for (const ann of device.annotations) {
      timeline.push({
        time: ann.timestamp,
        action: `添加${this.getAnnotationTypeLabel(ann.type)}`,
        detail: `${ann.content} - 处理意见：${ann.opinion}`,
      });
    }

    return timeline.sort((a, b) => a.time - b.time);
  }

  private static getCommandDetail(cmd: Command): string {
    const payload = cmd.payload as Record<string, unknown>;
    switch (cmd.type) {
      case 'device_drag':
        return `从(${Number(payload.oldX).toFixed(4)}, ${Number(payload.oldY).toFixed(4)})` +
               `移动到(${Number(payload.newX).toFixed(4)}, ${Number(payload.newY).toFixed(4)})`;
      case 'annotation_add':
        const ann = payload.annotation as { content: string; opinion: string };
        return `标注：${ann.content} | 意见：${ann.opinion}`;
      case 'coordinate_correction':
        return `坐标修正：${payload.reason}`;
      default:
        return cmd.description;
    }
  }

  private static getAnnotationTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      rectangle: '区域标注',
      text: '文字标注',
      arrow: '箭头标注',
      comment: '备注',
    };
    return labels[type] || type;
  }
}
