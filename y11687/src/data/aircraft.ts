import { AircraftSpec } from '../types';

export const aircraftSpecs: AircraftSpec[] = [
  {
    type: 'B737-800',
    name: '波音737-800',
    cruiseSpeed: 850,
    fuelBurnRate: 2.6,
    fuelCapacity: 20.9,
    maxRange: 5460,
    maxAltitude: 12500,
    dataSource: '波音民用飞机集团官方技术手册',
  },
  {
    type: 'A320neo',
    name: '空客A320neo',
    cruiseSpeed: 840,
    fuelBurnRate: 2.3,
    fuelCapacity: 18.7,
    maxRange: 6300,
    maxAltitude: 12100,
    dataSource: '空中客车公司官方技术手册',
  },
  {
    type: 'B787-9',
    name: '波音787-9梦想客机',
    cruiseSpeed: 903,
    fuelBurnRate: 5.4,
    fuelCapacity: 101.5,
    maxRange: 14140,
    maxAltitude: 13100,
    dataSource: '波音民用飞机集团官方技术手册',
  },
];

export const defaultAircraft: AircraftSpec = aircraftSpecs[0];

export const getAircraftByType = (type: string): AircraftSpec | undefined => {
  return aircraftSpecs.find(aircraft => aircraft.type === type);
};
