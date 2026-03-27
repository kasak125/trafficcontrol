import { delhiParkingLots } from "../data/delhiParkingLots.js";
import { haversineDistanceMeters } from "../utils/geo.js";
import { tomTomTrafficService } from "./tomTomTrafficService.js";
import { getTrafficState } from "./trafficStateStore.js";

const parkingHistoryStore = new Map();

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalize(value, max, fallback = 0) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return clamp(numericValue / max, 0, 1);
}

function getTimeOfDayProfile(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 8 && hour <= 11) {
    return {
      occupancyFactor: 0.88,
      label: "morning_peak",
      demandPressure: 0.18,
    };
  }

  if (hour >= 18 && hour <= 21) {
    return {
      occupancyFactor: 0.92,
      label: "evening_peak",
      demandPressure: 0.2,
    };
  }

  if (hour >= 0 && hour <= 5) {
    return {
      occupancyFactor: 0.26,
      label: "night_low",
      demandPressure: -0.12,
    };
  }

  if (hour >= 12 && hour <= 16) {
    return {
      occupancyFactor: 0.64,
      label: "midday",
      demandPressure: 0.06,
    };
  }

  return {
    occupancyFactor: 0.52,
    label: "shoulder",
    demandPressure: 0.02,
  };
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

function getTrendLabel(history) {
  if (history.length < 2) {
    return "Stable";
  }

  const first = history[0];
  const last = history[history.length - 1];
  const delta = last - first;

  if (delta >= 4) {
    return "Increasing";
  }

  if (delta <= -4) {
    return "Decreasing";
  }

  return "Stable";
}

function buildPrediction(occupancyRate, trend, timeProfile) {
  let delta = 0;

  if (trend === "Increasing") {
    delta += 4.5;
  } else if (trend === "Decreasing") {
    delta -= 4.5;
  }

  delta += timeProfile.demandPressure * 12;

  const projectedOccupancy = clamp(occupancyRate + delta, 8, 99);

  if (projectedOccupancy >= 92) {
    return `Likely near full in 10 minutes (${projectedOccupancy.toFixed(1)}%)`;
  }

  if (projectedOccupancy >= 76) {
    return `Likely to stay busy in 10 minutes (${projectedOccupancy.toFixed(1)}%)`;
  }

  if (projectedOccupancy <= 42) {
    return `Likely to remain comfortable in 10 minutes (${projectedOccupancy.toFixed(1)}%)`;
  }

  return `Expected around ${projectedOccupancy.toFixed(1)}% occupancy in 10 minutes`;
}

function buildConfidence({ source, history, linkedFlow, timeProfile }) {
  const sourceBoost = source === "tomtom" ? 24 : source === "mixed" ? 18 : 12;
  const historyBoost = Math.min(18, history.length * 6);
  const trafficBoost = linkedFlow ? 20 : 8;
  const timeBoost =
    timeProfile.label === "morning_peak" || timeProfile.label === "evening_peak" ? 12 : 8;

  return clamp(sourceBoost + historyBoost + trafficBoost + timeBoost + 26, 48, 97);
}

function buildExplanations({ lot, linkedFlow, timeProfile, occupancyRate, trend, prediction }) {
  const explanations = [
    `Base occupancy starts at ${(lot.baseOccupancy * 100).toFixed(0)}% for ${lot.area}.`,
    `Time-of-day profile is ${timeProfile.label.replace("_", " ")}.`,
  ];

  if (linkedFlow) {
    explanations.push(
      `Live congestion at ${lot.linkedIntersection} is ${linkedFlow.congestionLevel.toFixed(1)}%.`,
    );
    explanations.push(`Average corridor wait is ${linkedFlow.avgWaitTime}s.`);
  } else {
    explanations.push("No live linked-intersection reading was available, so fallback traffic pressure was used.");
  }

  explanations.push(`Smoothed occupancy estimate is ${occupancyRate.toFixed(1)}%.`);
  explanations.push(`Recent trend is ${trend.toLowerCase()}.`);
  explanations.push(prediction);

  return explanations;
}

function updateHistory(lotId, occupancyRate) {
  const history = parkingHistoryStore.get(lotId) ?? [];
  const nextHistory = [...history.slice(-2), occupancyRate];
  parkingHistoryStore.set(lotId, nextHistory);
  return nextHistory;
}

function smoothOccupancy(previousHistory, rawOccupancyRate) {
  if (!previousHistory.length) {
    return rawOccupancyRate;
  }

  const previousValue = previousHistory[previousHistory.length - 1];
  return previousValue * 0.62 + rawOccupancyRate * 0.38;
}

function findLiveIntersection(flow, linkedIntersection) {
  return flow.find((item) => item.intersectionName === linkedIntersection) ?? null;
}

function buildBestParking(lots) {
  if (!lots.length) {
    return null;
  }

  const rankedLots = lots
    .map((lot) => {
      const availabilityScore = normalize(lot.availableSlots, lot.capacity || 1) * 58;
      const congestionPenalty = normalize(lot.congestionLevel ?? 30, 100, 0.3) * 22;
      const waitPenalty = normalize(lot.avgWaitTime ?? 35, 160, 0.22) * 14;
      const trendBonus = lot.trend === "Decreasing" ? 7 : lot.trend === "Stable" ? 3 : 0;
      const confidenceBonus = (lot.confidence / 100) * 8;
      const score = availabilityScore - congestionPenalty - waitPenalty + trendBonus + confidenceBonus;

      return {
        ...lot,
        recommendationScore: Number(score.toFixed(2)),
      };
    })
    .sort((left, right) => right.recommendationScore - left.recommendationScore);

  return rankedLots[0];
}

function buildFallbackParkingRoute(origin, destination) {
  const steps = 8;
  const points = Array.from({ length: steps + 1 }).map((_, index) => ({
    lat: origin.lat + ((destination.lat - origin.lat) * index) / steps,
    lng: origin.lng + ((destination.lng - origin.lng) * index) / steps,
  }));
  const distanceMeters = haversineDistanceMeters(origin, destination);
  const averageSpeedMetersPerSecond = 9.72;

  return {
    source: "simulation",
    points,
    summary: {
      lengthInMeters: Math.round(distanceMeters),
      travelTimeInSeconds: Math.max(120, Math.round(distanceMeters / averageSpeedMetersPerSecond)),
      trafficDelayInSeconds: Math.round(distanceMeters / 55),
    },
  };
}

export async function getParkingAvailability() {
  const state = getTrafficState();
  const timeProfile = getTimeOfDayProfile();

  const lots = delhiParkingLots.map((lot) => {
    const linkedFlow = findLiveIntersection(state.flow, lot.linkedIntersection);
    const baseOccupancy = clamp(lot.baseOccupancy, 0.08, 0.98);
    const congestionFactor = normalize(linkedFlow?.congestionLevel, 100, 0.3);
    const waitTimeFactor = normalize(linkedFlow?.avgWaitTime, 160, 0.22);
    const timeOfDayFactor = timeProfile.occupancyFactor;

    const weightedOccupancy =
      baseOccupancy * 0.52 +
      congestionFactor * 0.2 +
      waitTimeFactor * 0.16 +
      timeOfDayFactor * 0.12;
    const rawOccupancyRate = clamp(weightedOccupancy * 100, 12, 98);
    const previousHistory = parkingHistoryStore.get(lot.id) ?? [];
    const smoothedOccupancyRate = clamp(smoothOccupancy(previousHistory, rawOccupancyRate), 12, 98);
    const history = updateHistory(lot.id, smoothedOccupancyRate);
    const trend = getTrendLabel(history);
    const prediction = buildPrediction(smoothedOccupancyRate, trend, timeProfile);
    const occupiedSlots = Math.round(lot.capacity * (smoothedOccupancyRate / 100));
    const availableSlots = Math.max(0, lot.capacity - occupiedSlots);
    const confidence = buildConfidence({
      source: state.source,
      history,
      linkedFlow,
      timeProfile,
    });

    const parkingLot = {
      id: lot.id,
      name: lot.name,
      area: lot.area,
      coordinates: lot.coordinates,
      capacity: lot.capacity,
      occupiedSlots,
      availableSlots,
      occupancyRate: Number(smoothedOccupancyRate.toFixed(1)),
      status: getStatusLabel(smoothedOccupancyRate / 100),
      trend,
      prediction,
      confidence,
      linkedIntersection: lot.linkedIntersection,
      congestionLevel: linkedFlow?.congestionLevel ?? null,
      avgWaitTime: linkedFlow?.avgWaitTime ?? null,
      timeOfDayFactor: Number(timeOfDayFactor.toFixed(2)),
      updatedAt: state.lastUpdated ?? new Date().toISOString(),
      source: state.source,
    };

    return {
      ...parkingLot,
      explanation: buildExplanations({
        lot,
        linkedFlow,
        timeProfile,
        occupancyRate: parkingLot.occupancyRate,
        trend,
        prediction,
      }),
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
      ? Number((lots.reduce((sum, lot) => sum + lot.occupancyRate, 0) / lots.length).toFixed(1))
      : 0;

  const sortedLots = [...lots].sort((left, right) => right.availableSlots - left.availableSlots);
  const bestParking = buildBestParking(lots);
  const alternatives = [...lots]
    .filter((lot) => lot.id !== bestParking?.id)
    .sort((left, right) => (right.recommendationScore ?? 0) - (left.recommendationScore ?? 0))
    .slice(0, 3);

  return {
    source: state.source,
    lastUpdated: state.lastUpdated ?? new Date().toISOString(),
    summary: {
      totalLots: lots.length,
      totalCapacity: totals.capacity,
      availableSlots: totals.availableSlots,
      averageOccupancy,
    },
    bestParking,
    alternatives,
    lots: sortedLots,
  };
}

export async function getParkingRoute({ lat, lng }) {
  const parkingState = await getParkingAvailability();
  const bestParking = parkingState.bestParking;

  if (!bestParking) {
    return {
      source: "simulation",
      bestParking: null,
      alternatives: parkingState.alternatives,
      route: null,
    };
  }

  const origin = { lat: Number(lat), lng: Number(lng) };
  const destination = bestParking.coordinates;

  if (tomTomTrafficService.isConfigured()) {
    const routeResult = await tomTomTrafficService.calculateRoute({ origin, destination });
    if (routeResult.success) {
      return {
        source: "tomtom",
        bestParking,
        alternatives: parkingState.alternatives,
        route: {
          points: routeResult.data.points,
          summary: routeResult.data.summary,
        },
      };
    }
  }

  return {
    source: "simulation",
    bestParking,
    alternatives: parkingState.alternatives,
    route: buildFallbackParkingRoute(origin, destination),
  };
}
