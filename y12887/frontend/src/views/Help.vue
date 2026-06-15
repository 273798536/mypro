<template>
  <div>
    <h2 class="page-title">使用说明</h2>

    <div class="page-container">
      <el-steps :active="currentStep" finish-status="success" simple>
        <el-step title="启动系统" />
        <el-step title="导入数据" />
        <el-step title="查看异常" />
        <el-step title="导出结果" />
      </el-steps>

      <el-tabs v-model="activeTab" style="margin-top: 24px;">
        <el-tab-pane label="1. 启动系统" name="1">
          <div class="help-content">
            <h3>后端启动</h3>
            <div class="code-block">
              <pre><code>cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000</code></pre>
            </div>
            <p>后端服务启动后，访问 <a href="http://localhost:8000/docs" target="_blank">http://localhost:8000/docs</a> 可查看API文档</p>

            <h3 style="margin-top: 24px;">前端启动</h3>
            <div class="code-block">
              <pre><code>cd frontend
npm install
npm run dev</code></pre>
            </div>
            <p>前端服务启动后，访问 <a href="http://localhost:5173" target="_blank">http://localhost:5173</a> 进入系统</p>

            <h3 style="margin-top: 24px;">照片存储配置</h3>
            <p>巡检照片默认存储路径：<code>/Users/mac/pro/solo/workspaces/y12887/backend/photos</code></p>
            <p>如需修改，可设置环境变量：<code>PHOTO_STORAGE_PATH=/your/path</code></p>
          </div>
        </el-tab-pane>

        <el-tab-pane label="2. 导入数据" name="2">
          <div class="help-content">
            <h3>操作步骤</h3>
            <ol>
              <li>在左侧菜单点击"数据导入"</li>
              <li>点击上传区域或拖拽CSV/Excel文件到上传区域</li>
              <li>确认文件后点击"开始导入"</li>
              <li>等待导入完成，查看导入结果</li>
            </ol>

            <h3 style="margin-top: 16px;">重要说明</h3>
            <el-alert
              title="浮标数据缺失容错机制"
              type="warning"
              :closable="false"
              style="margin: 16px 0;"
            >
              <p>浮标数据缺失时不会整批失败：</p>
              <ul style="margin: 8px 0; padding-left: 20px;">
                <li>能算的先算（如只有水质数据，先算水质）</li>
                <li>数据缺口会记录在"数据缺口"页面</li>
                <li>港口调度员可在"数据缺口"页面补全数据</li>
                <li>补全后可在"复核管理"页面重新计算</li>
              </ul>
            </el-alert>

            <h3 style="margin-top: 16px;">数据模板字段</h3>
            <el-table :data="templateFields" size="small" style="margin-top: 16px;">
              <el-table-column prop="field" label="字段名" width="180" />
              <el-table-column prop="required" label="必填" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.required ? 'danger' : 'info'" size="small">{{ row.required ? '是' : '否' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="说明" />
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="3. 查看异常" name="3">
          <div class="help-content">
            <h3>查看异常列表</h3>
            <ol>
              <li>在左侧菜单点击"异常管理"</li>
              <li>可按异常类型、等级、状态筛选</li>
              <li>点击"详情"查看异常完整信息</li>
              <li>点击"追溯"进入追溯查询页面</li>
            </ol>

            <h3 style="margin-top: 16px;">异常详情页功能</h3>
            <ul>
              <li><strong>异常信息：</strong>查看异常类型、等级、数值、阈值、计算公式</li>
              <li><strong>处理记录：</strong>查看关联的处理记录、风险等级</li>
              <li><strong>巡检记录：</strong>查看巡检信息和照片</li>
              <li><strong>浮标数据：</strong>查看原始浮标监测数据</li>
              <li><strong>复核入口：</strong>无需重新导入，直接修改处理意见和复核意见</li>
            </ul>

            <h3 style="margin-top: 16px;">追溯查询（验收标准）</h3>
            <el-alert
              title="追溯链路完整性检查"
              type="info"
              :closable="false"
              style="margin: 16px 0;"
            >
              <p>完整追溯链路：</p>
              <p style="font-family: monospace; margin: 8px 0;">
                异常记录 → 处理记录 → 巡检记录（含照片） + 浮标数据 → 浴场信息 → 处理意见 → 复核意见
              </p>
              <p>验收标准：能查到巡检照片和处理意见才算顺</p>
            </el-alert>

            <h3 style="margin-top: 16px;">地图联动</h3>
            <p>水质预警和地图展示共用同一批处理记录，确保数据一致性：</p>
            <ul>
              <li>地图上按风险等级显示不同颜色标记</li>
              <li>点击标记可查看详细信息</li>
              <li>下方数据列表与地图数据同源</li>
              <li>安全区域以虚线圆圈显示</li>
            </ul>
          </div>
        </el-tab-pane>

        <el-tab-pane label="4. 导出结果" name="4">
          <div class="help-content">
            <h3>导出类型</h3>
            <el-table :data="exportTypes" size="small">
              <el-table-column prop="name" label="导出内容" width="150" />
              <el-table-column prop="location" label="操作位置" width="150" />
              <el-table-column prop="description" label="说明" />
              <el-table-column prop="format" label="格式" width="100" />
            </el-table>

            <h3 style="margin-top: 24px;">数据缺口补全流程</h3>
            <ol>
              <li>在"数据缺口"页面查看待补全的缺口清单</li>
              <li>点击"补全"按钮，填写补全说明</li>
              <li>在"复核管理"页面找到对应记录</li>
              <li>勾选"重新计算"后提交复核</li>
              <li>系统会使用补全后的数据重新计算</li>
            </ol>

            <h3 style="margin-top: 24px;">复核流程</h3>
            <ol>
              <li>在"复核管理"页面查看待复核记录</li>
              <li>点击"复核"按钮，填写复核意见</li>
              <li>如需修正处理意见，直接修改即可，无需重新导入</li>
              <li>如需重新计算，勾选"重新计算"选项</li>
              <li>提交后记录状态变为"已复核"</li>
            </ol>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const activeTab = ref('1')
const currentStep = ref(0)

const templateFields = [
  { field: 'beach_code', required: '是', description: '浴场编码' },
  { field: 'record_no', required: '是', description: '巡检记录编号' },
  { field: 'inspection_time', required: '是', description: '巡检时间' },
  { field: 'buoy_id', required: '是', description: '浮标编号' },
  { field: 'record_time', required: '是', description: '浮标记录时间' },
  { field: 'latitude', required: '否', description: '浮标纬度（用于轨迹漂移计算）' },
  { field: 'longitude', required: '否', description: '浮标经度（用于轨迹漂移计算）' },
  { field: 'ph_value', required: '否', description: 'pH值（水质计算关键指标）' },
  { field: 'dissolved_oxygen', required: '否', description: '溶解氧（水质计算关键指标）' },
  { field: 'photo_path', required: '否', description: '巡检照片路径' },
  { field: 'photo_name', required: '否', description: '照片名称' }
]

const exportTypes = [
  { name: '处理记录', location: '处理记录页面', description: '包含所有处理记录的详细信息', format: 'CSV/JSON' },
  { name: '异常记录', location: '异常管理页面', description: '包含所有异常记录的详细信息', format: 'CSV/JSON' },
  { name: '数据缺口清单', location: '数据缺口页面', description: '待补全的数据缺口列表，供调度员使用', format: 'CSV/JSON' },
  { name: '风险播报报告', location: '处理记录页面', description: '完整的风险报告，包含浴场、巡检、浮标、计算、异常等全部信息', format: 'CSV/JSON' }
]
</script>

<style lang="scss" scoped>
.help-content {
  padding: 16px 0;

  h3 {
    margin: 16px 0 12px 0;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  p {
    margin: 8px 0;
    line-height: 1.8;
  }

  ol, ul {
    padding-left: 24px;
    line-height: 2;
  }

  li {
    margin: 4px 0;
  }

  code {
    background: #f5f7fa;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
  }

  a {
    color: #409eff;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.code-block {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 16px;
  margin: 12px 0;
  overflow-x: auto;

  pre {
    margin: 0;

    code {
      background: transparent;
      color: #d4d4d4;
      padding: 0;
      font-size: 13px;
      line-height: 1.6;
    }
  }
}
</style>
