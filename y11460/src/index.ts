import app from './app'
import { config } from './config'

app.listen(config.port, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║  口腔门诊材料异常回执状态机 API 服务已启动                      ║
  ║  服务地址: http://localhost:${config.port}                        ║
  ║  健康检查: http://localhost:${config.port}/health                   ║
  ║  API 前缀: /api                                               ║
  ╚══════════════════════════════════════════════════════════════╝
  `)
})
