export const FLIGHT_DATA = {
  gateAssignments: {
    A: ['CA1234', 'CA5678', 'CA9012', 'MU3456', 'MU7890'],
    B: ['CZ1111', 'CZ2222', 'CZ3333', 'HU4444', 'HU5555'],
    C: ['3U6666', '3U7777', 'ZH8888', 'ZH9999', 'MF0000'],
    D: ['SC1122', 'SC3344', 'SC5566', 'MU1212', 'CA3434'],
  } as Record<string, string[]>,
};

export function generateFlightNo(): string {
  const airlines = ['CA', 'MU', 'CZ', 'HU', '3U', 'ZH', 'MF', 'SC'];
  const airline = airlines[Math.floor(Math.random() * airlines.length)];
  const number = Math.floor(Math.random() * 9000 + 1000);
  return `${airline}${number}`;
}

export function getGateForFlight(flightNo: string): 'A' | 'B' | 'C' | 'D' {
  const hash = flightNo.charCodeAt(0) + flightNo.charCodeAt(1) + parseInt(flightNo.slice(2));
  const gates: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  return gates[hash % 4];
}
