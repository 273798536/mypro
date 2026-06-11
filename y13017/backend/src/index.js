const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');
const XLSX = require('xlsx');

const { parseEmailFile, parseDisputeFromEmail } = require('./emailParser');
const {
  createBatch,
  updateBatchStats,
  saveEmailRecord,
  getEmailByFileName,
  getDisputeByCaseNo,
  createDispute,
  updateDisputeFromEmail,
  saveAttachment,
  getAllDisputes,
  getDisputeDetail,
  updateRemark,
  updateStatus,
  getAllTimeline,
  exportToExcel,
  addTimeline
} = require('./services');

require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

app.post('/api/emails/import', upload.array('files', 100), async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: '请选择要导入的邮件文件' });
    }

    const batchNo = 'BATCH-' + dayjs().format('YYYYMMDD-HHmmss') + '-' + Math.random().toString(36).slice(2, 6);
    createBatch(batchNo);

    let newDisputes = 0;
    let updatedDisputes = 0;
    let attachments = 0;
    let duplicates = 0;
    let skipped = 0;
    const results = [];

    for (const file of files) {
      try {
        const emailData = await parseEmailFile(file.path);
        const disputeData = parseDisputeFromEmail(emailData, file);

        if (!disputeData) {
          skipped++;
          results.push({
            file: file.originalname,
            status: 'skipped',
            reason: '未识别到争议款编号'
          });
          continue;
        }

        if (getEmailByFileName(file.originalname)) {
          duplicates++;
          const existingDispute = getDisputeByCaseNo(disputeData.caseNo);
          if (existingDispute) {
            addTimeline(existingDispute.id, 'duplicate_check',
              `重复导入检测: 邮件 [${file.originalname}] 已导入过，已完全跳过（保留原始数据与人工备注）`,
              { sourceType: 'email' }
            );
          }
          results.push({
            file: file.originalname,
            caseNo: disputeData.caseNo,
            status: 'duplicate',
            reason: '该邮件文件已导入过，完全跳过（案件不翻倍、附件不重复、备注不覆盖）'
          });
          continue;
        }

        const existing = getDisputeByCaseNo(disputeData.caseNo);

        if (!existing) {
          const emailId = saveEmailRecord(
            { ...emailData, _emailDate: disputeData._emailDate },
            batchNo,
            file.originalname
          );
          const disputeId = createDispute(disputeData, emailId, batchNo);
          for (const att of disputeData._attachments) {
            saveAttachment(disputeId, att, emailId, batchNo, false);
            attachments++;
          }
          newDisputes++;
          results.push({
            file: file.originalname,
            caseNo: disputeData.caseNo,
            status: 'created',
            note: '新建案件并保存所有附件'
          });
        } else {
          const emailId = saveEmailRecord(
            { ...emailData, _emailDate: disputeData._emailDate },
            batchNo,
            file.originalname
          );
          const hasUpdate = updateDisputeFromEmail(existing.id, disputeData, emailId, false);
          let addedAtt = 0;
          for (const att of disputeData._attachments) {
            saveAttachment(existing.id, att, emailId, batchNo, false);
            attachments++;
            addedAtt++;
          }
          updatedDisputes++;
          results.push({
            file: file.originalname,
            caseNo: disputeData.caseNo,
            status: 'updated',
            note: `补充邮件已关联（原有数据未覆盖）${hasUpdate ? '，补充了空白字段' : ''}${addedAtt > 0 ? `，新增附件 ${addedAtt} 件` : ''}`
          });
        }
      } catch (err) {
        console.error('处理邮件出错:', file.originalname, err);
        results.push({
          file: file.originalname,
          status: 'error',
          reason: err.message || String(err)
        });
      }
    }

    updateBatchStats(batchNo, {
      emails: files.length - duplicates,
      disputes: newDisputes,
      attachments
    });

    res.json({
      batchNo,
      summary: {
        total: files.length,
        newDisputes,
        updatedDisputes,
        attachments,
        duplicates,
        skipped
      },
      results
    });
  } catch (err) {
    console.error('导入失败:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.post('/api/emails/import-late', upload.array('files', 100), async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: '请选择晚到凭证邮件' });
    }

    const batchNo = 'LATE-' + dayjs().format('YYYYMMDD-HHmmss') + '-' + Math.random().toString(36).slice(2, 6);
    createBatch(batchNo);

    let updatedDisputes = 0;
    let attachments = 0;
    let duplicates = 0;
    let skipped = 0;
    const results = [];

    for (const file of files) {
      try {
        const emailData = await parseEmailFile(file.path);
        const disputeData = parseDisputeFromEmail(emailData, file);

        if (!disputeData) {
          skipped++;
          results.push({
            file: file.originalname,
            status: 'skipped',
            reason: '未识别到争议款编号'
          });
          continue;
        }

        if (getEmailByFileName(file.originalname)) {
          duplicates++;
          const existingDispute = getDisputeByCaseNo(disputeData.caseNo);
          if (existingDispute) {
            addTimeline(existingDispute.id, 'duplicate_check',
              `重复导入检测: 晚到邮件 [${file.originalname}] 已导入过，已完全跳过（保留原始记录）`,
              { sourceType: 'email' }
            );
          }
          results.push({
            file: file.originalname,
            caseNo: disputeData.caseNo,
            status: 'duplicate',
            reason: '该晚到邮件已导入过，完全跳过（不重复标记、附件不重复）'
          });
          continue;
        }

        const existing = getDisputeByCaseNo(disputeData.caseNo);

        if (existing) {
          const emailId = saveEmailRecord(
            { ...emailData, _emailDate: disputeData._emailDate },
            batchNo,
            file.originalname
          );
          const hasUpdate = updateDisputeFromEmail(existing.id, disputeData, emailId, true);
          let addedAtt = 0;
          for (const att of disputeData._attachments) {
            saveAttachment(existing.id, att, emailId, batchNo, true);
            attachments++;
            addedAtt++;
          }
          updatedDisputes++;
          results.push({
            file: file.originalname,
            caseNo: disputeData.caseNo,
            status: 'updated',
            note: `晚到凭证已关联，记录影响范围为该案件税费/汇率核对${hasUpdate ? '，补充了空白字段' : ''}${addedAtt > 0 ? `，关联晚到附件 ${addedAtt} 件` : ''}`
          });
        } else {
          skipped++;
          results.push({
            file: file.originalname,
            caseNo: disputeData.caseNo,
            status: 'skipped',
            reason: `争议款 [${disputeData.caseNo}] 不存在，请先通过"导入审批邮件"创建案件`
          });
        }
      } catch (err) {
        console.error('处理晚到邮件出错:', file.originalname, err);
        results.push({
          file: file.originalname,
          status: 'error',
          reason: err.message || String(err)
        });
      }
    }

    updateBatchStats(batchNo, {
      emails: files.length - duplicates,
      disputes: 0,
      attachments
    });

    res.json({
      batchNo,
      summary: {
        total: files.length,
        updatedDisputes,
        attachments,
        duplicates,
        skipped
      },
      results
    });
  } catch (err) {
    console.error('导入晚到凭证失败:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.get('/api/disputes', (req, res) => {
  const list = getAllDisputes();
  res.json(list);
});

app.get('/api/disputes/:id', (req, res) => {
  const detail = getDisputeDetail(req.params.id);
  if (!detail) {
    return res.status(404).json({ error: '记录不存在' });
  }
  res.json(detail);
});

app.put('/api/disputes/:id/remark', (req, res) => {
  const { remark, operator } = req.body;
  if (remark === undefined) {
    return res.status(400).json({ error: '缺少 remark 字段' });
  }
  const result = updateRemark(req.params.id, remark, operator);
  if (!result) {
    return res.status(404).json({ error: '记录不存在' });
  }
  res.json(result);
});

app.put('/api/disputes/:id/status', (req, res) => {
  const { status, operator } = req.body;
  if (!status) {
    return res.status(400).json({ error: '缺少 status 字段' });
  }
  const result = updateStatus(req.params.id, status, operator);
  if (!result) {
    return res.status(404).json({ error: '记录不存在' });
  }
  res.json(result);
});

app.get('/api/timeline', (req, res) => {
  const list = getAllTimeline();
  res.json(list);
});

app.get('/api/export', (req, res) => {
  try {
    const wb = exportToExcel();
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `信用卡争议款对账_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  } catch (err) {
    console.error('导出失败:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`信用卡争议款对账后端服务已启动: http://localhost:${PORT}`);
});
