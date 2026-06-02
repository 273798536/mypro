import type { Instrument, Transport, CitySchedule } from '@/store/types';

export const mapInstrumentToTransport = (
  instruments: Instrument[],
  transports: Transport[]
): Map<string, Transport> => {
  const map = new Map<string, Transport>();
  instruments.forEach((inst) => {
    if (inst.transportId) {
      const transport = transports.find((t) => t.id === inst.transportId);
      if (transport) {
        map.set(inst.id, transport);
      }
    }
  });
  return map;
};

export const mapInstrumentToSchedule = (
  instruments: Instrument[],
  schedules: CitySchedule[]
): Map<string, CitySchedule> => {
  const map = new Map<string, CitySchedule>();
  instruments.forEach((inst) => {
    if (inst.scheduleId) {
      const schedule = schedules.find((s) => s.id === inst.scheduleId);
      if (schedule) {
        map.set(inst.id, schedule);
      }
    }
  });
  return map;
};

export const getInstrumentWithRelations = (
  instrumentId: string,
  instruments: Instrument[],
  transports: Transport[],
  schedules: CitySchedule[]
) => {
  const instrument = instruments.find((i) => i.id === instrumentId);
  const transport = transports.find((t) => t.id === instrument?.transportId);
  const schedule = schedules.find((s) => s.id === instrument?.scheduleId);
  return { instrument, transport, schedule };
};

export const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getDaysDiff = (date1: string, date2: string): number => {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
};

export const isDatePast = (dateStr: string): boolean => {
  return new Date(dateStr) < new Date();
};

export const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getInstrumentById = (id: string, instruments: Instrument[]): Instrument | undefined => {
  return instruments.find((i) => i.id === id);
};

export const getTransportByInstrumentId = (instrumentId: string, instruments: Instrument[], transports: Transport[]): Transport | undefined => {
  const instrument = instruments.find((i) => i.id === instrumentId);
  if (!instrument || !instrument.transportId) return undefined;
  return transports.find((t) => t.id === instrument.transportId);
};
