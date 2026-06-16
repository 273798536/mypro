import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMapEvents, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  ArrowLeft,
  Upload,
  X,
  MapPin,
  Image as ImageIcon,
  CheckCircle,
  Send,
  Camera,
  Navigation,
  FileText,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Photo } from '@/types'

interface UploadedPhoto {
  id: string
  url: string
  file?: File
  isGenerated?: boolean
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, 15)
  }, [center, map])
  return null
}

const createMarkerIcon = (color: string, isDashed: boolean = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="relative">
        <div 
          class="rounded-full border-2 border-white shadow-lg" 
          style="
            background-color: ${color}; 
            width: 20px; 
            height: 20px; 
            margin-left: -10px; 
            margin-top: -10px;
            ${isDashed ? 'border-style: dashed; opacity: 0.6;' : ''}
          "
        ></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function Supplement() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const complaint = useAppStore((state) => state.getComplaintById(id))
  const apiLogs = useAppStore((state) => state.getApiLogsByComplaintId(id))
  const updateComplaintLocation = useAppStore((state) => state.updateComplaintLocation)
  const updateComplaintStatus = useAppStore((state) => state.updateComplaintStatus)
  const supplementPhoto = useAppStore((state) => state.supplementPhoto)
  const rerunApi = useAppStore((state) => state.rerunApi)

  const [originalLat, originalLng] = complaint
    ? [complaint.originalLat ?? complaint.lat, complaint.originalLng ?? complaint.lng]
    : [39.9042, 116.4074]
  const [currentLat, setCurrentLat] = useState(originalLat)
  const [currentLng, setCurrentLng] = useState(originalLng)

  useEffect(() => {
    if (complaint) {
      setCurrentLat(complaint.originalLat ?? complaint.lat)
      setCurrentLng(complaint.originalLng ?? complaint.lng)
    }
  }, [complaint])

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setCurrentLat(lat)
    setCurrentLng(lng)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/')
    )
    handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) =>
      file.type.startsWith('image/')
    )
    handleFiles(files)
  }

  const handleFiles = (files: File[]) => {
    const newPhotos: UploadedPhoto[] = files.map((file) => ({
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: URL.createObjectURL(file),
      file,
    }))
    setUploadedPhotos((prev) => [...prev, ...newPhotos])
  }

  const handleGenerateImage = async () => {
    setIsGenerating(true)
    try {
      const prompt = encodeURIComponent(
        '老街社区消防隐患现场照片，老旧小区楼道堆物，消防通道堵塞，真实场景'
      )
      const url = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${prompt}&image_size=square_hd`

      const newPhoto: UploadedPhoto = {
        id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url,
        isGenerated: true,
      }
      setUploadedPhotos((prev) => [...prev, newPhoto])
    } catch (error) {
      console.error('生成图片失败:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeletePhoto = (photoId: string) => {
    setUploadedPhotos((prev) => {
      const photo = prev.find((p) => p.id === photoId)
      if (photo && photo.url.startsWith('blob:') && photo.file) {
        URL.revokeObjectURL(photo.url)
      }
      return prev.filter((p) => p.id !== photoId)
    })
  }

  const handleSubmit = async () => {
    if (!complaint) return

    setSubmitting(true)
    try {
      const distance = calculateDistance(originalLat, originalLng, currentLat, currentLng)
      const supplementNote = `补录照片${uploadedPhotos.length}张，地图点位偏移${distance.toFixed(0)}米`

      updateComplaintLocation(complaint.id, currentLat, currentLng, supplementNote)

      for (const photo of uploadedPhotos) {
        const photoData: Omit<Photo, 'id' | 'complaintId' | 'uploadedAt'> = {
          url: photo.url,
          lat: currentLat,
          lng: currentLng,
          note: photo.isGenerated ? 'AI生成现场照片' : '现场补录照片',
        }
        supplementPhoto(complaint.id, photoData)
      }

      rerunApi(complaint.id)

      updateComplaintStatus(complaint.id, 'supplemented')

      navigate(`/trace/${complaint.id}`)
    } catch (error) {
      console.error('提交补录失败:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const distance = calculateDistance(originalLat, originalLng, currentLat, currentLng)
  const latDiff = currentLat - originalLat
  const lngDiff = currentLng - originalLng
  const latestApiLog = apiLogs[apiLogs.length - 1]

  if (!complaint) {
    return (
      <div className="flex items-center justify-center h-full text-fire-white/60">
        未找到该投诉记录
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/trace/${id}`)}
          className="flex items-center gap-2 px-4 py-2 bg-caliber-blue/50 hover:bg-caliber-blue/70 text-fire-white/80 rounded-lg transition-all duration-300 border border-fire-orange/20"
        >
          <ArrowLeft size={18} />
          <span>返回溯源</span>
        </button>
        <div className="flex items-center gap-2 text-fire-white/60 text-sm">
          <span>/</span>
          <span className="text-fire-orange font-medium">补录操作</span>
          <span className="text-fire-white/40">|</span>
          <span>{complaint.title}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-caliber-blue/50 rounded-xl p-6 border border-fire-orange/20">
            <h3 className="text-fire-white text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-fire-orange rounded-full" />
              <Camera size={20} className="text-fire-orange" />
              照片上传
            </h3>

            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
                isDragging
                  ? 'border-fire-orange bg-fire-orange/10'
                  : 'border-fire-white/20 hover:border-fire-orange/50 hover:bg-caliber-blue/30'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 rounded-full bg-fire-orange/10">
                  <Upload size={32} className="text-fire-orange" />
                </div>
                <div>
                  <p className="text-fire-white font-medium">拖拽照片到此处，或点击选择文件</p>
                  <p className="text-fire-white/40 text-sm mt-1">支持 JPG、PNG 格式，单张不超过 10MB</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateImage}
              disabled={isGenerating}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-fire-orange/10 hover:bg-fire-orange/20 text-fire-orange rounded-lg transition-all duration-300 border border-fire-orange/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ImageIcon size={18} />
              <span>{isGenerating ? '生成中...' : 'AI 生成现场照片'}</span>
            </button>

            {uploadedPhotos.length > 0 && (
              <div className="mt-6">
                <p className="text-fire-white/60 text-sm mb-3 flex items-center gap-2">
                  <CheckCircle size={16} className="text-success-green" />
                  已上传 {uploadedPhotos.length} 张照片
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {uploadedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group aspect-square rounded-lg overflow-hidden border border-fire-orange/20"
                    >
                      <img
                        src={photo.url}
                        alt="上传照片"
                        className="w-full h-full object-cover"
                      />
                      {photo.isGenerated && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-fire-orange/80 text-white text-xs rounded">
                          AI生成
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePhoto(photo.id)
                        }}
                        className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-caliber-blue/50 rounded-xl p-6 border border-fire-orange/20">
            <h3 className="text-fire-white text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-fire-orange rounded-full" />
              <MapPin size={20} className="text-fire-orange" />
              地图点位调整
            </h3>

            <div className="h-[400px] rounded-lg overflow-hidden">
              <MapContainer
                center={[originalLat, originalLng]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <MapController center={[currentLat, currentLng]} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                <MapClickHandler onMapClick={handleMapClick} />

                <Circle
                  center={[originalLat, originalLng]}
                  radius={50}
                  pathOptions={{
                    color: '#f5a623',
                    fillColor: '#f5a623',
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: '5, 10',
                  }}
                />
                <Marker
                  position={[originalLat, originalLng]}
                  icon={createMarkerIcon('#f5a623', true)}
                />

                <Circle
                  center={[currentLat, currentLng]}
                  radius={30}
                  pathOptions={{
                    color: '#e94560',
                    fillColor: '#e94560',
                    fillOpacity: 0.2,
                    weight: 3,
                  }}
                />
                <Marker
                  position={[currentLat, currentLng]}
                  icon={createMarkerIcon('#e94560', false)}
                />
              </MapContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-3 bg-caliber-blue/30 rounded-lg">
                <p className="text-fire-white/40 text-xs mb-1">原始位置</p>
                <p className="text-fire-white font-mono text-sm">
                  {originalLat.toFixed(6)}, {originalLng.toFixed(6)}
                </p>
              </div>
              <div className="p-3 bg-fire-orange/10 rounded-lg border border-fire-orange/30">
                <p className="text-fire-orange/60 text-xs mb-1">当前位置</p>
                <p className="text-fire-orange font-mono text-sm">
                  {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Navigation size={14} className="text-success-green" />
                <span className="text-fire-white/60">偏移距离：</span>
                <span className="text-success-green font-medium">
                  {distance.toFixed(0)} 米
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-fire-white/60">纬度变化：</span>
                <span className={`font-mono ${latDiff !== 0 ? 'text-fire-orange' : 'text-fire-white/40'}`}>
                  {latDiff >= 0 ? '+' : ''}{latDiff.toFixed(6)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-fire-white/60">经度变化：</span>
                <span className={`font-mono ${lngDiff !== 0 ? 'text-fire-orange' : 'text-fire-white/40'}`}>
                  {lngDiff >= 0 ? '+' : ''}{lngDiff.toFixed(6)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-caliber-blue/50 rounded-xl p-6 border border-success-green/30 sticky top-0">
            <h3 className="text-success-green text-lg font-semibold mb-6 flex items-center gap-2">
              <span className="w-1 h-5 bg-success-green rounded-full" />
              <FileText size={20} />
              变更说明预览
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-success-green/5 rounded-lg border border-success-green/20">
                <p className="text-success-green/80 text-sm font-medium mb-2">本次补录改了什么</p>
                <p className="text-fire-white/80 text-sm leading-relaxed">
                  本次补录对投诉 <span className="text-fire-orange font-medium">{complaint.id}</span> 的现场信息进行了补充完善，
                  包括新增现场照片和修正地理位置坐标，确保投诉信息的准确性和完整性。
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between p-3 bg-caliber-blue/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-success-green/10">
                      <ImageIcon size={16} className="text-success-green" />
                    </div>
                    <div>
                      <p className="text-fire-white/80 text-sm">补录照片数量</p>
                      <p className="text-fire-white/40 text-xs">新增现场证据</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-success-green">{uploadedPhotos.length}</p>
                    <p className="text-fire-white/40 text-xs">张</p>
                  </div>
                </div>

                <div className="flex items-start justify-between p-3 bg-caliber-blue/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-success-green/10">
                      <Navigation size={16} className="text-success-green" />
                    </div>
                    <div>
                      <p className="text-fire-white/80 text-sm">地图点位偏移</p>
                      <p className="text-fire-white/40 text-xs">位置修正距离</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-success-green">{distance.toFixed(0)}</p>
                    <p className="text-fire-white/40 text-xs">米</p>
                  </div>
                </div>

                <div className="flex items-start justify-between p-3 bg-caliber-blue/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-success-green/10">
                      <CheckCircle size={16} className="text-success-green" />
                    </div>
                    <div>
                      <p className="text-fire-white/80 text-sm">接口返回变化</p>
                      <p className="text-fire-white/40 text-xs">提交后自动重跑</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-success-green">
                      {latestApiLog ? (latestApiLog.isRerun ? '已重跑' : '待重跑') : '待执行'}
                    </p>
                    <p className="text-fire-white/40 text-xs">
                      {latestApiLog ? `置信度 ${((((latestApiLog.responseData.data as Record<string, unknown>)?.confidence as number) || 0) * 100).toFixed(0)}%` : '提交后更新'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-success-green/10 rounded-lg border border-success-green/30">
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-success-green flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-success-green font-medium text-sm">补录摘要</p>
                    <p className="text-fire-white/70 text-sm mt-1 leading-relaxed">
                      共补录 <span className="text-success-green font-medium">{uploadedPhotos.length}</span> 张照片，
                      点位偏移 <span className="text-success-green font-medium">{distance.toFixed(0)}</span> 米，
                      提交后将自动重跑接口并更新状态为"已补录"。
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || uploadedPhotos.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-fire-orange hover:bg-fire-orange/90 text-white font-medium rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-fire-orange/20 hover:shadow-fire-orange/40"
              >
                <Send size={18} />
                <span>{submitting ? '提交中...' : '提交补录'}</span>
              </button>

              <p className="text-center text-fire-white/40 text-xs">
                提交后将跳转回溯源页面，状态将更新为"已补录"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
