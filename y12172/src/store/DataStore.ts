import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import {
  Booking,
  Room,
  Teacher,
  Equipment,
  TeacherLeave,
  EquipmentLoan,
  WaitlistEntry,
  UUID,
} from '../types';

export class DataStore {
  private static instance: DataStore;
  private bookings: Map<UUID, Booking> = new Map();
  private rooms: Map<UUID, Room> = new Map();
  private teachers: Map<UUID, Teacher> = new Map();
  private equipment: Map<UUID, Equipment> = new Map();
  private teacherLeaves: Map<UUID, TeacherLeave> = new Map();
  private equipmentLoans: Map<UUID, EquipmentLoan> = new Map();
  private waitlistEntries: Map<UUID, WaitlistEntry> = new Map();

  private constructor() {
    this.initializeSampleData();
  }

  public static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  private initializeSampleData(): void {
    const now = new Date();

    this.rooms.set('room-001', {
      id: 'room-001',
      name: 'A排练室 - 钢琴房',
      capacity: 4,
      facilities: ['三角钢琴', '音响', '空调'],
      hourlyRate: 200,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    this.rooms.set('room-002', {
      id: 'room-002',
      name: 'B排练室 - 乐队房',
      capacity: 8,
      facilities: ['架子鼓', '贝斯音箱', '吉他音箱', '调音台'],
      hourlyRate: 300,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    this.rooms.set('room-003', {
      id: 'room-003',
      name: 'C排练室 - 声乐房',
      capacity: 2,
      facilities: ['麦克风', '耳机', '隔音棉'],
      hourlyRate: 150,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    this.teachers.set('teacher-001', {
      id: 'teacher-001',
      name: '张老师',
      instrument: '钢琴',
      phone: '13800138001',
      email: 'zhang@music.com',
      hourlyRate: 300,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    this.teachers.set('teacher-002', {
      id: 'teacher-002',
      name: '李老师',
      instrument: '吉他',
      phone: '13800138002',
      email: 'li@music.com',
      hourlyRate: 250,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    this.teachers.set('teacher-003', {
      id: 'teacher-003',
      name: '王老师',
      instrument: '架子鼓',
      phone: '13800138003',
      email: 'wang@music.com',
      hourlyRate: 280,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    this.equipment.set('equip-001', {
      id: 'equip-001',
      name: 'YAMAHA C70 古典吉他',
      category: '吉他',
      brand: 'YAMAHA',
      serialNumber: 'SN-GT-2024-001',
      status: 'AVAILABLE',
      purchaseDate: dayjs('2024-01-15').toDate(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    this.equipment.set('equip-002', {
      id: 'equip-002',
      name: 'SHURE SM58 麦克风',
      category: '麦克风',
      brand: 'SHURE',
      serialNumber: 'SN-MIC-2024-001',
      status: 'AVAILABLE',
      purchaseDate: dayjs('2024-02-20').toDate(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    this.equipment.set('equip-003', {
      id: 'equip-003',
      name: 'Roland TD-17KV 电子鼓',
      category: '架子鼓',
      brand: 'Roland',
      serialNumber: 'SN-DR-2024-001',
      status: 'AVAILABLE',
      purchaseDate: dayjs('2024-03-10').toDate(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    this.equipment.set('equip-004', {
      id: 'equip-004',
      name: 'KORG PA5X 编曲键盘',
      category: '键盘',
      brand: 'KORG',
      serialNumber: 'SN-KB-2024-001',
      status: 'MAINTENANCE',
      purchaseDate: dayjs('2023-11-05').toDate(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    this.teacherLeaves.set('leave-001', {
      id: 'leave-001',
      teacherId: 'teacher-001',
      startDate: dayjs().add(7, 'day').startOf('day').toDate(),
      endDate: dayjs().add(7, 'day').endOf('day').toDate(),
      reason: '年度体检',
      isHalfDay: false,
      createdAt: now,
      updatedAt: now,
    });

    const booking1Start = dayjs().add(1, 'day').hour(9).minute(0).toDate();
    const booking1End = dayjs().add(1, 'day').hour(11).minute(0).toDate();

    this.bookings.set('booking-001', {
      id: 'booking-001',
      customerName: '小明',
      customerPhone: '13900139001',
      customerEmail: 'xiaoming@email.com',
      startTime: booking1Start,
      endTime: booking1End,
      isCrossDay: false,
      status: 'CONFIRMED',
      roomId: 'room-001',
      teacherId: 'teacher-001',
      equipmentIds: ['equip-002'],
      purpose: '钢琴考级练习',
      numberOfPeople: 1,
      remarks: '需要提前调试钢琴',
      sourceSystem: 'ROOM_SYSTEM',
      createdBy: 'admin',
      createdAt: now,
      updatedAt: now,
    });

    this.equipmentLoans.set('loan-001', {
      id: 'loan-001',
      bookingId: 'booking-001',
      equipmentId: 'equip-002',
      borrowerName: '小明',
      borrowerPhone: '13900139001',
      checkoutTime: booking1Start,
      expectedReturnTime: booking1End,
      condition: 'GOOD',
      createdAt: now,
      updatedAt: now,
    });

    const booking2Start = dayjs().add(1, 'day').hour(14).minute(0).toDate();
    const booking2End = dayjs().add(1, 'day').hour(17).minute(0).toDate();

    this.bookings.set('booking-002', {
      id: 'booking-002',
      customerName: '乐队-飞翔',
      customerPhone: '13900139002',
      startTime: booking2Start,
      endTime: booking2End,
      isCrossDay: false,
      status: 'CONFIRMED',
      roomId: 'room-002',
      equipmentIds: ['equip-001', 'equip-003'],
      purpose: '乐队排练',
      numberOfPeople: 5,
      sourceSystem: 'TEACHER_SYSTEM',
      createdBy: '前台小李',
      createdAt: now,
      updatedAt: now,
    });

    const crossDayStart = dayjs().add(3, 'day').hour(22).minute(0).toDate();
    const crossDayEnd = dayjs().add(4, 'day').hour(2).minute(0).toDate();

    this.bookings.set('booking-003', {
      id: 'booking-003',
      customerName: '深夜创作组',
      customerPhone: '13900139003',
      startTime: crossDayStart,
      endTime: crossDayEnd,
      isCrossDay: true,
      status: 'PENDING',
      roomId: 'room-002',
      equipmentIds: [],
      purpose: '专辑录制',
      numberOfPeople: 3,
      remarks: '跨日预约，需要确认',
      sourceSystem: 'MANUAL',
      createdBy: 'admin',
      createdAt: now,
      updatedAt: now,
    });
  }

  createBooking(booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Booking {
    const now = new Date();
    const newBooking: Booking = {
      ...booking,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    this.bookings.set(newBooking.id, newBooking);
    return newBooking;
  }

  getBooking(id: UUID): Booking | undefined {
    return this.bookings.get(id);
  }

  getAllBookings(): Booking[] {
    return Array.from(this.bookings.values());
  }

  updateBooking(id: UUID, updates: Partial<Booking>): Booking | undefined {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    const updated = { ...booking, ...updates, updatedAt: new Date() };
    this.bookings.set(id, updated);
    return updated;
  }

  deleteBooking(id: UUID): boolean {
    return this.bookings.delete(id);
  }

  getBookingsByDateRange(start: Date, end: Date): Booking[] {
    return Array.from(this.bookings.values()).filter(
      (b) =>
        b.status !== 'CANCELLED' &&
        b.startTime < end &&
        b.endTime > start
    );
  }

  getBookingsByRoom(roomId: UUID, excludeCancelled = true): Booking[] {
    return Array.from(this.bookings.values()).filter(
      (b) => b.roomId === roomId && (!excludeCancelled || b.status !== 'CANCELLED')
    );
  }

  getBookingsByTeacher(teacherId: UUID, excludeCancelled = true): Booking[] {
    return Array.from(this.bookings.values()).filter(
      (b) => b.teacherId === teacherId && (!excludeCancelled || b.status !== 'CANCELLED')
    );
  }

  getBookingsByEquipment(equipmentId: UUID, excludeCancelled = true): Booking[] {
    return Array.from(this.bookings.values()).filter(
      (b) => b.equipmentIds.includes(equipmentId) && (!excludeCancelled || b.status !== 'CANCELLED')
    );
  }

  createRoom(room: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>): Room {
    const now = new Date();
    const newRoom: Room = {
      ...room,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    this.rooms.set(newRoom.id, newRoom);
    return newRoom;
  }

  getRoom(id: UUID): Room | undefined {
    return this.rooms.get(id);
  }

  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  updateRoom(id: UUID, updates: Partial<Room>): Room | undefined {
    const room = this.rooms.get(id);
    if (!room) return undefined;
    const updated = { ...room, ...updates, updatedAt: new Date() };
    this.rooms.set(id, updated);
    return updated;
  }

  createTeacher(teacher: Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'>): Teacher {
    const now = new Date();
    const newTeacher: Teacher = {
      ...teacher,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    this.teachers.set(newTeacher.id, newTeacher);
    return newTeacher;
  }

  getTeacher(id: UUID): Teacher | undefined {
    return this.teachers.get(id);
  }

  getAllTeachers(): Teacher[] {
    return Array.from(this.teachers.values());
  }

  updateTeacher(id: UUID, updates: Partial<Teacher>): Teacher | undefined {
    const teacher = this.teachers.get(id);
    if (!teacher) return undefined;
    const updated = { ...teacher, ...updates, updatedAt: new Date() };
    this.teachers.set(id, updated);
    return updated;
  }

  createEquipment(equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Equipment {
    const now = new Date();
    const newEquipment: Equipment = {
      ...equipment,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    this.equipment.set(newEquipment.id, newEquipment);
    return newEquipment;
  }

  getEquipment(id: UUID): Equipment | undefined {
    return this.equipment.get(id);
  }

  getAllEquipment(): Equipment[] {
    return Array.from(this.equipment.values());
  }

  updateEquipment(id: UUID, updates: Partial<Equipment>): Equipment | undefined {
    const equip = this.equipment.get(id);
    if (!equip) return undefined;
    const updated = { ...equip, ...updates, updatedAt: new Date() };
    this.equipment.set(id, updated);
    return updated;
  }

  createTeacherLeave(leave: Omit<TeacherLeave, 'id' | 'createdAt' | 'updatedAt'>): TeacherLeave {
    const now = new Date();
    const newLeave: TeacherLeave = {
      ...leave,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    this.teacherLeaves.set(newLeave.id, newLeave);
    return newLeave;
  }

  getTeacherLeave(id: UUID): TeacherLeave | undefined {
    return this.teacherLeaves.get(id);
  }

  getTeacherLeavesByTeacher(teacherId: UUID): TeacherLeave[] {
    return Array.from(this.teacherLeaves.values()).filter(
      (l) => l.teacherId === teacherId
    );
  }

  getTeacherLeavesByDateRange(start: Date, end: Date): TeacherLeave[] {
    return Array.from(this.teacherLeaves.values()).filter(
      (l) => l.startDate <= end && l.endDate >= start
    );
  }

  getAllTeacherLeaves(): TeacherLeave[] {
    return Array.from(this.teacherLeaves.values());
  }

  createEquipmentLoan(loan: Omit<EquipmentLoan, 'id' | 'createdAt' | 'updatedAt'>): EquipmentLoan {
    const now = new Date();
    const newLoan: EquipmentLoan = {
      ...loan,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    this.equipmentLoans.set(newLoan.id, newLoan);
    return newLoan;
  }

  getEquipmentLoan(id: UUID): EquipmentLoan | undefined {
    return this.equipmentLoans.get(id);
  }

  getEquipmentLoansByBooking(bookingId: UUID): EquipmentLoan[] {
    return Array.from(this.equipmentLoans.values()).filter(
      (l) => l.bookingId === bookingId
    );
  }

  getEquipmentLoansByEquipment(equipmentId: UUID): EquipmentLoan[] {
    return Array.from(this.equipmentLoans.values()).filter(
      (l) => l.equipmentId === equipmentId
    );
  }

  getActiveEquipmentLoans(): EquipmentLoan[] {
    return Array.from(this.equipmentLoans.values()).filter(
      (l) => !l.actualReturnTime
    );
  }

  getOverdueEquipmentLoans(asOf: Date = new Date()): EquipmentLoan[] {
    return Array.from(this.equipmentLoans.values()).filter(
      (l) => !l.actualReturnTime && l.expectedReturnTime < asOf
    );
  }

  updateEquipmentLoan(id: UUID, updates: Partial<EquipmentLoan>): EquipmentLoan | undefined {
    const loan = this.equipmentLoans.get(id);
    if (!loan) return undefined;
    const updated = { ...loan, ...updates, updatedAt: new Date() };
    this.equipmentLoans.set(id, updated);
    return updated;
  }

  getAllEquipmentLoans(): EquipmentLoan[] {
    return Array.from(this.equipmentLoans.values());
  }

  createWaitlistEntry(entry: Omit<WaitlistEntry, 'id' | 'createdAt'>): WaitlistEntry {
    const now = new Date();
    const newEntry: WaitlistEntry = {
      ...entry,
      id: uuidv4(),
      createdAt: now,
    };
    this.waitlistEntries.set(newEntry.id, newEntry);
    return newEntry;
  }

  getWaitlistEntry(id: UUID): WaitlistEntry | undefined {
    return this.waitlistEntries.get(id);
  }

  getWaitlistByRoom(roomId: UUID): WaitlistEntry[] {
    return Array.from(this.waitlistEntries.values())
      .filter((e) => e.roomId === roomId && e.expiresAt > new Date())
      .sort((a, b) => a.priority - b.priority);
  }

  getExpiredWaitlistEntries(asOf: Date = new Date()): WaitlistEntry[] {
    return Array.from(this.waitlistEntries.values()).filter(
      (e) => e.expiresAt < asOf
    );
  }

  deleteWaitlistEntry(id: UUID): boolean {
    return this.waitlistEntries.delete(id);
  }

  getAllWaitlistEntries(): WaitlistEntry[] {
    return Array.from(this.waitlistEntries.values());
  }

  reset(): void {
    this.bookings.clear();
    this.rooms.clear();
    this.teachers.clear();
    this.equipment.clear();
    this.teacherLeaves.clear();
    this.equipmentLoans.clear();
    this.waitlistEntries.clear();
    this.initializeSampleData();
  }
}

export const dataStore = DataStore.getInstance();
