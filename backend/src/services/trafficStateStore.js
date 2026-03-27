const trafficState = {
  source: "simulation",
  lastUpdated: null,
  flow: [],
  incidents: [],
  actions: [],
};

export function setTrafficState(nextState) {
  trafficState.source = nextState.source;
  trafficState.lastUpdated = nextState.lastUpdated;
  trafficState.flow = nextState.flow;
  trafficState.incidents = nextState.incidents;
  if (nextState.actions) {
    trafficState.actions = nextState.actions;
  }
}

export function getTrafficState() {
  return {
    ...trafficState,
    flow: [...trafficState.flow],
    incidents: [...trafficState.incidents],
    actions: [...trafficState.actions],
  };
}

export function pushSystemAction(action) {
  trafficState.actions = [action, ...trafficState.actions].slice(0, 25);
}
