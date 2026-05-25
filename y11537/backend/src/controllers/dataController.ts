import { Response } from 'express';
import { TrainingRegistration, SigninRecord, Homework, ManualPriceAdjustment } from '../models';
import { DataSource, SigninType, RetryCategory, AuditAction } from '../models/types';
import { AuthRequest } from '../middleware/auth';
import { addToCompensationQueue } from '../services/compensationQueueService';
import { createAuditLog } from '../services/auditService';
import { createFailedRecord, classifyError } from '../services/failedRecordService';
import { filterFieldsByRole } from '../config/permissions';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export async function submitRegistration(req: AuthRequest, res: Response) {
  try {
    const data = req.body;
    const user = req.user!;
    
    const registrationNo = `REG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const registration = await TrainingRegistration.create({
      ...data,
      registrationNo,
      source: DataSource.REGISTRATION_FORM,
      createdBy: user.id
    });
    
    await createAuditLog({
      action: AuditAction.SUBMIT,
      source: DataSource.REGISTRATION_FORM,
      recordType: 'training_registration',
      recordId: registration.id,
      recordNo: registration.registrationNo,
      afterData: registration.toJSON(),
      changeReason: '提交报名表',
      operatorId: user.id,
      operatorName: user.realName,
      operatorRole: user.role,
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      data: filterFieldsByRole(registration.toJSON(), user.role)
    });
  } catch (error: any) {
    console.error('提交报名表错误:', error);
    
    const retryCategory = classifyError(error);
    
    await createFailedRecord({
      source: DataSource.REGISTRATION_FORM,
      recordType: 'training_registration',
      retryCategory,
      errorMessage: error.message,
      errorDetail: error.stack,
      originalData: req.body,
      createdBy: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      retryCategory
    });
  }
}

export async function submitSignin(req: AuthRequest, res: Response) {
  try {
    const data = req.body;
    const user = req.user!;
    
    const existingSignin = await SigninRecord.findOne({
      where: {
        employeeId: data.employeeId,
        trainingId: data.trainingId,
        trainingDate: data.trainingDate
      }
    });
    
    if (existingSignin) {
      const retryCategory = RetryCategory.DUPLICATE_RECORD;
      
      const queueItem = await addToCompensationQueue({
        source: DataSource.SIGNIN_QRCODE,
        sourceRecordNo: existingSignin.signinNo,
        signinType: SigninType.NORMAL,
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        department: data.department,
        trainingId: data.trainingId,
        trainingName: data.trainingName,
        trainingDate: data.trainingDate,
        signinTime: data.signinTime,
        retryCategory,
        errorMessage: '检测到重复签到记录，已加入补偿队列',
        originalData: data,
        isProxy: data.isProxy,
        proxyEmployeeId: data.proxyEmployeeId,
        proxyEmployeeName: data.proxyEmployeeName,
        createdBy: user.id,
        operatorName: user.realName,
        operatorRole: user.role,
        ipAddress: req.ip
      });
      
      return res.json({
        success: true,
        warning: '检测到重复签到，已加入补偿队列等待处理',
        queueNo: queueItem.queueNo,
        data: filterFieldsByRole(queueItem.toJSON(), user.role)
      });
    }
    
    const signinNo = `SIG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const signin = await SigninRecord.create({
      ...data,
      signinNo,
      source: DataSource.SIGNIN_QRCODE,
      signinType: SigninType.NORMAL,
      createdBy: user.id
    });
    
    await createAuditLog({
      action: AuditAction.SUBMIT,
      source: DataSource.SIGNIN_QRCODE,
      recordType: 'signin_record',
      recordId: signin.id,
      recordNo: signin.signinNo,
      afterData: signin.toJSON(),
      changeReason: '提交签到记录',
      operatorId: user.id,
      operatorName: user.realName,
      operatorRole: user.role,
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      data: filterFieldsByRole(signin.toJSON(), user.role)
    });
  } catch (error: any) {
    console.error('提交签到错误:', error);
    
    const retryCategory = classifyError(error);
    
    const queueItem = await addToCompensationQueue({
      source: DataSource.SIGNIN_QRCODE,
      signinType: SigninType.NORMAL,
      employeeId: req.body.employeeId,
      employeeName: req.body.employeeName,
      department: req.body.department,
      trainingId: req.body.trainingId,
      trainingName: req.body.trainingName,
      trainingDate: req.body.trainingDate,
      signinTime: req.body.signinTime,
      retryCategory,
      errorMessage: error.message,
      errorStack: error.stack,
      originalData: req.body,
      isProxy: req.body.isProxy,
      proxyEmployeeId: req.body.proxyEmployeeId,
      proxyEmployeeName: req.body.proxyEmployeeName,
      createdBy: req.user?.id,
      operatorName: req.user?.realName,
      operatorRole: req.user?.role,
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      warning: '签到处理异常，已加入补偿队列',
      queueNo: queueItem.queueNo,
      error: error.message
    });
  }
}

export async function submitHomework(req: AuthRequest, res: Response) {
  try {
    const data = req.body;
    const user = req.user!;
    
    const homeworkNo = `HW-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const homework = await Homework.create({
      ...data,
      homeworkNo,
      source: DataSource.HOMEWORK,
      createdBy: user.id
    });
    
    await createAuditLog({
      action: AuditAction.SUBMIT,
      source: DataSource.HOMEWORK,
      recordType: 'homework',
      recordId: homework.id,
      recordNo: homework.homeworkNo,
      afterData: homework.toJSON(),
      changeReason: '提交课后作业',
      operatorId: user.id,
      operatorName: user.realName,
      operatorRole: user.role,
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      data: filterFieldsByRole(homework.toJSON(), user.role)
    });
  } catch (error: any) {
    console.error('提交作业错误:', error);
    
    const retryCategory = classifyError(error);
    
    await createFailedRecord({
      source: DataSource.HOMEWORK,
      recordType: 'homework',
      retryCategory,
      errorMessage: error.message,
      errorDetail: error.stack,
      originalData: req.body,
      createdBy: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      retryCategory
    });
  }
}

export async function submitPriceAdjustment(req: AuthRequest, res: Response) {
  try {
    const data = req.body;
    const user = req.user!;
    
    const adjustmentNo = `PRC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const adjustment = await ManualPriceAdjustment.create({
      ...data,
      adjustmentNo,
      source: DataSource.MANUAL_PRICE,
      isApproved: false,
      createdBy: user.id
    });
    
    await createAuditLog({
      action: AuditAction.SUBMIT,
      source: DataSource.MANUAL_PRICE,
      recordType: 'manual_price_adjustment',
      recordId: adjustment.id,
      recordNo: adjustment.adjustmentNo,
      afterData: adjustment.toJSON(),
      changeReason: '提交手工改价申请',
      operatorId: user.id,
      operatorName: user.realName,
      operatorRole: user.role,
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      data: filterFieldsByRole(adjustment.toJSON(), user.role)
    });
  } catch (error: any) {
    console.error('提交改价错误:', error);
    
    const retryCategory = classifyError(error);
    
    await createFailedRecord({
      source: DataSource.MANUAL_PRICE,
      recordType: 'manual_price_adjustment',
      retryCategory,
      errorMessage: error.message,
      errorDetail: error.stack,
      originalData: req.body,
      createdBy: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      retryCategory
    });
  }
}

export async function submitHistoryArchive(req: AuthRequest, res: Response) {
  try {
    const data = req.body;
    const user = req.user!;
    
    const results: any[] = [];
    
    if (data.registrations) {
      for (const reg of data.registrations) {
        const registrationNo = `REG-ARCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const registration = await TrainingRegistration.create({
          ...reg,
          registrationNo,
          source: DataSource.HISTORY_ARCHIVE,
          createdBy: user.id
        });
        results.push({ type: 'registration', id: registration.id, no: registrationNo });
      }
    }
    
    if (data.signins) {
      for (const sig of data.signins) {
        try {
          const signinNo = `SIG-ARCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
          const signin = await SigninRecord.create({
            ...sig,
            signinNo,
            source: DataSource.HISTORY_ARCHIVE,
            signinType: SigninType.MANUAL,
            createdBy: user.id
          });
          results.push({ type: 'signin', id: signin.id, no: signinNo });
        } catch (signinError: any) {
          const retryCategory = classifyError(signinError);
          await addToCompensationQueue({
            source: DataSource.HISTORY_ARCHIVE,
            signinType: SigninType.MANUAL,
            employeeId: sig.employeeId,
            employeeName: sig.employeeName,
            department: sig.department,
            trainingId: sig.trainingId,
            trainingName: sig.trainingName,
            trainingDate: sig.trainingDate,
            signinTime: sig.signinTime,
            retryCategory,
            errorMessage: signinError.message,
            originalData: sig,
            createdBy: user.id,
            operatorName: user.realName,
            operatorRole: user.role,
            ipAddress: req.ip
          });
          results.push({ type: 'signin', status: 'queued', error: signinError.message });
        }
      }
    }
    
    await createAuditLog({
      action: AuditAction.SUBMIT,
      source: DataSource.HISTORY_ARCHIVE,
      recordType: 'history_archive',
      afterData: { results, count: results.length },
      changeReason: '导入历史压缩包数据',
      operatorId: user.id,
      operatorName: user.realName,
      operatorRole: user.role,
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      imported: results.length,
      results
    });
  } catch (error: any) {
    console.error('导入历史数据错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export async function uploadHistoryArchive(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: '请上传压缩包文件'
      });
    }
    
    const uploadDir = path.join(process.cwd(), 'uploads', 'history-archives');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const ext = path.extname(file.originalname).toLowerCase();
    const extractDir = path.join(uploadDir, `extract-${Date.now()}`);
    fs.mkdirSync(extractDir, { recursive: true });
    
    console.log(`📦 开始处理压缩包: ${file.originalname}`);
    console.log(`   解压目录: ${extractDir}`);
    
    let extractedFiles: string[] = [];
    
    if (ext === '.zip') {
      await new Promise((resolve, reject) => {
        exec(`unzip -o "${file.path}" -d "${extractDir}"`, (error, stdout, stderr) => {
          if (error) {
            console.error('unzip error:', stderr);
            return reject(new Error('解压zip文件失败'));
          }
          resolve(null);
        });
      });
    } else if (ext === '.tar' || ext === '.gz' || ext === '.tgz') {
      await new Promise((resolve, reject) => {
        const cmd = ext === '.tar' 
          ? `tar -xf "${file.path}" -C "${extractDir}"`
          : `tar -xzf "${file.path}" -C "${extractDir}"`;
        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            console.error('tar error:', stderr);
            return reject(new Error('解压tar文件失败'));
          }
          resolve(null);
        });
      });
    } else if (ext === '.rar') {
      await new Promise((resolve, reject) => {
        exec(`unrar x -o+ "${file.path}" "${extractDir}/"`, (error, stdout, stderr) => {
          if (error) {
            console.error('unrar error:', stderr);
            return reject(new Error('解压rar文件失败，请确保已安装unrar'));
          }
          resolve(null);
        });
      });
    } else {
      return res.status(400).json({
        success: false,
        error: '不支持的压缩包格式，仅支持 .zip, .tar, .tar.gz, .rar'
      });
    }
    
    const findFiles = (dir: string): string[] => {
      const results: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...findFiles(fullPath));
        } else if (entry.name.endsWith('.json')) {
          results.push(fullPath);
        }
      }
      return results;
    };
    
    extractedFiles = findFiles(extractDir);
    console.log(`   找到 ${extractedFiles.length} 个JSON文件`);
    
    if (extractedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: '压缩包中未找到JSON文件'
      });
    }
    
    const allResults: any[] = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const filePath of extractedFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        const results: any[] = [];
        
        if (data.registrations && Array.isArray(data.registrations)) {
          for (const reg of data.registrations) {
            try {
              const registrationNo = `REG-ARCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
              const registration = await TrainingRegistration.create({
                ...reg,
                registrationNo,
                source: DataSource.HISTORY_ARCHIVE,
                createdBy: user.id
              });
              results.push({ type: 'registration', id: registration.id, no: registrationNo, source: filePath });
              successCount++;
            } catch (regError: any) {
              errorCount++;
              results.push({ type: 'registration', status: 'error', error: regError.message, source: filePath });
            }
          }
        }
        
        if (data.signins && Array.isArray(data.signins)) {
          for (const sig of data.signins) {
            try {
              const signinNo = `SIG-ARCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
              const signin = await SigninRecord.create({
                ...sig,
                signinNo,
                source: DataSource.HISTORY_ARCHIVE,
                signinType: SigninType.MANUAL,
                createdBy: user.id
              });
              results.push({ type: 'signin', id: signin.id, no: signinNo, source: filePath });
              successCount++;
            } catch (signinError: any) {
              errorCount++;
              const retryCategory = classifyError(signinError);
              await addToCompensationQueue({
                source: DataSource.HISTORY_ARCHIVE,
                signinType: SigninType.MANUAL,
                employeeId: sig.employeeId,
                employeeName: sig.employeeName,
                department: sig.department,
                trainingId: sig.trainingId,
                trainingName: sig.trainingName,
                trainingDate: sig.trainingDate,
                signinTime: sig.signinTime,
                retryCategory,
                errorMessage: signinError.message,
                originalData: sig,
                createdBy: user.id,
                operatorName: user.realName,
                operatorRole: user.role,
                ipAddress: req.ip
              });
              results.push({ type: 'signin', status: 'queued', error: signinError.message, source: filePath });
            }
          }
        }
        
        allResults.push(...results);
      } catch (fileError: any) {
        errorCount++;
        allResults.push({ 
          type: 'file', 
          status: 'error', 
          file: path.basename(filePath), 
          error: fileError.message 
        });
      }
    }
    
    try {
      fs.rmSync(extractDir, { recursive: true, force: true });
      fs.unlinkSync(file.path);
    } catch (cleanupError) {
      console.warn('清理临时文件失败:', cleanupError);
    }
    
    await createAuditLog({
      action: AuditAction.SUBMIT,
      source: DataSource.HISTORY_ARCHIVE,
      recordType: 'history_archive',
      afterData: { 
        fileName: file.originalname,
        filesProcessed: extractedFiles.length,
        successCount,
        errorCount,
        results: allResults 
      },
      changeReason: `导入压缩包 ${file.originalname}`,
      operatorId: user.id,
      operatorName: user.realName,
      operatorRole: user.role,
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      fileName: file.originalname,
      filesProcessed: extractedFiles.length,
      successCount,
      errorCount,
      results: allResults
    });
    
  } catch (error: any) {
    console.error('导入压缩包错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
