import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Scatter } from 'recharts'
import { Card, Row, Col, Statistic, Tag } from 'antd'

interface CurveData {
  weibull_shape: number
  weibull_scale: number
  mean_lifetime: number
  median_lifetime: number
  b10_lifetime: number
  r_squared?: number
  curve_points: {
    time: number[]
    reliability: number[]
    cdf: number[]
    pdf: number[]
    data_points?: number[]
    data_ranks?: number[]
  }
  material_name?: string
  sample_count?: number
}

export default function ReliabilityCurveChart({ data, height = 400 }: { data: CurveData; height?: number }) {
  if (!data || !data.curve_points) {
    return (
      <div className="empty-state">
        暂无曲线数据
      </div>
    )
  }

  const { curve_points, weibull_shape, weibull_scale, mean_lifetime, b10_lifetime, r_squared } = data

  const chartData = curve_points.time.map((t, i) => ({
    time: Number(t.toFixed(1)),
    reliability: Number((curve_points.reliability[i] * 100).toFixed(2)),
    cdf: Number((curve_points.cdf[i] * 100).toFixed(2)),
    pdf: Number((curve_points.pdf[i] * 1000).toFixed(3))
  }))

  const scatterData = (curve_points.data_points || []).map((dp, i) => ({
    time: Number(dp.toFixed(1)),
    reliability: Number(((1 - (curve_points.data_ranks?.[i] || 0)) * 100).toFixed(2))
  }))

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Weibull 形状参数 β" value={weibull_shape?.toFixed(4)} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="Weibull 尺度参数 η (小时)" value={weibull_scale?.toFixed(1)} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="平均寿命 MTTF (小时)" value={mean_lifetime?.toFixed(1)} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="B10 寿命 (小时)" value={b10_lifetime?.toFixed(1)} />
          </Card>
        </Col>
      </Row>

      {r_squared !== undefined && (
        <div style={{ marginBottom: 12 }}>
          <Tag color="blue">R² = {r_squared.toFixed(4)}</Tag>
          {data.sample_count && <Tag color="green">样本数: {data.sample_count}</Tag>}
          {data.material_name && <Tag color="purple">{data.material_name}</Tag>}
        </div>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <div className="curve-chart-container">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>可靠度函数 R(t)</div>
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  label={{ value: '时间 (小时)', position: 'bottom', offset: -5 }}
                />
                <YAxis
                  label={{ value: '可靠度 (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]}
                />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Line
                  type="monotone"
                  dataKey="reliability"
                  stroke="#1677ff"
                  strokeWidth={2}
                  dot={false}
                  name="可靠度 R(t)"
                />
                {scatterData.length > 0 && (
                  <Scatter data={scatterData}>
                    <Line dataKey="reliability" fill="#ff4d4f" stroke="#ff4d4f" strokeWidth={0} dot={{ r: 4 }} />
                  </Scatter>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div className="curve-chart-container">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>累计失效分布 F(t) & 概率密度 f(t)</div>
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  label={{ value: '时间 (小时)', position: 'bottom', offset: -5 }}
                />
                <YAxis
                  yAxisId="left"
                  label={{ value: 'F(t) (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'f(t) (×10⁻³)', angle: 90, position: 'insideRight' }}
                />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cdf"
                  stroke="#52c41a"
                  strokeWidth={2}
                  dot={false}
                  name="累计失效 F(t) %"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pdf"
                  stroke="#fa8c16"
                  strokeWidth={2}
                  dot={false}
                  name="概率密度 f(t)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Col>
      </Row>
    </div>
  )
}
