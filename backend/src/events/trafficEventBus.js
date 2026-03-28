import { EventEmitter } from "node:events";

export const TRAFFIC_UPDATE_EVENT = "traffic:update";
export const TRAFFIC_CONGESTION_EVENT = "traffic:congestion";
export const TRAFFIC_WAIT_TIME_EVENT = "traffic:waitTime";
export const EMERGENCY_UPDATE_EVENT = "emergency:update";
export const SIGNAL_OVERRIDE_EVENT = "signal:override";
export const PARKING_UPDATE_EVENT = "parking:update";
export const CV_DENSITY_EVENT = "cv:density";

export const trafficEventBus = new EventEmitter();
trafficEventBus.setMaxListeners(100);
