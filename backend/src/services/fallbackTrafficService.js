import { defaultIntersections } from "../simulator/defaultIntersections.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function getTimeMultiplier(hour) {
  if ((hour >= 8 && hour < 10) || (hour >= 18 && hour < 21)) {
    return 1.9;
  }

  if ((hour >= 6 && hour < 8) || (hour >= 10 && hour < 12) || (hour >= 16 && hour < 18)) {
    return 1.35;
  }

  if (hour >= 0 && hour < 5) {
    return 0.45;
  }

  if (hour >= 22) {
    return 0.6;
  }

  return 1;
}

function getDefaultConfigForIntersection(intersection) {
  return (
    defaultIntersections.find(
      (item) => item.name === intersection.name || item.legacyName === intersection.name,
    ) ?? defaultIntersections[0]
  );
}

export function generateTraffic(intersection, timestamp = new Date()) {
  const config = getDefaultConfigForIntersection(intersection);
  const hour = timestamp.getHours();
  const timeMultiplier = getTimeMultiplier(hour);
  const volatilityMultiplier = 1 + randomBetween(-config.volatility, config.volatility);
  const vehicleCount = Math.round(config.baseLoad * timeMultiplier * volatilityMultiplier);
  const congestionLevel = clamp(
    (vehicleCount / config.capacity) * 100 + randomBetween(-6, 8),
    8,
    99,
  );
  const avgWaitTime = Math.round(
    clamp(18 + congestionLevel * 0.9 + randomBetween(-4, 7), 12, 140),
  );

  return {
    vehicleCount,
    congestionLevel: Number(congestionLevel.toFixed(2)),
    avgWaitTime,
    meta: {
      simulated: true,
      reason: "fallback",
    },
  };
}
