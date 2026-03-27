import { env } from "../config/env.js";
import { pointToString } from "../utils/geo.js";

function normalizeFlowResponse(intersection, payload) {
  const flow = payload.flowSegmentData;
  const currentSpeed = Number(flow.currentSpeed ?? 0);
  const freeFlowSpeed = Number(flow.freeFlowSpeed ?? 1);
  const congestionLevel = Number(
    Math.min(100, Math.max(0, 100 - (currentSpeed / Math.max(freeFlowSpeed, 1)) * 100)).toFixed(2),
  );

  return {
    intersectionId: intersection.id,
    intersectionName: intersection.name,
    location: intersection.location,
    currentSpeed,
    freeFlowSpeed,
    currentTravelTime: Number(flow.currentTravelTime ?? 0),
    freeFlowTravelTime: Number(flow.freeFlowTravelTime ?? 0),
    roadClosure: Boolean(flow.roadClosure),
    confidence: Number(flow.confidence ?? 0),
    congestionLevel,
    flowData: flow,
  };
}

function normalizeIncident(incident) {
  const properties = incident.properties ?? {};
  const firstEvent = properties.events?.[0];

  return {
    id: properties.id ?? null,
    type: incident.type,
    iconCategory: properties.iconCategory ?? null,
    magnitudeOfDelay: properties.magnitudeOfDelay ?? null,
    from: properties.from ?? null,
    to: properties.to ?? null,
    description: firstEvent?.description ?? properties.description ?? "Traffic incident",
    startTime: properties.startTime ?? null,
    endTime: properties.endTime ?? null,
    geometry: incident.geometry ?? null,
  };
}

function extractRoutePoints(routePayload) {
  const route = routePayload.routes?.[0];
  if (!route) {
    return null;
  }

  const points =
    route.legs?.flatMap((leg) =>
      (leg.points ?? []).map((point) => ({
        lat: point.latitude,
        lng: point.longitude,
      })),
    ) ?? [];

  return {
    points,
    summary: route.summary ?? {},
    raw: route,
  };
}

export class TomTomTrafficService {
  isConfigured() {
    return Boolean(env.tomTomApiKey);
  }

  async fetchFlowForIntersection(intersection) {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "TomTom API key is not configured.",
      };
    }

    try {
      const location = intersection.location;
      const point = {
        lat: Number(location.lat),
        lng: Number(location.lng),
      };
      const url = new URL(
        `${env.tomTomTrafficBaseUrl}/traffic/services/4/flowSegmentData/absolute/10/json`,
      );
      url.searchParams.set("point", pointToString(point));
      url.searchParams.set("key", env.tomTomApiKey);

      const response = await fetch(url);
      if (!response.ok) {
        return {
          success: false,
          error: `TomTom traffic flow request failed: ${response.status}`,
        };
      }

      const payload = await response.json();

      return {
        success: true,
        data: normalizeFlowResponse(intersection, payload),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "TomTom traffic flow request failed.",
      };
    }
  }

  async fetchTrafficFlow(intersections) {
    const results = await Promise.all(
      intersections.map((intersection) => this.fetchFlowForIntersection(intersection)),
    );
    return results;
  }

  async fetchIncidents(bbox) {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "TomTom API key is not configured.",
      };
    }

    try {
      const url = new URL(`${env.tomTomTrafficBaseUrl}/traffic/services/5/incidentDetails`);
      url.searchParams.set(
        "bbox",
        `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`,
      );
      url.searchParams.set(
        "fields",
        "{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,startTime,endTime,from,to,events{description}}}}",
      );
      url.searchParams.set("language", "en-GB");
      url.searchParams.set("timeValidityFilter", "present");
      url.searchParams.set("key", env.tomTomApiKey);

      const response = await fetch(url);
      if (!response.ok) {
        return {
          success: false,
          error: `TomTom incident request failed: ${response.status}`,
        };
      }

      const payload = await response.json();

      return {
        success: true,
        data: (payload.incidents ?? []).map(normalizeIncident),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "TomTom incident request failed.",
      };
    }
  }

  async calculateRoute({ origin, destination }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: "TomTom API key is not configured.",
      };
    }

    try {
      const routePath = `${pointToString(origin)}:${pointToString(destination)}`;
      const url = new URL(
        `${env.tomTomRoutingBaseUrl}/routing/1/calculateRoute/${routePath}/json`,
      );
      url.searchParams.set("traffic", "true");
      url.searchParams.set("travelMode", "car");
      url.searchParams.set("routeType", "fastest");
      url.searchParams.set("computeTravelTimeFor", "all");
      url.searchParams.set("key", env.tomTomApiKey);

      const response = await fetch(url);
      if (!response.ok) {
        return {
          success: false,
          error: `TomTom route calculation failed: ${response.status}`,
        };
      }

      const payload = await response.json();
      const route = extractRoutePoints(payload);
      if (!route) {
        return {
          success: false,
          error: "TomTom route response did not include a route.",
        };
      }

      return {
        success: true,
        data: route,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "TomTom route calculation failed.",
      };
    }
  }
}

export const tomTomTrafficService = new TomTomTrafficService();
