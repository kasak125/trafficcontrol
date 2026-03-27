const EARTH_RADIUS_METERS = 6371e3;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function haversineDistanceMeters(pointA, pointB) {
  const latitudeA = toRadians(pointA.lat);
  const latitudeB = toRadians(pointB.lat);
  const deltaLatitude = toRadians(pointB.lat - pointA.lat);
  const deltaLongitude = toRadians(pointB.lng - pointA.lng);

  const formula =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2;
  const angularDistance = 2 * Math.atan2(Math.sqrt(formula), Math.sqrt(1 - formula));

  return EARTH_RADIUS_METERS * angularDistance;
}

export function buildBoundingBox(points, paddingDegrees = 0.05) {
  if (!points.length) {
    return {
      minLon: 77.1025,
      minLat: 28.4595,
      maxLon: 77.3305,
      maxLat: 28.7041,
    };
  }

  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);

  return {
    minLon: Math.min(...longitudes) - paddingDegrees,
    minLat: Math.min(...latitudes) - paddingDegrees,
    maxLon: Math.max(...longitudes) + paddingDegrees,
    maxLat: Math.max(...latitudes) + paddingDegrees,
  };
}

export function decodeLocation(location) {
  if (!location) {
    return { lat: 0, lng: 0 };
  }

  if (typeof location === "string") {
    const [lat, lng] = location.split(",").map(Number);
    return { lat, lng };
  }

  return {
    lat: Number(location.lat),
    lng: Number(location.lng),
  };
}

export function interpolateRoutePosition(routePoints, progress) {
  if (!routePoints.length) {
    return { lat: 0, lng: 0 };
  }

  if (routePoints.length === 1) {
    return routePoints[0];
  }

  const normalizedProgress = Math.min(1, Math.max(0, progress));
  const scaledIndex = normalizedProgress * (routePoints.length - 1);
  const startIndex = Math.floor(scaledIndex);
  const endIndex = Math.min(routePoints.length - 1, startIndex + 1);
  const segmentProgress = scaledIndex - startIndex;
  const startPoint = routePoints[startIndex];
  const endPoint = routePoints[endIndex];

  return {
    lat: startPoint.lat + (endPoint.lat - startPoint.lat) * segmentProgress,
    lng: startPoint.lng + (endPoint.lng - startPoint.lng) * segmentProgress,
  };
}

export function pointToString(point) {
  return `${point.lat},${point.lng}`;
}
