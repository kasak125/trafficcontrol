import { EventEmitter } from "node:events";

export const TRAFFIC_UPDATE_EVENT = "traffic:update";
export const TRAFFIC_CONGESTION_EVENT = "traffic:congestion";
export const TRAFFIC_WAIT_TIME_EVENT = "traffic:waitTime";

export const trafficEventBus = new EventEmitter();
trafficEventBus.setMaxListeners(100);
