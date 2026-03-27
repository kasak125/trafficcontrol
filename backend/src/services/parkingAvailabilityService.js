import { delhiParkingLots } from "../data/delhiParkingLots.js";
import { getTrafficState } from "./trafficStateStore.js";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTimeFactor(date = new Date()) {
  const hour = date.getHours();

  if ((hour >= 8 && hour <= 11) || (hour >= 18 && hour <= 21)) {
    return 0.16;
  }

  if (hour >= 0 && hour <= 5) {
    return -0.18;
  }

  if (hour >= 12 && hour <= 16) {
    return 0.07;
  }

  return 0;
}

function getTrendLabel(occupancyRate) {
  if (occupancyRate >= 0.88) {
    return "High demand";
  }

  if (occupancyRate >= 0.7) {
    return "Filling fast";
  }

  if (occupancyRate >= 0.45) {
    return "Stable";
  }

  return "Plenty available";
}

function getStatusLabel(occupancyRate) {
  if (occupancyRate >= 0.9) {
    return "critical";
  }

  if (occupancyRate >= 0.75) {
    return "busy";
  }

  if (occupancyRate >= 0.5) {
    return "moderate";
  }

  return "available";
}

function findLiveIntersection(flow, linkedIntersection) {
  return flow.find((item) => item.intersectionName === linkedIntersection) ?? null;
}

export async function getParkingAvailability() {
  const state = getTrafficState();
  const timeFactor = getTimeFactor();
  const lots = delhiParkingLots.map((lot) => {
    const linkedFlow = findLiveIntersection(state.flow, lot.linkedIntersection);
    const congestionFactor = (linkedFlow?.congestionLevel ?? 30) / 220;
    const waitFactor = (linkedFlow?.avgWaitTime ?? 35) / 350;
    const occupancyRate = clamp(
      lot.baseOccupancy + timeFactor + congestionFactor + waitFactor,
      0.12,
      0.98,
    );
    const occupiedSlots = Math.round(lot.capacity * occupancyRate);
    const availableSlots = Math.max(0, lot.capacity - occupiedSlots);

    return {
      id: lot.id,
      name: lot.name,
      area: lot.area,
      capacity: lot.capacity,
      occupiedSlots,
      availableSlots,
      occupancyRate: Number((occupancyRate * 100).toFixed(1)),
      status: getStatusLabel(occupancyRate),
      trend: getTrendLabel(occupancyRate),
      linkedIntersection: lot.linkedIntersection,
      congestionLevel: linkedFlow?.congestionLevel ?? null,
      avgWaitTime: linkedFlow?.avgWaitTime ?? null,
      updatedAt: state.lastUpdated ?? new Date().toISOString(),
      source: state.source,
    };
  });

  const totals = lots.reduce(
    (accumulator, lot) => {
      accumulator.capacity += lot.capacity;
      accumulator.availableSlots += lot.availableSlots;
      return accumulator;
    },
    { capacity: 0, availableSlots: 0 },
  );

  const averageOccupancy =
    lots.length > 0
      ? Number(
          (
            lots.reduce((sum, lot) => sum + lot.occupancyRate, 0) / lots.length
          ).toFixed(1),
        )
      : 0;

  return {
    source: state.source,
    lastUpdated: state.lastUpdated ?? new Date().toISOString(),
    summary: {
      totalLots: lots.length,
      totalCapacity: totals.capacity,
      availableSlots: totals.availableSlots,
      averageOccupancy,
    },
    lots: lots.sort((left, right) => left.availableSlots - right.availableSlots),
  };
}
