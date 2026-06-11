import React, { useRef, useEffect, useState, useCallback } from "react";
import { Button, Space, message } from "antd";
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ScissorOutlined,
  RotateLeftOutlined
} from "@ant-design/icons";
import html2canvas from "html2canvas";
import { saveAs } from "file-saver";
import { ViewAngle, ViewConfig, CadLayer } from "../types";

interface CadViewerProps {
  layers?: CadLayer[];
  viewConfig?: ViewConfig;
  onViewChange?: (config: Partial<ViewConfig>) => void;
  onScreenshot?: (dataUrl: string) => void;
}

const angleConfig: Record<ViewAngle, { rotationX: number; rotationY: number; label: string }> = {
  top: { rotationX: 90, rotationY: 0, label: "俯视图" },
  front: { rotationX: 0, rotationY: 0, label: "正视图" },
  side: { rotationX: 0, rotationY: 90, label: "侧视图" },
  isometric: { rotationX: 35, rotationY: 45, label: "等轴测" },
  custom: { rotationX: 0, rotationY: 0, label: "自定义" }
};

const CadViewer: React.FC<CadViewerProps> = ({ layers = [], viewConfig, onViewChange, onScreenshot }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [rotationX, setRotationX] = useState(35);
  const [rotationY, setRotationY] = useState(45);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (viewConfig) {
      setZoom(viewConfig.zoom);
      setRotationX(viewConfig.rotationX);
      setRotationY(viewConfig.rotationY);
      setPanX(viewConfig.panX);
      setPanY(viewConfig.panY);
    }
  }, [viewConfig]);

  const notifyViewChange = useCallback(() => {
    if (onViewChange) {
      onViewChange({
        angle: "custom",
        zoom,
        rotationX,
        rotationY,
        panX,
        panY
      });
    }
  }, [zoom, rotationX, rotationY, panX, panY, onViewChange]);

  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.2, 3);
    setZoom(newZoom);
    setTimeout(notifyViewChange, 0);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.2, 0.3);
    setZoom(newZoom);
    setTimeout(notifyViewChange, 0);
  };

  const handleReset = () => {
    setZoom(1);
    setRotationX(35);
    setRotationY(45);
    setPanX(0);
    setPanY(0);
    setTimeout(notifyViewChange, 0);
  };

  const handleAngleChange = (angle: ViewAngle) => {
    const config = angleConfig[angle];
    setRotationX(config.rotationX);
    setRotationY(config.rotationY);
    setTimeout(notifyViewChange, 0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newPanX = e.clientX - dragStart.x;
      const newPanY = e.clientY - dragStart.y;
      setPanX(newPanX);
      setPanY(newPanY);
      setTimeout(notifyViewChange, 0);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.3, Math.min(3, zoom + delta));
    setZoom(newZoom);
    setTimeout(notifyViewChange, 0);
  };

  const handleScreenshot = async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: "#f0f2f5",
        scale: 2
      });
      const dataUrl = canvas.toDataURL("image/png");
      if (onScreenshot) {
        onScreenshot(dataUrl);
      } else {
        saveAs(dataUrl, `cad-view-${Date.now()}.png`);
      }
      message.success("截图成功");
    } catch (error) {
      message.error("截图失败");
    }
  };

  const devices = [
    { id: 1, name: "机柜A1", x: 50, y: 50, width: 60, height: 120, color: "#1890ff" },
    { id: 2, name: "机柜A2", x: 130, y: 50, width: 60, height: 120, color: "#1890ff" },
    { id: 3, name: "机柜A3", x: 210, y: 50, width: 60, height: 120, color: "#ff4d4f" },
    { id: 4, name: "机柜B1", x: 50, y: 200, width: 60, height: 120, color: "#1890ff" },
    { id: 5, name: "机柜B2", x: 130, y: 200, width: 60, height: 120, color: "#52c41a" },
    { id: 6, name: "机柜B3", x: 210, y: 200, width: 60, height: 120, color: "#1890ff" },
    { id: 7, name: "精密空调", x: 300, y: 50, width: 80, height: 80, color: "#faad14" },
    { id: 8, name: "UPS电源", x: 300, y: 160, width: 80, height: 80, color: "#722ed1" },
    { id: 9, name: "配电柜", x: 300, y: 270, width: 80, height: 60, color: "#13c2c2" }
  ];

  const currentAngle = Object.keys(angleConfig).find(
    key =>
      angleConfig[key as ViewAngle].rotationX === rotationX &&
      angleConfig[key as ViewAngle].rotationY === rotationY
  ) as ViewAngle || "custom";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space>
          {(["top", "front", "side", "isometric"] as ViewAngle[]).map(angle => (
            <Button
              key={angle}
              type={currentAngle === angle ? "primary" : "default"}
              onClick={() => handleAngleChange(angle)}
            >
              {angleConfig[angle].label}
            </Button>
          ))}
        </Space>
        <Space>
          <Button icon={<ZoomInOutlined />} onClick={handleZoomIn}>
            放大
          </Button>
          <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut}>
            缩小
          </Button>
          <Button icon={<RotateLeftOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button
            type="primary"
            icon={<ScissorOutlined />}
            onClick={handleScreenshot}
          >
            截图
          </Button>
        </Space>
      </div>

      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: 480,
          backgroundColor: "#f0f2f5",
          border: "1px solid #d9d9d9",
          borderRadius: 4,
          overflow: "hidden",
          cursor: isDragging ? "grabbing" : "grab",
          position: "relative"
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `translate(${panX}px, ${panY}px) scale(${zoom}) rotateX(${rotationX}deg) rotateY(${rotationY}deg)`,
            transformStyle: "preserve-3d",
            transition: isDragging ? "none" : "transform 0.3s ease"
          }}
        >
          <div
            style={{
              width: 450,
              height: 380,
              position: "relative",
              transformStyle: "preserve-3d",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                backgroundColor: "#fff",
                border: "2px solid #d9d9d9",
                borderRadius: 4,
                transform: "translateZ(0px)"
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  bottom: 0,
                  width: 80,
                  marginLeft: -40,
                  backgroundColor: "rgba(24,144,255,0.1)",
                  border: "1px dashed #1890ff"
                }}
              />
              {devices.map(device => (
                <div
                  key={device.id}
                  style={{
                    position: "absolute",
                    left: device.x,
                    top: device.y,
                    width: device.width,
                    height: device.height,
                    backgroundColor: device.color,
                    border: "2px solid rgba(255,255,255,0.8)",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: "bold",
                    textAlign: "center",
                    boxShadow: "2px 2px 8px rgba(0,0,0,0.3)",
                    transform: "translateZ(1px)"
                  }}
                  title={device.name}
                >
                  {device.name.slice(0, 3)}
                </div>
              ))}
            </div>

            <div
              style={{
                position: "absolute",
                width: "100%",
                height: 60,
                backgroundColor: "rgba(255,255,255,0.9)",
                border: "1px solid #d9d9d9",
                transform: "rotateX(90deg)",
                transformOrigin: "top",
                top: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <span style={{ color: "#8c8c8c", fontSize: 14 }}>冷通道</span>
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            padding: "4px 8px",
            backgroundColor: "rgba(0,0,0,0.6)",
            color: "#fff",
            borderRadius: 4,
            fontSize: 12
          }}
        >
          缩放: {(zoom * 100).toFixed(0)}% | 角度: {angleConfig[currentAngle]?.label || "自定义"}
        </div>

        {layers.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              padding: "8px 12px",
              backgroundColor: "rgba(255,255,255,0.95)",
              borderRadius: 4,
              fontSize: 12,
              maxHeight: 200,
              overflowY: "auto"
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 6 }}>图层列表</div>
            {layers.map(layer => (
              <div
                key={layer.id}
                style={{
                  color: layer.isOldVersion ? "#ff4d4f" : "#595959",
                  textDecoration: layer.isOldVersion ? "line-through" : "none",
                  marginBottom: 4
                }}
              >
                {layer.name} (v{layer.version})
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CadViewer;
