const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class Appointment {
  static async create(data) {
    const id = uuidv4();
    const now = moment().toISOString();
    
    await db.run(`
      INSERT INTO appointments (
        id, appointment_no, patient_id, patient_name, patient_phone,
        doctor_id, doctor_name, department, appointment_date, appointment_time,
        treatment_type, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      id,
      data.appointment_no,
      data.patient_id,
      data.patient_name,
      data.patient_phone || null,
      data.doctor_id,
      data.doctor_name,
      data.department,
      data.appointment_date,
      data.appointment_time,
      data.treatment_type,
      data.status || 'scheduled',
      now,
      now
    );
    
    return this.findById(id);
  }

  static async findById(id) {
    return await db.get('SELECT * FROM appointments WHERE id = ?', id);
  }

  static async findByAppointmentNo(appointmentNo) {
    return await db.get('SELECT * FROM appointments WHERE appointment_no = ?', appointmentNo);
  }

  static async findAll(options = {}) {
    let sql = 'SELECT * FROM appointments WHERE 1=1';
    const params = [];
    
    if (options.appointment_no) {
      sql += ' AND appointment_no LIKE ?';
      params.push(`%${options.appointment_no}%`);
    }
    
    if (options.doctor_name) {
      sql += ' AND doctor_name LIKE ?';
      params.push(`%${options.doctor_name}%`);
    }
    
    if (options.patient_name) {
      sql += ' AND patient_name LIKE ?';
      params.push(`%${options.patient_name}%`);
    }
    
    if (options.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }
    
    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }
    
    return await db.all(sql, ...params);
  }

  static async update(id, data) {
    const now = moment().toISOString();
    const updates = [];
    const values = [];
    
    Object.keys(data).forEach(key => {
      if (key !== 'id' && key !== 'created_at') {
        updates.push(`${key} = ?`);
        values.push(data[key]);
      }
    });
    
    if (updates.length === 0) return this.findById(id);
    
    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    await db.run(`UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`, ...values);
    return this.findById(id);
  }
}

module.exports = Appointment;
