import { useState } from 'react'
import { Camera, RefreshCw } from 'lucide-react'
import { useStore } from '@/store/useStore'
import MapView from '@/components/MapView'
import { getPlaceholderImage } from '@/utils/placeholderImages'

export default function FieldPage() {
  const { plans, fieldPhotos, history, addFieldPhoto, applyCoordinateOffset, triggerBoundaryCheck } = useStore()

  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [lat, setLat] = useState(39.92)
  const [lng, setLng] = useState(116.42)
  const [offsetAmount, setOffsetAmount] = useState(0)

  const getPlanName = (planId: string) => {
    return plans.find((p) => p.id === planId)?.name ?? '未知方案'
  }

  const markers = fieldPhotos.map((photo) => ({
    coord: (photo.offsetApplied && photo.offsetCoord ? photo.offsetCoord : photo.coord) as [number, number],
    label: photo.description || getPlanName(photo.planId),
    isOffset: photo.offsetApplied,
  }))

  const routes = plans.map((plan) => ({
    coords: plan.route,
    color: '#0D7377',
  }))

  const fieldSupplementHistory = history.filter((h) => h.type === 'field_supplement')
  const latestSupplement = fieldSupplementHistory[fieldSupplementHistory.length - 1]

  const handleUpload = () => {
    if (!selectedPlanId) return
    addFieldPhoto({
      planId: selectedPlanId,
      coord: [lat, lng],
      offsetApplied: false,
      imageUrl: getPlaceholderImage('generic'),
      description,
    })
    setDescription('')
    setLat(39.92)
    setLng(116.42)
  }

  const handleApplyOffset = (planId: string) => {
    triggerBoundaryCheck(planId, offsetAmount)
  }

  return (
    <div className="flex h-full gap-6 p-6">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-4 mb-3">
          <label className="text-sm font-medium text-gray-700">坐标偏移量</label>
          <input
            type="range"
            min={0}
            max={0.01}
            step={0.001}
            value={offsetAmount}
            onChange={(e) => setOffsetAmount(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-gray-600 w-14 text-right">{offsetAmount.toFixed(3)}</span>
          <button
            onClick={() => handleApplyOffset(selectedPlanId)}
            className="px-4 py-1.5 text-sm text-white rounded-lg"
            style={{ backgroundColor: '#0D7377' }}
          >
            应用偏移
          </button>
        </div>

        <div className="flex-1 rounded-xl overflow-hidden shadow">
          <MapView center={[39.92, 116.42] as [number, number]} zoom={13} markers={markers} routes={routes} />
        </div>

        <div className="mt-4 bg-white rounded-xl p-4 shadow">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw size={16} style={{ color: '#0D7377' }} />
            <h3 className="font-medium text-gray-800">补录变更说明</h3>
          </div>
          {latestSupplement ? (
            <p className="text-sm text-gray-600">{latestSupplement.description}</p>
          ) : (
            <p className="text-sm text-gray-400">暂无补录变更记录</p>
          )}
        </div>
      </div>

      <div className="w-96 ml-6 flex flex-col">
        <div className="bg-white rounded-xl p-5 shadow">
          <div className="flex items-center gap-2 mb-4">
            <Camera size={18} style={{ color: '#0D7377' }} />
            <h2 className="text-lg font-semibold text-gray-800">现场照片补录</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">所属方案</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]"
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377] resize-none"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">纬度</label>
                <input
                  type="number"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                  step={0.001}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">经度</label>
                <input
                  type="number"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                  step={0.001}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7377]"
                />
              </div>
            </div>

            <button
              onClick={handleUpload}
              className="w-full py-2 text-white text-sm font-medium rounded-lg"
              style={{ backgroundColor: '#0D7377' }}
            >
              上传照片
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3 flex-1 overflow-y-auto">
          {fieldPhotos.map((photo) => (
            <div key={photo.id} className="bg-white rounded-xl p-3 shadow flex gap-3">
              <img
                src={photo.imageUrl}
                alt=""
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{getPlanName(photo.planId)}</p>
                <p className="text-sm text-gray-600 truncate">{photo.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  [{photo.coord[0].toFixed(3)}, {photo.coord[1].toFixed(3)}]
                </p>
                {photo.offsetApplied && photo.offsetCoord && (
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: '#FF8C42' }}
                    >
                      已偏移
                    </span>
                    <span className="text-xs text-gray-500">
                      [{photo.offsetCoord[0].toFixed(3)}, {photo.offsetCoord[1].toFixed(3)}]
                    </span>
                  </div>
                )}
                {!photo.offsetApplied && (
                  <button
                    onClick={() => applyCoordinateOffset(photo.id, offsetAmount)}
                    className="mt-1 text-xs px-2 py-0.5 rounded border border-[#0D7377] text-[#0D7377] hover:bg-[#0D7377] hover:text-white transition-colors"
                  >
                    应用坐标偏移
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
