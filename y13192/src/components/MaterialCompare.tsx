import { materialFields } from '@/data/mockData'
import { Check, AlertTriangle } from 'lucide-react'

export default function MaterialCompare() {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-700" style={{ backgroundColor: '#1a1a2e' }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-4 py-3 text-left text-gray-400 font-medium">字段</th>
            <th className="px-4 py-3 text-left text-gray-400 font-medium">材料A</th>
            <th className="px-4 py-3 text-left text-gray-400 font-medium">材料B</th>
            <th className="px-4 py-3 text-center text-gray-400 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          {materialFields.map((row) => (
            <tr
              key={row.field}
              className={`border-b border-gray-700/50 transition-colors ${
                row.inconsistent ? 'bg-red-500/15' : ''
              }`}
            >
              <td className={`px-4 py-3 font-medium ${row.inconsistent ? 'text-white' : 'text-gray-300'}`}>
                {row.field}
              </td>
              <td className={`px-4 py-3 font-mono ${row.inconsistent ? 'text-white' : 'text-gray-200'}`}>
                {row.materialA}
              </td>
              <td className={`px-4 py-3 font-mono ${row.inconsistent ? 'text-white' : 'text-gray-200'}`}>
                {row.materialB}
              </td>
              <td className="px-4 py-3 text-center">
                {row.inconsistent ? (
                  <AlertTriangle className="inline-block w-4 h-4 text-red-400" />
                ) : (
                  <Check className="inline-block w-4 h-4 text-green-400" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
