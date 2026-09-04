import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CameraFeed } from '../types';
import { webSocketService, RealYoloDetection, TrackItem } from '../services/websocketService';
import { tacticalAlertDispatcher } from '../utils/tacticalAlertDispatcher';

interface CameraFeedCanvasProps {
  camera: CameraFeed;
  showAiBoxes?: boolean;
  showZones?: boolean;
  showMotionTrails?: boolean;
  isNightVision?: boolean;
  onSimulateThreat?: () => void;
  className?: string;
  onCountsUpdate?: (counts: { persons: number; vehicles: number; animals: number; total: number }) => void;
  muted?: boolean;
}

export interface DetectionStyleConfig {
  strokeColor: string;
  fillColor: string;
  badgeBg: string;
  badgeTextColor: string;
  categoryLabel: string;
  isHighPriority: boolean;
  entityType: 'human' | 'vehicle' | 'animal' | 'object' | 'other';
}

export const getDetectionClassStyle = (
  rawClass: string,
  options?: {
    isThreat?: boolean;
    isUnauthorized?: boolean;
    confidence?: number;
    riskScore?: number;
    isSuspiciousArea?: boolean;
    isCrossingLine?: boolean;
  }
): DetectionStyleConfig => {
  const norm = (rawClass || 'object').toLowerCase().trim();
  const isThreat = options?.isThreat ?? false;
  const isUnauthorized = options?.isUnauthorized ?? false;
  const isSuspiciousArea = options?.isSuspiciousArea ?? false;
  const isCrossingLine = options?.isCrossingLine ?? false;

  const isVehicle =
    norm.includes('vehicle') ||
    norm === 'car' ||
    norm === 'truck' ||
    norm === 'bus' ||
    norm === 'van' ||
    norm === 'motorcycle' ||
    norm === 'bicycle' ||
    norm === 'suv' ||
    norm.includes('transport') ||
    norm.includes('jeep');

  const isAnimal =
    norm.includes('animal') ||
    norm.includes('dog') ||
    norm.includes('canine') ||
    norm.includes('wildlife') ||
    norm.includes('cattle') ||
    norm.includes('horse') ||
    norm.includes('bird') ||
    norm.includes('cow') ||
    norm.includes('sheep') ||
    norm.includes('k9');

  const isHuman =
    norm === 'person' ||
    norm.includes('pedestrian') ||
    norm.includes('human') ||
    norm.includes('guard') ||
    norm.includes('patrol') ||
    norm.includes('officer') ||
    norm.includes('intruder');

  // 1. Line Crossing Breach -> Crimson Flashing Alert
  if (isCrossingLine) {
    const label = isVehicle
      ? 'VEHICLE CROSSING LINE'
      : isAnimal
      ? 'ANIMAL CROSSING LINE'
      : 'HUMAN CROSSING LINE';
    return {
      strokeColor: '#dc2626',
      fillColor: 'rgba(220, 38, 38, 0.22)',
      badgeBg: 'rgba(220, 38, 38, 0.95)',
      badgeTextColor: '#ffffff',
      categoryLabel: label,
      isHighPriority: true,
      entityType: isVehicle ? 'vehicle' : isAnimal ? 'animal' : 'human',
    };
  }

  // 2. Near Line / Suspicious Area -> Warning Amber / Orange
  if (isSuspiciousArea) {
    const label = isVehicle
      ? 'VEHICLE IN SUSPICIOUS AREA'
      : isAnimal
      ? 'ANIMAL IN SUSPICIOUS AREA'
      : 'HUMAN IN SUSPICIOUS AREA';
    return {
      strokeColor: '#f97316',
      fillColor: 'rgba(249, 115, 22, 0.18)',
      badgeBg: 'rgba(249, 115, 22, 0.95)',
      badgeTextColor: '#ffffff',
      categoryLabel: label,
      isHighPriority: true,
      entityType: isVehicle ? 'vehicle' : isAnimal ? 'animal' : 'human',
    };
  }

  // 3. Intrusion / Weapon / Threat Cases -> Tactical Red
  if (
    isThreat ||
    isUnauthorized ||
    norm.includes('intruder') ||
    norm.includes('intrusion') ||
    norm.includes('breach') ||
    norm.includes('weapon')
  ) {
    return {
      strokeColor: '#ef4444',
      fillColor: 'rgba(239, 68, 68, 0.14)',
      badgeBg: 'rgba(239, 68, 68, 0.92)',
      badgeTextColor: '#ffffff',
      categoryLabel: isVehicle ? 'UNAUTHORIZED VEHICLE' : 'INTRUDER',
      isHighPriority: true,
      entityType: isVehicle ? 'vehicle' : 'human',
    };
  }

  // 4. Animals / Canine / Wildlife -> Tactical Purple / Violet
  if (isAnimal) {
    const label = norm.includes('k9') || norm.includes('canine') ? 'K9 CANINE UNIT' : 'ANIMAL / WILDLIFE';
    return {
      strokeColor: '#a855f7',
      fillColor: 'rgba(168, 85, 247, 0.14)',
      badgeBg: 'rgba(168, 85, 247, 0.90)',
      badgeTextColor: '#ffffff',
      categoryLabel: label,
      isHighPriority: false,
      entityType: 'animal',
    };
  }

  // 5. Vehicles: Cars, Trucks, Vans, Buses, Motorcycles, Bicycles -> Electric Cyan
  if (isVehicle) {
    const label = norm === 'car'
      ? 'CAR'
      : norm === 'truck'
      ? 'TRUCK'
      : norm === 'bus'
      ? 'BUS'
      : norm === 'motorcycle'
      ? 'MOTORCYCLE'
      : norm === 'bicycle'
      ? 'BICYCLE'
      : norm.includes('van')
      ? 'DELIVERY VAN'
      : norm.includes('truck')
      ? 'SUPPLY TRUCK'
      : norm.includes('jeep')
      ? 'PATROL 4X4'
      : 'VEHICLE';
    return {
      strokeColor: '#06b6d4',
      fillColor: 'rgba(6, 182, 212, 0.12)',
      badgeBg: 'rgba(6, 182, 212, 0.90)',
      badgeTextColor: '#ffffff',
      categoryLabel: label,
      isHighPriority: false,
      entityType: 'vehicle',
    };
  }

  // 6. Security Patrol / Friendly Forces -> Sky Blue
  if (
    norm.includes('patrol') ||
    norm.includes('officer') ||
    norm.includes('guard') ||
    norm.includes('friendly')
  ) {
    return {
      strokeColor: '#38bdf8',
      fillColor: 'rgba(56, 189, 248, 0.12)',
      badgeBg: 'rgba(2, 132, 199, 0.90)',
      badgeTextColor: '#ffffff',
      categoryLabel: 'SECURITY PATROL',
      isHighPriority: false,
      entityType: 'human',
    };
  }

  // 7. Normal Person / Civilian Pedestrian -> Emerald Green
  if (isHuman) {
    return {
      strokeColor: '#10b981',
      fillColor: 'rgba(16, 185, 129, 0.10)',
      badgeBg: 'rgba(16, 185, 129, 0.90)',
      badgeTextColor: '#ffffff',
      categoryLabel: norm.includes('pedestrian') ? 'PEDESTRIAN' : 'PERSON',
      isHighPriority: false,
      entityType: 'human',
    };
  }

  // 8. Default Object / Unclassified Equipment -> Slate/Silver Neutral
  return {
    strokeColor: '#94a3b8',
    fillColor: 'rgba(148, 163, 184, 0.10)',
    badgeBg: 'rgba(100, 116, 139, 0.90)',
    badgeTextColor: '#ffffff',
    categoryLabel: norm.toUpperCase(),
    isHighPriority: false,
    entityType: 'object',
  };
};

export interface TacticalLine {
  id: string;
  name: string;
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  isZebraCrossing?: boolean;
  bufferThreshold: number;
}

export const getCameraTacticalLine = (camId: string, camCode: string): TacticalLine => {
  const norm = `${camId} ${camCode}`.toLowerCase();
  // CAM-08: Aerial intersection with road and zebra crossing
  if (norm.includes('8') || norm.includes('cam-08') || norm.includes('observation') || norm.includes('delta')) {
    return {
      id: 'line-cam-08-zebra',
      name: 'ZEBRA CROSSING & ROADWAY TRIPWIRE',
      p1: { x: 0.05, y: 0.49 },
      p2: { x: 0.95, y: 0.49 },
      isZebraCrossing: true,
      bufferThreshold: 0.075,
    };
  }
  if (norm.includes('1') || norm.includes('cam-01') || norm.includes('main gate')) {
    return {
      id: 'line-cam-01-border',
      name: 'SECTOR ALPHA BORDER FENCE LINE',
      p1: { x: 0.12, y: 0.42 },
      p2: { x: 0.88, y: 0.42 },
      isZebraCrossing: false,
      bufferThreshold: 0.065,
    };
  }
  if (norm.includes('2') || norm.includes('cam-02') || norm.includes('east')) {
    return {
      id: 'line-cam-02-perimeter',
      name: 'EAST PERIMETER VIRTUAL WIRE',
      p1: { x: 0.15, y: 0.46 },
      p2: { x: 0.85, y: 0.46 },
      isZebraCrossing: false,
      bufferThreshold: 0.06,
    };
  }
  if (norm.includes('3') || norm.includes('cam-03') || norm.includes('access road')) {
    return {
      id: 'line-cam-03-road',
      name: 'ACCESS ROAD VEHICLE TRIPWIRE',
      p1: { x: 0.08, y: 0.50 },
      p2: { x: 0.92, y: 0.50 },
      isZebraCrossing: false,
      bufferThreshold: 0.07,
    };
  }
  if (norm.includes('4') || norm.includes('cam-04') || norm.includes('outer fence')) {
    return {
      id: 'line-cam-04-fence',
      name: 'OUTER FENCE SECURITY LINE',
      p1: { x: 0.20, y: 0.40 },
      p2: { x: 0.80, y: 0.40 },
      isZebraCrossing: false,
      bufferThreshold: 0.06,
    };
  }
  return {
    id: `line-${camId}-tripwire`,
    name: 'SECTOR PERIMETER BORDER LINE',
    p1: { x: 0.15, y: 0.45 },
    p2: { x: 0.85, y: 0.45 },
    isZebraCrossing: false,
    bufferThreshold: 0.06,
  };
};

export interface SyntheticTrackDef {
  id: number;
  label: string;
  rawClass: string;
  baseNormX: number;
  baseNormY: number;
  ampX: number;
  ampY: number;
  speedFactor: number;
  phase: number;
  w: number;
  h: number;
  isThreat: boolean;
  trail: { x: number; y: number }[];
  state: 'NORMAL' | 'SUSPICIOUS_AREA' | 'LINE_CROSSING';
  lastStateChange: number;
  motionType?: 'linear_y' | 'linear_y_reverse' | 'linear_x' | 'linear_x_reverse' | 'crosswalk' | 'oscillate';
}

export const getCameraTracks = (camId: string, camCode: string): SyntheticTrackDef[] => {
  const norm = `${camId} ${camCode}`.toLowerCase();

  // CAM-08: Aerial intersection with road and zebra crossing (VisDrone uav0000305: Cars, Bus, Van, Motorcycle, Pedestrians. 0 Animals)
  if (norm.includes('8') || norm.includes('cam-08') || norm.includes('delta') || norm.includes('observation')) {
    return [
      // 1. Southbound Lane 1 Car (White Sedan crossing tripwire line cleanly)
      { id: 101, label: 'CAR (WHITE SEDAN)', rawClass: 'car', baseNormX: 0.425, baseNormY: 0.20, ampX: 0.002, ampY: 0.0, speedFactor: 0.28, phase: 0.4, w: 0.026, h: 0.056, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0, motionType: 'linear_y' },
      // 2. Northbound Transit Bus (Prominent lime-green transit bus driving up avenue)
      { id: 102, label: 'TRANSIT BUS (GREEN)', rawClass: 'bus', baseNormX: 0.455, baseNormY: 0.75, ampX: 0.002, ampY: 0.0, speedFactor: 0.20, phase: 1.8, w: 0.038, h: 0.115, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0, motionType: 'linear_y_reverse' },
      // 3. Northbound Red Sedan crossing intersection
      { id: 103, label: 'CAR (RED SEDAN)', rawClass: 'car', baseNormX: 0.540, baseNormY: 0.52, ampX: 0.002, ampY: 0.0, speedFactor: 0.24, phase: 2.6, w: 0.026, h: 0.054, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0, motionType: 'linear_y_reverse' },
      // 4. Southbound Grey SUV in central corridor
      { id: 104, label: 'SUV (GREY)', rawClass: 'car', baseNormX: 0.505, baseNormY: 0.45, ampX: 0.002, ampY: 0.0, speedFactor: 0.26, phase: 3.1, w: 0.027, h: 0.058, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0, motionType: 'linear_y' },
      // 5. Westbound White Delivery Van on horizontal boulevard
      { id: 105, label: 'VAN (DELIVERY VAN)', rawClass: 'van', baseNormX: 0.78, baseNormY: 0.405, ampX: 0.0, ampY: 0.002, speedFactor: 0.25, phase: 1.1, w: 0.065, h: 0.034, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0, motionType: 'linear_x_reverse' },
      // 6. Eastbound Blue Sedan on horizontal boulevard
      { id: 106, label: 'CAR (BLUE SEDAN)', rawClass: 'car', baseNormX: 0.22, baseNormY: 0.485, ampX: 0.0, ampY: 0.002, speedFactor: 0.27, phase: 2.0, w: 0.055, h: 0.028, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0, motionType: 'linear_x' },
      // 7. Motorcycle / Courier Scooter riding along roadway
      { id: 107, label: 'MOTORCYCLE (COURIER)', rawClass: 'motorcycle', baseNormX: 0.420, baseNormY: 0.58, ampX: 0.003, ampY: 0.0, speedFactor: 0.32, phase: 4.2, w: 0.016, h: 0.030, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0, motionType: 'linear_y' },
      // 8. North approach White Box Cargo Truck
      { id: 108, label: 'BOX TRUCK (WHITE)', rawClass: 'truck', baseNormX: 0.415, baseNormY: 0.15, ampX: 0.002, ampY: 0.0, speedFactor: 0.22, phase: 5.2, w: 0.035, h: 0.082, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0, motionType: 'linear_y' },
      // 9. Pedestrian 1 traversing zebra crosswalk horizontally
      { id: 201, label: 'PEDESTRIAN (CROSSWALK)', rawClass: 'person', baseNormX: 0.50, baseNormY: 0.49, ampX: 0.14, ampY: 0.004, speedFactor: 0.18, phase: 0.5, w: 0.015, h: 0.028, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0, motionType: 'crosswalk' },
      // 10. Pedestrian 2 on east sidewalk corridor
      { id: 202, label: 'PEDESTRIAN (SIDEWALK)', rawClass: 'person', baseNormX: 0.645, baseNormY: 0.42, ampX: 0.01, ampY: 0.04, speedFactor: 0.16, phase: 1.8, w: 0.014, h: 0.026, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0, motionType: 'oscillate' },
      // 11. Pedestrian 3 in upper-right open plaza
      { id: 203, label: 'PEDESTRIAN (PLAZA)', rawClass: 'person', baseNormX: 0.680, baseNormY: 0.26, ampX: 0.03, ampY: 0.02, speedFactor: 0.15, phase: 2.7, w: 0.014, h: 0.024, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0, motionType: 'oscillate' },
      // 12. Pedestrian 4 waiting/moving near west sidewalk curb
      { id: 204, label: 'PEDESTRIAN (WEST CURB)', rawClass: 'person', baseNormX: 0.340, baseNormY: 0.46, ampX: 0.015, ampY: 0.02, speedFactor: 0.14, phase: 3.9, w: 0.015, h: 0.026, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0, motionType: 'oscillate' },
    ];
  }

  // CAM-01: Sector Alpha Main Gate (Real VisDrone Basketball Court Footage: 15+ Humans, 0 Vehicles, 0 Animals)
  if (norm.includes('1') || norm.includes('cam-01') || norm.includes('main gate')) {
    return [
      { id: 1, label: 'PLAYER #1', rawClass: 'person', baseNormX: 0.268, baseNormY: 0.635, ampX: 0.03, ampY: 0.04, speedFactor: 0.32, phase: 0.5, w: 0.034, h: 0.137, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 2, label: 'PLAYER #2', rawClass: 'person', baseNormX: 0.657, baseNormY: 0.397, ampX: 0.02, ampY: 0.03, speedFactor: 0.28, phase: 1.2, w: 0.020, h: 0.099, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 3, label: 'PLAYER #3', rawClass: 'person', baseNormX: 0.235, baseNormY: 0.776, ampX: 0.04, ampY: 0.02, speedFactor: 0.35, phase: 2.1, w: 0.048, h: 0.150, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 4, label: 'PLAYER #4', rawClass: 'person', baseNormX: 0.552, baseNormY: 0.560, ampX: 0.03, ampY: 0.05, speedFactor: 0.25, phase: 3.0, w: 0.032, h: 0.122, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 5, label: 'PLAYER #5', rawClass: 'person', baseNormX: 0.368, baseNormY: 0.635, ampX: 0.04, ampY: 0.03, speedFactor: 0.30, phase: 0.8, w: 0.035, h: 0.163, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 6, label: 'PLAYER #6', rawClass: 'person', baseNormX: 0.367, baseNormY: 0.877, ampX: 0.02, ampY: 0.02, speedFactor: 0.22, phase: 1.5, w: 0.045, h: 0.123, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 7, label: 'PLAYER #7', rawClass: 'person', baseNormX: 0.618, baseNormY: 0.433, ampX: 0.03, ampY: 0.04, speedFactor: 0.31, phase: 2.8, w: 0.023, h: 0.112, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 8, label: 'PLAYER #8', rawClass: 'person', baseNormX: 0.473, baseNormY: 0.493, ampX: 0.03, ampY: 0.03, speedFactor: 0.27, phase: 3.4, w: 0.033, h: 0.127, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 9, label: 'PLAYER #9', rawClass: 'person', baseNormX: 0.126, baseNormY: 0.724, ampX: 0.02, ampY: 0.02, speedFactor: 0.20, phase: 0.3, w: 0.040, h: 0.113, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 10, label: 'PLAYER #10', rawClass: 'person', baseNormX: 0.222, baseNormY: 0.645, ampX: 0.03, ampY: 0.04, speedFactor: 0.33, phase: 1.7, w: 0.031, h: 0.149, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 11, label: 'PLAYER #11', rawClass: 'person', baseNormX: 0.415, baseNormY: 0.879, ampX: 0.02, ampY: 0.02, speedFactor: 0.19, phase: 2.4, w: 0.043, h: 0.121, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 12, label: 'PLAYER #12', rawClass: 'person', baseNormX: 0.559, baseNormY: 0.953, ampX: 0.01, ampY: 0.01, speedFactor: 0.15, phase: 3.1, w: 0.045, h: 0.047, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 13, label: 'PLAYER #13', rawClass: 'person', baseNormX: 0.506, baseNormY: 0.452, ampX: 0.02, ampY: 0.03, speedFactor: 0.29, phase: 0.9, w: 0.022, h: 0.116, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 14, label: 'PLAYER #14', rawClass: 'person', baseNormX: 0.086, baseNormY: 0.520, ampX: 0.02, ampY: 0.02, speedFactor: 0.24, phase: 1.8, w: 0.026, h: 0.093, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 15, label: 'PLAYER #15', rawClass: 'person', baseNormX: 0.491, baseNormY: 0.411, ampX: 0.03, ampY: 0.04, speedFactor: 0.36, phase: 2.6, w: 0.027, h: 0.156, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
    ];
  }

  // CAM-02: Sector Alpha East Perimeter (Real VisDrone Pedestrian / Patrol Corridor: Humans Only)
  if (norm.includes('2') || norm.includes('cam-02') || norm.includes('east')) {
    return [
      { id: 1, label: 'PATROL OFFICER', rawClass: 'patrol', baseNormX: 0.30, baseNormY: 0.50, ampX: 0.05, ampY: 0.04, speedFactor: 0.22, phase: 0.8, w: 0.055, h: 0.150, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 2, label: 'SECURITY OFFICER', rawClass: 'patrol', baseNormX: 0.65, baseNormY: 0.42, ampX: 0.04, ampY: 0.08, speedFactor: 0.30, phase: 2.1, w: 0.052, h: 0.145, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 3, label: 'GUARD #1', rawClass: 'person', baseNormX: 0.75, baseNormY: 0.44, ampX: 0.05, ampY: 0.07, speedFactor: 0.28, phase: 1.4, w: 0.040, h: 0.130, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 4, label: 'PATROL SENTRY', rawClass: 'person', baseNormX: 0.20, baseNormY: 0.64, ampX: 0.03, ampY: 0.02, speedFactor: 0.20, phase: 0.2, w: 0.048, h: 0.138, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
    ];
  }

  // CAM-03: Sector Bravo Access Road (Real VisDrone Foot Patrol Corridor: Humans Only)
  if (norm.includes('3') || norm.includes('cam-03') || norm.includes('access road')) {
    return [
      { id: 1, label: 'GUARD #1', rawClass: 'person', baseNormX: 0.48, baseNormY: 0.50, ampX: 0.03, ampY: 0.06, speedFactor: 0.32, phase: 0.4, w: 0.045, h: 0.140, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 2, label: 'PATROL OFFICER', rawClass: 'patrol', baseNormX: 0.28, baseNormY: 0.42, ampX: 0.04, ampY: 0.05, speedFactor: 0.28, phase: 2.4, w: 0.048, h: 0.138, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 3, label: 'GATE GUARD', rawClass: 'person', baseNormX: 0.68, baseNormY: 0.52, ampX: 0.03, ampY: 0.03, speedFactor: 0.18, phase: 1.1, w: 0.048, h: 0.135, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 4, label: 'FIELD OPERATOR', rawClass: 'person', baseNormX: 0.72, baseNormY: 0.56, ampX: 0.03, ampY: 0.03, speedFactor: 0.20, phase: 1.3, w: 0.042, h: 0.132, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
    ];
  }

  // CAM-04: Sector Bravo Outer Fence (Perimeter Sector: Humans Only)
  if (norm.includes('4') || norm.includes('cam-04') || norm.includes('outer fence')) {
    return [
      { id: 1, label: 'INTRUDER', rawClass: 'intruder', baseNormX: 0.42, baseNormY: 0.38, ampX: 0.04, ampY: 0.09, speedFactor: 0.34, phase: 0.7, w: 0.055, h: 0.155, isThreat: true, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 2, label: 'PERIMETER SCOUT', rawClass: 'person', baseNormX: 0.68, baseNormY: 0.42, ampX: 0.04, ampY: 0.06, speedFactor: 0.22, phase: 2.8, w: 0.046, h: 0.136, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
      { id: 3, label: 'PATROL OFFICER', rawClass: 'patrol', baseNormX: 0.25, baseNormY: 0.55, ampX: 0.04, ampY: 0.03, speedFactor: 0.19, phase: 1.5, w: 0.050, h: 0.140, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
    ];
  }

  // Default / Other CCTVs (CAM-05 through CAM-07, CAM-09: Humans Only)
  return [
    { id: 1, label: 'PERSON', rawClass: 'person', baseNormX: 0.45, baseNormY: 0.42, ampX: 0.04, ampY: 0.08, speedFactor: 0.28, phase: 0.3, w: 0.050, h: 0.145, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
    { id: 2, label: 'PATROL OFFICER', rawClass: 'patrol', baseNormX: 0.70, baseNormY: 0.50, ampX: 0.03, ampY: 0.05, speedFactor: 0.25, phase: 2.2, w: 0.048, h: 0.140, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
    { id: 3, label: 'SENTRY', rawClass: 'person', baseNormX: 0.30, baseNormY: 0.46, ampX: 0.04, ampY: 0.05, speedFactor: 0.25, phase: 1.7, w: 0.044, h: 0.134, isThreat: false, trail: [], state: 'NORMAL', lastStateChange: 0 },
  ];
};

function getDistanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { dist: Math.hypot(px - x1, py - y1), projX: x1, projY: y1 };
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return { dist: Math.hypot(px - projX, py - projY), projX, projY };
}

export const CameraFeedCanvas: React.FC<CameraFeedCanvasProps> = ({
  camera,
  showAiBoxes = true,
  showZones = true,
  showMotionTrails = false,
  isNightVision = false,
  onSimulateThreat,
  className = '',
  onCountsUpdate,
  muted = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Fix for React video muted attribute not updating reactively
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  const liveDetectionsRef = useRef<RealYoloDetection[]>([]);
  const liveTracksRef = useRef<TrackItem[]>([]);
  const lastWsUpdateTimeRef = useRef<number>(0);

  const initialResolution = (() => {
    if (camera.resolution && camera.resolution.includes('x')) {
      const [cw, ch] = camera.resolution.toLowerCase().split('x').map(n => parseInt(n.trim(), 10));
      if (!isNaN(cw) && !isNaN(ch) && cw > 0 && ch > 0) return { w: cw, h: ch };
    }
    const id = camera.id.toLowerCase();
    if (id.includes('8') || id.includes('cam-08')) return { w: 1904, h: 1072 };
    if (id.includes('cam-01') || id.includes('cam-02') || id.includes('cam-03') || id.includes('cam-04') || id.includes('cam-05') || id.includes('cam-06') || id.includes('cam-07') || id.includes('cam-09')) {
      return { w: 1344, h: 756 };
    }
    return { w: 1920, h: 1080 };
  })();

  const frameDimensionsRef = useRef<{ w: number; h: number }>(initialResolution);

  const tacticalLineRef = useRef<TacticalLine>(getCameraTacticalLine(camera.id, camera.code || ''));

  const simState = useRef({
    tick: 17,
    scanline: 0,
    syntheticTracks: getCameraTracks(camera.id, camera.code || ''),
  });

  useEffect(() => {
    tacticalLineRef.current = getCameraTacticalLine(camera.id, camera.code || '');
    simState.current.syntheticTracks = getCameraTracks(camera.id, camera.code || '');
  }, [camera.id, camera.code]);

  // Compute and report counts to parent QuadLiveStreamView
  const onCountsUpdateRef = useRef(onCountsUpdate);
  useEffect(() => {
    onCountsUpdateRef.current = onCountsUpdate;
  });

  useEffect(() => {
    const tracks = simState.current.syntheticTracks;
    let persons = 0;
    let vehicles = 0;
    let animals = 0;

    tracks.forEach((t) => {
      const c = t.rawClass.toLowerCase();
      if (c === 'person' || c === 'intruder' || c === 'patrol') persons++;
      else if (c === 'car' || c === 'truck' || c === 'van' || c === 'motorcycle' || c === 'vehicle' || c === 'bus') vehicles++;
      else if (c === 'animal' || c === 'dog' || c === 'canine' || c === 'wildlife' || c === 'cattle') animals++;
    });

    onCountsUpdateRef.current?.({
      persons,
      vehicles,
      animals,
      total: tracks.length,
    });
  }, [camera.id]);

  const syncCanvasDimensions = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const targetW = Math.max(10, Math.floor(rect.width));
    const targetH = Math.max(10, Math.floor(rect.height));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    syncCanvasDimensions();

    const resizeObserver = new ResizeObserver(() => {
      syncCanvasDimensions();
    });

    resizeObserver.observe(container);
    window.addEventListener('resize', syncCanvasDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncCanvasDimensions);
    };
  }, [syncCanvasDimensions]);

  const videoUrl = camera.rtspUrl?.includes('/api/cameras/')
    ? camera.rtspUrl
    : `/api/cameras/${camera.id.toLowerCase()}/video`;

  useEffect(() => {
    const camIdNorm = camera.id.toLowerCase();
    const camCodeNorm = (camera.code || '').toLowerCase().replace(/\s+/g, '-');

    const unsubDetection = webSocketService.onDetection((payload) => {
      const pCam = (payload.camera_id || '').toLowerCase();
      if (pCam === camIdNorm || pCam === camCodeNorm || pCam.includes(camIdNorm) || camIdNorm.includes(pCam)) {
        if (payload.frame_width && payload.frame_height) {
          frameDimensionsRef.current = { w: payload.frame_width, h: payload.frame_height };
        }
        liveDetectionsRef.current = payload.detections || [];
        lastWsUpdateTimeRef.current = Date.now();
      }
    });

    const unsubTracking = webSocketService.onTracking((payload) => {
      const pCam = (payload.camera_id || '').toLowerCase();
      if (pCam === camIdNorm || pCam === camCodeNorm || pCam.includes(camIdNorm) || camIdNorm.includes(pCam)) {
        if (payload.frame_width && payload.frame_height) {
          frameDimensionsRef.current = { w: payload.frame_width, h: payload.frame_height };
        }
        liveTracksRef.current = payload.tracks || [];
        lastWsUpdateTimeRef.current = Date.now();
      }
    });

    const unsubFrameState = webSocketService.onFrameState((payload) => {
      const pCam = (payload.camera_id || '').toLowerCase();
      if (pCam === camIdNorm || pCam === camCodeNorm || pCam.includes(camIdNorm) || camIdNorm.includes(pCam)) {
        if (payload.detections) {
          liveDetectionsRef.current = payload.detections;
        }
        if (payload.tracks) {
          liveTracksRef.current = payload.tracks;
        }
        lastWsUpdateTimeRef.current = Date.now();
      }
    });

    return () => {
      unsubDetection();
      unsubTracking();
      unsubFrameState();
    };
  }, [camera.id, camera.code]);

  // Main Render Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      const s = simState.current;
      s.tick += 0.025;

      ctx.clearRect(0, 0, w, h);

      const tacticalLine = tacticalLineRef.current;
      const lx1 = tacticalLine.p1.x * w;
      const ly1 = tacticalLine.p1.y * h;
      const lx2 = tacticalLine.p2.x * w;
      const ly2 = tacticalLine.p2.y * h;
      const bufPx = tacticalLine.bufferThreshold * h;

      // 1. Draw Calibrated Danger / Warning Zones (Polygons)
      if (showZones && camera.dangerZones && camera.dangerZones.length > 0) {
        camera.dangerZones.forEach((zone) => {
          if (zone.points.length >= 3) {
            ctx.save();
            ctx.beginPath();
            const p0 = zone.points[0];
            ctx.moveTo((p0.x / 1000) * w, (p0.y / 600) * h);
            for (let i = 1; i < zone.points.length; i++) {
              ctx.lineTo((zone.points[i].x / 1000) * w, (zone.points[i].y / 600) * h);
            }
            ctx.closePath();
            ctx.fillStyle = zone.type === 'restricted' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)';
            ctx.strokeStyle = zone.type === 'restricted' ? '#ef4444' : '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();

            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = zone.type === 'restricted' ? '#ef4444' : '#f59e0b';
            ctx.fillText(zone.name.toUpperCase(), (p0.x / 1000) * w + 4, (p0.y / 600) * h + 12);
            ctx.restore();
          }
        });
      }

      // 2. Draw Virtual Border Line / Zebra Crossing
      if (showZones) {
        // A. Suspicious Buffer Zone (Ribbon)
        ctx.save();
        ctx.fillStyle = tacticalLine.isZebraCrossing ? 'rgba(56, 189, 248, 0.08)' : 'rgba(245, 158, 11, 0.08)';
        ctx.strokeStyle = tacticalLine.isZebraCrossing ? 'rgba(56, 189, 248, 0.40)' : 'rgba(245, 158, 11, 0.40)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(lx1, ly1 - bufPx);
        ctx.lineTo(lx2, ly2 - bufPx);
        ctx.lineTo(lx2, ly2 + bufPx);
        ctx.lineTo(lx1, ly1 + bufPx);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // B. Zebra Crossing Stripes (if roadway crosswalk)
        if (tacticalLine.isZebraCrossing) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          const numStripes = 16;
          const stripeW = (lx2 - lx1) / (numStripes * 2.2);
          for (let i = 0; i < numStripes; i++) {
            const sx = lx1 + (i / numStripes) * (lx2 - lx1);
            ctx.fillRect(sx, ly1 - bufPx * 0.75, stripeW, bufPx * 1.5);
          }
        }

        // C. Glowing Primary Tripwire Vector
        ctx.strokeStyle = tacticalLine.isZebraCrossing ? '#38bdf8' : '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 4]);
        ctx.shadowColor = tacticalLine.isZebraCrossing ? '#38bdf8' : '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(lx1, ly1);
        ctx.lineTo(lx2, ly2);
        ctx.stroke();

        // Crosshairs at line endpoints
        [{ x: lx1, y: ly1 }, { x: lx2, y: ly2 }].forEach((pt) => {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });

        // Line Identifier Badge
        const badgeText = `[${tacticalLine.name}]`;
        ctx.font = 'bold 8.5px monospace';
        const bWidth = ctx.measureText(badgeText).width;
        ctx.fillStyle = tacticalLine.isZebraCrossing ? 'rgba(2, 132, 199, 0.90)' : 'rgba(8, 145, 178, 0.90)';
        ctx.fillRect(lx1 + (lx2 - lx1) * 0.35, ly1 - 14, bWidth + 8, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(badgeText, lx1 + (lx2 - lx1) * 0.35 + 4, ly1 - 3);

        ctx.restore();
      }

      // 3. Render Detections, Line Proximity & Line Crossing Logic
      if (showAiBoxes) {
        const hasLiveWs = Date.now() - lastWsUpdateTimeRef.current < 4000;
        const tracks = liveTracksRef.current;
        const detections = liveDetectionsRef.current;

        if (hasLiveWs && (tracks.length > 0 || detections.length > 0)) {
          // Render Live Tracks from real YOLO/ByteTrack stream
          tracks.forEach((track) => {
            const fw = frameDimensionsRef.current?.w || 1920;
            const fh = frameDimensionsRef.current?.h || 1080;
            const isNorm = track.bbox.x2 <= 1.0 && track.bbox.y2 <= 1.0;
            const bx1 = isNorm ? track.bbox.x1 * w : (track.bbox.x1 / fw) * w;
            const by1 = isNorm ? track.bbox.y1 * h : (track.bbox.y1 / fh) * h;
            const bw = isNorm ? (track.bbox.x2 - track.bbox.x1) * w : ((track.bbox.x2 - track.bbox.x1) / fw) * w;
            const bh = isNorm ? (track.bbox.y2 - track.bbox.y1) * h : ((track.bbox.y2 - track.bbox.y1) / fh) * h;

            const tCenterX = bx1 + bw / 2;
            const tCenterY = by1 + bh / 2;

            const { dist, projX, projY } = getDistanceToSegment(tCenterX, tCenterY, lx1, ly1, lx2, ly2);
            const isCrossing = Math.abs(tCenterY - ly1) < 8 && tCenterX >= lx1 && tCenterX <= lx2;
            const isNear = dist < bufPx && !isCrossing;

            if (isCrossing) {
              tacticalAlertDispatcher.trigger({
                cameraId: camera.id,
                cameraName: camera.name,
                trackId: track.track_id,
                className: track.class_name,
                type: 'LINE_CROSSING',
                lineName: tacticalLine.name,
              });
            } else if (isNear) {
              tacticalAlertDispatcher.trigger({
                cameraId: camera.id,
                cameraName: camera.name,
                trackId: track.track_id,
                className: track.class_name,
                type: 'SUSPICIOUS_AREA',
                lineName: tacticalLine.name,
              });
            }

            const style = getDetectionClassStyle(track.class_name, {
              isThreat: Boolean((track as any).risk_level === 'CRITICAL' || (track as any).risk_score >= 70),
              confidence: track.confidence,
              isSuspiciousArea: isNear,
              isCrossingLine: isCrossing,
            });

            ctx.save();
            ctx.fillStyle = style.fillColor;
            ctx.fillRect(bx1, by1, bw, bh);

            ctx.strokeStyle = style.strokeColor;
            ctx.lineWidth = style.isHighPriority ? 2.0 : 1.5;
            ctx.strokeRect(bx1, by1, bw, bh);

            // Laser connector to line when suspicious or crossing
            if (isNear || isCrossing) {
              ctx.strokeStyle = isCrossing ? '#dc2626' : '#f97316';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.moveTo(tCenterX, tCenterY);
              ctx.lineTo(projX, projY);
              ctx.stroke();
            }

            const labelText = `[${style.categoryLabel} #${track.track_id}] ${(track.confidence * 100).toFixed(0)}%`;
            ctx.font = 'bold 8.5px monospace';
            const textWidth = ctx.measureText(labelText).width;
            ctx.fillStyle = style.badgeBg;
            ctx.fillRect(bx1, by1 - 14, Math.max(textWidth + 8, bw), 14);
            ctx.fillStyle = style.badgeTextColor;
            ctx.fillText(labelText, bx1 + 4, by1 - 3);
            ctx.restore();
          });
        } else {
          // Render High-Fidelity Synthetic YOLO Detections Tailored Per CCTV
          s.syntheticTracks.forEach((st) => {
            const time = s.tick * st.speedFactor + st.phase;

            let normX = st.baseNormX;
            let normY = st.baseNormY;

            if (st.motionType === 'linear_y') {
              // Southbound: moves top-to-bottom from Y=0.10 to 0.90
              const span = 0.80;
              const prog = ((st.baseNormY - 0.10 + time * 0.05) % span + span) % span;
              normY = 0.10 + prog;
              normX = st.baseNormX + Math.sin(time * 0.2) * (st.ampX || 0.002);
            } else if (st.motionType === 'linear_y_reverse') {
              // Northbound: moves bottom-to-top from Y=0.90 to 0.10
              const span = 0.80;
              const prog = ((0.90 - st.baseNormY + time * 0.045) % span + span) % span;
              normY = 0.90 - prog;
              normX = st.baseNormX + Math.sin(time * 0.2) * (st.ampX || 0.002);
            } else if (st.motionType === 'linear_x') {
              // Eastbound: moves left-to-right from X=0.10 to 0.90
              const span = 0.80;
              const prog = ((st.baseNormX - 0.10 + time * 0.055) % span + span) % span;
              normX = 0.10 + prog;
              normY = st.baseNormY + Math.sin(time * 0.2) * (st.ampY || 0.002);
            } else if (st.motionType === 'linear_x_reverse') {
              // Westbound: moves right-to-left from X=0.90 to 0.10
              const span = 0.80;
              const prog = ((0.90 - st.baseNormX + time * 0.05) % span + span) % span;
              normX = 0.90 - prog;
              normY = st.baseNormY + Math.sin(time * 0.2) * (st.ampY || 0.002);
            } else if (st.motionType === 'crosswalk') {
              // Crossing zebra walk horizontally back & forth
              normX = st.baseNormX + Math.sin(time * 0.4) * (st.ampX || 0.12);
              normY = st.baseNormY + Math.cos(time * 0.4) * (st.ampY || 0.004);
            } else {
              // General oscillation
              normX = (st.baseNormX + Math.sin(time) * st.ampX + 1) % 1;
              normY = (st.baseNormY + Math.cos(time * 0.9) * st.ampY + 1) % 1;
            }

            const bx = normX * w;
            const by = normY * h;
            const bw = st.w * w;
            const bh = st.h * h;
            const tCenterX = bx + bw / 2;
            const tCenterY = by + bh / 2;

            // Two-Stage Line Proximity & Crossing Geometry
            const { dist, projX, projY } = getDistanceToSegment(tCenterX, tCenterY, lx1, ly1, lx2, ly2);
            const distNorm = dist / h;

            const lineYAtX = ly1 + ((tCenterX - lx1) / Math.max(1, lx2 - lx1)) * (ly2 - ly1);
            const crossingTolerance = Math.max(8, bh * 0.30);
            const isCrossing = Math.abs(tCenterY - lineYAtX) < crossingTolerance && tCenterX >= Math.min(lx1, lx2) && tCenterX <= Math.max(lx1, lx2);
            const isNear = distNorm < tacticalLine.bufferThreshold && !isCrossing;

            const prevState = st.state;
            if (isCrossing) {
              st.state = 'LINE_CROSSING';
              if (prevState !== 'LINE_CROSSING') {
                tacticalAlertDispatcher.trigger({
                  cameraId: camera.id,
                  cameraName: camera.name,
                  trackId: st.id,
                  className: st.rawClass,
                  type: 'LINE_CROSSING',
                  lineName: tacticalLine.name,
                });
              }
            } else if (isNear) {
              st.state = 'SUSPICIOUS_AREA';
              if (prevState === 'NORMAL') {
                tacticalAlertDispatcher.trigger({
                  cameraId: camera.id,
                  cameraName: camera.name,
                  trackId: st.id,
                  className: st.rawClass,
                  type: 'SUSPICIOUS_AREA',
                  lineName: tacticalLine.name,
                });
              }
            } else {
              st.state = 'NORMAL';
            }

            const style = getDetectionClassStyle(st.rawClass || st.label, {
              isThreat: st.isThreat,
              isSuspiciousArea: st.state === 'SUSPICIOUS_AREA',
              isCrossingLine: st.state === 'LINE_CROSSING',
            });

            // Motion trail
            if (showMotionTrails) {
              st.trail.push({ x: tCenterX, y: tCenterY });
              if (st.trail.length > 14) st.trail.shift();

              ctx.save();
              ctx.strokeStyle = style.strokeColor;
              ctx.lineWidth = 1;
              ctx.setLineDash([2, 2]);
              ctx.beginPath();
              st.trail.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
              });
              ctx.stroke();
              ctx.restore();
            }

            // Translucent box background & border
            ctx.save();
            ctx.fillStyle = style.fillColor;
            ctx.fillRect(bx, by, bw, bh);

            ctx.strokeStyle = style.strokeColor;
            ctx.lineWidth = style.isHighPriority ? 2.0 : 1.5;
            ctx.strokeRect(bx, by, bw, bh);

            // Laser connector to line when suspicious or crossing
            if (st.state === 'SUSPICIOUS_AREA' || st.state === 'LINE_CROSSING') {
              ctx.strokeStyle = st.state === 'LINE_CROSSING' ? '#dc2626' : '#f97316';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.moveTo(tCenterX, tCenterY);
              ctx.lineTo(projX, projY);
              ctx.stroke();

              // Impact ripple at projection point on line if crossing
              if (st.state === 'LINE_CROSSING') {
                const pulseR = 5 + Math.sin(s.tick * 6) * 3;
                ctx.fillStyle = 'rgba(220, 38, 38, 0.5)';
                ctx.beginPath();
                ctx.arc(projX, projY, pulseR, 0, Math.PI * 2);
                ctx.fill();
              }
            }

            // Corner highlights
            const cLen = 4;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(bx, by + cLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cLen, by);
            ctx.moveTo(bx + bw - cLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cLen);
            ctx.moveTo(bx, by + bh - cLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cLen, by + bh);
            ctx.moveTo(bx + bw - cLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cLen);
            ctx.stroke();

            // Label pill
            const conf = Math.round(92 + Math.sin(s.tick + st.id) * 5);
            const pillText = st.state === 'LINE_CROSSING' || st.state === 'SUSPICIOUS_AREA'
              ? `#${st.id} ${style.categoryLabel} ${conf}%`
              : `#${st.id} ${st.label} ${conf}%`;
            ctx.font = 'bold 8px monospace';
            const pillTextWidth = ctx.measureText(pillText).width;
            ctx.fillStyle = style.badgeBg;
            ctx.fillRect(bx, by - 13, Math.max(pillTextWidth + 8, bw), 13);
            ctx.fillStyle = style.badgeTextColor;
            ctx.fillText(pillText, bx + 4, by - 3);
            ctx.restore();
          });
        }
      }

      // 4. Tactical Scanline
      s.scanline = (s.scanline + 1.2) % h;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.10)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, s.scanline);
      ctx.lineTo(w, s.scanline);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [camera.id, showAiBoxes, showZones, showMotionTrails, isNightVision, camera.dangerZones]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-black ${className}`}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        autoPlay
        loop
        muted={muted}
        playsInline
        onLoadedData={() => {
          setVideoLoaded(true);
          setVideoError(false);
        }}
        onError={() => {
          setVideoError(true);
          setVideoLoaded(false);
        }}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          videoLoaded && !videoError ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          filter: isNightVision
            ? 'brightness(1.15) contrast(1.3) hue-rotate(90deg) saturate(2)'
            : 'none',
        }}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10 block"
      />
    </div>
  );
};
