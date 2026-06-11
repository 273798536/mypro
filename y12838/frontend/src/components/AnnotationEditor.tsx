import { useRef, useState, useEffect } from 'react';
import { Button, Form, Input, Tag, Space, Popconfirm, message, Card } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { MicroscopeImage, Annotation } from '../types';
import { imageApi } from '../api';

interface Props {
  image: MicroscopeImage & { annotations?: Annotation[] };
  onChanged: () => void;
}

export default function AnnotationEditor({ image, onChanged }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [tempBox, setTempBox] = useState<any>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>(image.annotations || []);
  const [showForm, setShowForm] = useState(false);
  const [pendingBox, setPendingBox] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => { setAnnotations(image.annotations || []); }, [image]);

  const getRelativeCoord = (e: React.MouseEvent) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const rect = imgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const pt = getRelativeCoord(e);
    setDrawing(true);
    setStartPoint(pt);
    setTempBox({ x: pt.x, y: pt.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !startPoint) return;
    const pt = getRelativeCoord(e);
    setTempBox({
      x: Math.min(startPoint.x, pt.x),
      y: Math.min(startPoint.y, pt.y),
      width: Math.abs(pt.x - startPoint.x),
      height: Math.abs(pt.y - startPoint.y)
    });
  };

  const handleMouseUp = () => {
    if (!drawing || !tempBox) return;
    setDrawing(false);
    if (tempBox.width > 10 && tempBox.height > 10) {
      setPendingBox(tempBox);
      setShowForm(true);
      form.resetFields();
    }
    setTempBox(null);
    setStartPoint(null);
  };

  const handleSaveAnnotation = async () => {
    try {
      const values = await form.validateFields();
      const img = imgRef.current!;
      const scaleX = img.naturalWidth / img.clientWidth;
      const scaleY = img.naturalHeight / img.clientHeight;

      await imageApi.addAnnotation(image.id, {
        x: pendingBox.x * scaleX,
        y: pendingBox.y * scaleY,
        width: pendingBox.width * scaleX,
        height: pendingBox.height * scaleY,
        label: values.label,
        note: values.note,
        created_by: 'analyst'
      });

      message.success('标注已保存');
      setShowForm(false);
      setPendingBox(null);
      onChanged();
    } catch {}
  };

  const handleDeleteAnnotation = async (id: string) => {
    await imageApi.deleteAnnotation(id);
    message.success('已删除标注');
    onChanged();
  };

  const renderBoxes = () => {
    const img = imgRef.current;
    if (!img) return null;
    const scaleX = img.clientWidth / img.naturalWidth;
    const scaleY = img.clientHeight / img.naturalHeight;

    return annotations.map((a, i) => (
      <div
        key={a.id}
        className="annotation-box"
        style={{
          left: a.x * scaleX,
          top: a.y * scaleY,
          width: a.width * scaleX,
          height: a.height * scaleY
        }}
      >
        <span className="annotation-label">#{i + 1} {a.label}</span>
      </div>
    ));
  };

  return (
    <div>
      <Card type="inner" title="操作说明" style={{ marginBottom: 12 }} size="small">
        在图片上按住鼠标左键拖动画框进行标注，已标注区域会显示标签。
      </Card>

      <div
        className="annotation-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imgRef}
          src={imageApi.fileUrl(image.id)}
          alt={image.file_name}
          style={{ maxWidth: '100%', display: 'block' }}
          draggable={false}
        />
        {tempBox && (
          <div
            className="annotation-box"
            style={{
              left: tempBox.x,
              top: tempBox.y,
              width: tempBox.width,
              height: tempBox.height,
              borderStyle: 'dashed'
            }}
          />
        )}
        {renderBoxes()}
      </div>

      <div style={{ marginTop: 16 }}>
        <h4>标注列表</h4>
        {annotations.length === 0 && <span style={{ color: '#999' }}>暂无标注</span>}
        {annotations.map((a, i) => (
          <Tag
            key={a.id}
            color="blue"
            closable
            onClose={() => handleDeleteAnnotation(a.id)}
            style={{ margin: 4, padding: '4px 8px' }}
          >
            #{i + 1} <b>{a.label}</b> {a.note && `- ${a.note}`}
          </Tag>
        ))}
      </div>

      <Modal
        title="保存标注"
        open={showForm}
        onOk={handleSaveAnnotation}
        onCancel={() => { setShowForm(false); setPendingBox(null); }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="label" label="标注标签（如：活性菌落、死菌、杂菌等）" rules={[{ required: true }]}>
            <Input placeholder="请输入标签名称" />
          </Form.Item>
          <Form.Item name="note" label="备注">
            <Input.TextArea rows={3} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
