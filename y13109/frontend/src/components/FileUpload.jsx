import { useState, useRef } from 'react'
import { batchAPI } from '../api/index.js'

export default function FileUpload({ batchId, onClose, onComplete }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    addFiles(selectedFiles)
  }

  const addFiles = (newFiles) => {
    const validFiles = newFiles.filter(f => {
      const name = f.name.toLowerCase()
      return name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls')
    })
    setFiles([...files, ...validFiles])
  }

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      alert('请选择文件')
      return
    }

    setUploading(true)
    try {
      await batchAPI.upload(batchId, files)
      onComplete()
    } catch (e) {
      alert('上传失败: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ minWidth: '500px' }}>
        <div className="modal-header">
          <h3>上传矩阵文件</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div
          className={`file-upload-area ${isDragging ? 'dragover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📁</div>
          <p style={{ marginBottom: '8px', color: '#666' }}>点击或拖拽文件到此处上传</p>
          <p style={{ fontSize: '13px', color: '#999' }}>支持 CSV、Excel 格式</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>

        {files.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>已选文件 ({files.length})</h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex-between"
                  style={{
                    padding: '8px 12px',
                    background: '#fafafa',
                    borderRadius: '4px',
                    marginBottom: '6px',
                    fontSize: '13px'
                  }}
                >
                  <span>📄 {file.name}</span>
                  <button
                    className="btn btn-sm btn-default"
                    onClick={(e) => { e.stopPropagation(); removeFile(idx) }}
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button type="button" className="btn btn-default" onClick={onClose}>取消</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
          >
            {uploading ? '上传中...' : `上传 ${files.length} 个文件`}
          </button>
        </div>
      </div>
    </div>
  )
}
