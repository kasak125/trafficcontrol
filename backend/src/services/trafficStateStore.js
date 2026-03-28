const trafficState = {
  source: "simulation",
  lastUpdated: null,
  flow: [],
  incidents: [],
  actions: [],
  cvDensity: {},
};

export function setTrafficState(nextState) {
  trafficState.source = nextState.source;
  trafficState.lastUpdated = nextState.lastUpdated;
  trafficState.flow = nextState.flow;
  trafficState.incidents = nextState.incidents;
  if (nextState.actions) {
    trafficState.actions = nextState.actions;
  }
  if (nextState.cvDensity) {
    trafficState.cvDensity = nextState.cvDensity;
  }
}

export function getTrafficState() {
  return {
    ...trafficState,
    flow: [...trafficState.flow],
    incidents: [...trafficState.incidents],
    actions: [...trafficState.actions],
    cvDensity: { ...trafficState.cvDensity },
  };
}

export function pushSystemAction(action) {
  trafficState.actions = [action, ...trafficState.actions].slice(0, 25);
}

export function upsertCvDensityState(reading) {
  trafficState.cvDensity = {
    ...trafficState.cvDensity,
    [reading.direction]: reading,
  };
}

export function getCvDensityState() {
  return { ...trafficState.cvDensity };
}
