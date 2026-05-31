import { Router } from 'express';
import { bookingController } from '../controllers/BookingController';
import { resourceController } from '../controllers/ResourceController';
import { exportController } from '../controllers/ExportController';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'rehearsal-room-booking-api',
      version: '1.0.0',
    },
  });
});

router.post('/bookings', bookingController.createBooking);
router.get('/bookings', bookingController.getBookings);
router.get('/bookings/:id', bookingController.getBooking);
router.put('/bookings/:id', bookingController.updateBooking);
router.post('/bookings/:id/cancel', bookingController.cancelBooking);
router.post('/bookings/:id/transition/:action', bookingController.transitionStatus);
router.post('/bookings/check-conflicts', bookingController.checkConflicts);
router.get('/status-flow', bookingController.getStatusFlow);
router.get('/stats/daily/:date', bookingController.getDailyStats);
router.get('/stats/monthly/:year/:month', bookingController.getMonthlyReport);

router.get('/rooms', resourceController.getRooms);
router.get('/rooms/:id/availability', resourceController.getRoomAvailability);

router.get('/teachers', resourceController.getTeachers);
router.get('/teachers/:id/schedule', resourceController.getTeacherSchedule);
router.post('/teacher-leaves', resourceController.createTeacherLeave);

router.get('/equipment', resourceController.getEquipment);
router.get('/equipment-loans', resourceController.getEquipmentLoans);
router.post('/equipment-loans/:loanId/return', resourceController.returnEquipment);

router.get('/conflict-types', resourceController.getConflictTypes);
router.get('/waitlist', resourceController.getWaitlist);

router.get('/export/bookings/excel', exportController.exportBookingsToExcel);
router.get('/export/monthly/:year/:month/excel', exportController.exportMonthlyReportToExcel);
router.get('/export/bookings/:id/pdf', exportController.exportBookingDetailToPDF);

export default router;
