const { db, generateNo } = require('../models/db');
const auditTrailService = require('../services/auditTrailService');
const dirtyRecordService = require('../services/dirtyRecordService');

class TravelController {
  async createApplication(req, res) {
    try {
      const data = req.body;
      const applicationNo = data.application_no || generateNo('TA');
      const rawData = JSON.stringify(data);

      const requiredFields = ['applicant_id', 'applicant_name', 'travel_start_date', 'travel_end_date', 'travel_destination'];
      const dirtyRecords = [];

      const result = await db.insert('travel_applications', {
        application_no: applicationNo,
        applicant_id: data.applicant_id,
        applicant_name: data.applicant_name,
        department: data.department,
        travel_start_date: data.travel_start_date,
        travel_end_date: data.travel_end_date,
        travel_destination: data.travel_destination,
        travel_purpose: data.travel_purpose,
        estimated_accommodation_amount: data.estimated_accommodation_amount,
        estimated_transportation_amount: data.estimated_transportation_amount,
        estimated_total_amount: data.estimated_total_amount,
        status: data.status || 'pending',
        shared_trip_group_id: data.shared_trip_group_id,
        raw_data: rawData
      });

      const missingFieldRecords = await dirtyRecordService.checkMissingFields(
        'travel_applications', data, requiredFields, result.lastID, applicationNo
      );
      dirtyRecords.push(...missingFieldRecords);

      const crossDateRecords = await dirtyRecordService.checkCrossDate(
        'travel_applications', data, 'travel_start_date', 'travel_end_date', result.lastID, applicationNo
      );
      dirtyRecords.push(...crossDateRecords);

      const application = await db.findById('travel_applications', result.lastID);

      await auditTrailService.logCreate(
        'TRAVEL_APPLICATION',
        'travel_applications',
        result.lastID,
        applicationNo,
        application,
        req.body.operator || 'api'
      );

      res.json({
        success: true,
        data: application,
        dirty_records: dirtyRecords.length,
        message: '差旅申请创建成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getApplications(req, res) {
    try {
      const { applicant_id, department, status, shared_trip_group_id, start_date, end_date } = req.query;
      let sql = 'SELECT * FROM travel_applications WHERE 1=1';
      const params = [];

      if (applicant_id) { sql += ' AND applicant_id = ?'; params.push(applicant_id); }
      if (department) { sql += ' AND department = ?'; params.push(department); }
      if (status) { sql += ' AND status = ?'; params.push(status); }
      if (shared_trip_group_id) { sql += ' AND shared_trip_group_id = ?'; params.push(shared_trip_group_id); }
      if (start_date) { sql += ' AND travel_start_date >= ?'; params.push(start_date); }
      if (end_date) { sql += ' AND travel_end_date <= ?'; params.push(end_date); }

      sql += ' ORDER BY created_at DESC';
      const applications = await db.all(sql, params);

      res.json({ success: true, data: applications });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getApplicationById(req, res) {
    try {
      const application = await db.findByNo('travel_applications', 'application_no', req.params.no);
      if (!application) {
        return res.status(404).json({ success: false, error: '差旅申请不存在' });
      }
      res.json({ success: true, data: application });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async updateApplication(req, res) {
    try {
      const applicationNo = req.params.no;
      const oldData = await db.findByNo('travel_applications', 'application_no', applicationNo);
      if (!oldData) {
        return res.status(404).json({ success: false, error: '差旅申请不存在' });
      }

      const data = req.body;
      const updateData = {};
      const allowedFields = ['applicant_name', 'department', 'travel_start_date', 'travel_end_date', 
                             'travel_destination', 'travel_purpose', 'estimated_accommodation_amount',
                             'estimated_transportation_amount', 'estimated_total_amount', 'status',
                             'shared_trip_group_id'];
      
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      }
      updateData.updated_at = new Date().toISOString();

      await db.update('travel_applications', updateData, 'application_no = ?', [applicationNo]);

      if (data.applicant_name) {
        await dirtyRecordService.checkNameChange(
          'travel_applications', data, oldData, 'applicant_name', oldData.id, applicationNo
        );
      }

      const newData = await db.findByNo('travel_applications', 'application_no', applicationNo);

      await auditTrailService.logUpdate(
        'TRAVEL_APPLICATION',
        'travel_applications',
        oldData.id,
        applicationNo,
        oldData,
        newData,
        req.body.operator || 'api'
      );

      res.json({ success: true, data: newData, message: '差旅申请更新成功' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getSharedTripGroup(req, res) {
    try {
      const groupId = req.params.group_id;
      const applications = await db.all(
        'SELECT * FROM travel_applications WHERE shared_trip_group_id = ?',
        [groupId]
      );
      
      const invoices = await db.all(`
        SELECT i.* FROM invoices i
        JOIN travel_applications ta ON i.travel_application_no = ta.application_no
        WHERE ta.shared_trip_group_id = ?
      `, [groupId]);

      res.json({
        success: true,
        data: {
          group_id: groupId,
          applications,
          invoices,
          application_count: applications.length,
          invoice_count: invoices.length
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new TravelController();
