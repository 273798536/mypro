import { useRef, useState } from 'react';
import { Camera, Download, X, Check } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAppStore } from '../../store/useAppStore';

export function ScreenshotButton() {
  const { timeSettings } = useAppStore();
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const captureScreenshot = async () => {
    setIsCapturing(true);
    
    try {
      const sceneElement = document.getElementById('scene-container');
      if (!sceneElement) return;

      const canvas = await html2canvas(sceneElement, {
        backgroundColor: '#0f172a',
        scale: 2,
        logging: false
      });

      const timestamp = `${timeSettings.date}_${timeSettings.hour.toString().padStart(2, '0')}${timeSettings.minute.toString().padStart(2, '0')}`;
      const watermarkCanvas = document.createElement('canvas');
      watermarkCanvas.width = canvas.width;
      watermarkCanvas.height = canvas.height;
      const ctx = watermarkCanvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(canvas, 0, 0);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.fillText(`城市光照阴影沙盘 - 评审截图`, 20, canvas.height - 25);
        
        ctx.font = '14px Arial';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(
          `时间: ${timeSettings.date} ${timeSettings.hour.toString().padStart(2, '0')}:${timeSettings.minute.toString().padStart(2, '0')} | 时区: ${timeSettings.timezone}`,
          20,
          canvas.height - 8
        );
      }

      const url = watermarkCanvas.toDataURL('image/png');
      setPreviewUrl(url);
    } catch (error) {
      console.error('截图失败:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const downloadScreenshot = () => {
    if (!previewUrl) return;
    
    const link = document.createElement('a');
    const timestamp = `${timeSettings.date}_${timeSettings.hour.toString().padStart(2, '0')}${timeSettings.minute.toString().padStart(2, '0')}`;
    link.download = `日照分析_${timestamp}.png`;
    link.href = previewUrl;
    link.click();
  };

  return (
    <>
      <button
        onClick={captureScreenshot}
        disabled={isCapturing}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white rounded-lg transition-colors"
      >
        {isCapturing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            截取中...
          </>
        ) : (
          <>
            <Camera size={18} />
            截图导出
          </>
        )}
      </button>

      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-full overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-white font-medium">评审截图预览</h3>
              <button
                onClick={() => setPreviewUrl(null)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <img
                src={previewUrl}
                alt="Screenshot preview"
                className="w-full rounded-lg shadow-xl"
              />
            </div>
            
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700">
              <button
                onClick={() => setPreviewUrl(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={downloadScreenshot}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
              >
                <Download size={18} />
                下载图片
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
