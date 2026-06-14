import { ReviewRunResult } from './types'

interface Props {
  onRerun: () => void
  result: ReviewRunResult
}

export default function GuidePanel({ onRerun, result }: Props) {
  return (
    <div>
      <div className="section-title">说明</div>

      <div className="guide-step">
        <h4>1. 样例：一条正常记录为什么影响结论</h4>
        <p>复核表中每条记录标注了来源（旧版曲目表 / 正常记录 / 口头备注），以及对结论的具体影响：</p>
        <ul style={{ fontSize: 13, paddingLeft: 18, marginTop: 6 }}>
          <li><strong style={{ color: '#cf1322' }}>旧版曲目表</strong> — 版本号与当前曲目表不一致，时码可能偏移，结论需修正</li>
          <li><strong style={{ color: '#389e0d' }}>正常记录</strong> — 版本号一致，时码在合理区间，不影响结论</li>
          <li><strong style={{ color: '#d46b08' }}>口头备注</strong> — 未经验证，需人工确认后再纳入结论</li>
        </ul>
      </div>

      <div className="guide-step">
        <h4>2. 重跑</h4>
        <p>点击「重跑复核」按钮，系统会用当前曲目表重新对比所有记录，更新影响分析。</p>
        <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={onRerun}>重跑复核</button>
      </div>

      <div className="guide-step">
        <h4>3. 查看接口返回</h4>
        <p>复核分析页点击「查看接口返回」可看到本次复核的原始数据，包括曲目表版本号、处理时间、记录数等。</p>
        <pre className="api-response">{JSON.stringify(result.apiResponse, null, 2)}</pre>
      </div>
    </div>
  )
}
