const timeLabels = [
  "01:00",
  "03:00",
  "05:00",
  "07:00",
  "09:00",
  "11:00",
  "13:00",
  "15:00",
  "17:00",
  "19:00",
  "21:00",
  "23:00",
];

const buildTrafficSeries = (vehicles, congestion) =>
  timeLabels.map((time, index) => ({
    time,
    vehicles: vehicles[index],
    congestion: congestion[index],
  }));

const buildWaitSeries = (waitTimes) =>
  timeLabels.map((time, index) => ({
    time,
    wait: waitTimes[index],
  }));

export const rangeOptions = [
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
];

export const analyticsByRange = {
  today: {
    titleSuffix: "Today",
    kpis: [
      {
        title: "Total Vehicles Today",
        value: "38,150",
        detail: "+8% vs yesterday",
        tone: "positive",
      },
      {
        title: "Avg Signal Wait Time",
        value: "58s",
        detail: "12% improvement",
        tone: "positive",
      },
      {
        title: "Congestion Reduction",
        value: "17.5%",
        detail: "AI optimization",
        tone: "neutral",
      },
      {
        title: "Active Intersections",
        value: "42",
        detail: "All operational",
        tone: "neutral",
      },
    ],
    trafficTrend: buildTrafficSeries(
      [820, 760, 910, 1420, 2510, 2890, 3120, 3380, 3510, 2940, 2110, 1690],
      [18, 16, 19, 28, 44, 47, 52, 58, 61, 48, 33, 25],
    ),
    waitTimes: buildWaitSeries([45, 42, 44, 52, 61, 66, 70, 64, 60, 55, 50, 47]),
  },
  "7d": {
    titleSuffix: "Last 7 Days",
    kpis: [
      {
        title: "Total Vehicles Today",
        value: "38,150",
        detail: "+8% vs yesterday",
        tone: "positive",
      },
      {
        title: "Avg Signal Wait Time",
        value: "58s",
        detail: "12% improvement",
        tone: "positive",
      },
      {
        title: "Congestion Reduction",
        value: "17.5%",
        detail: "AI optimization",
        tone: "neutral",
      },
      {
        title: "Active Intersections",
        value: "42",
        detail: "All operational",
        tone: "neutral",
      },
    ],
    trafficTrend: buildTrafficSeries(
      [910, 860, 950, 1580, 2720, 2980, 3260, 3490, 3670, 3060, 2230, 1820],
      [20, 19, 22, 31, 48, 54, 57, 62, 66, 52, 38, 29],
    ),
    waitTimes: buildWaitSeries([47, 45, 46, 54, 64, 69, 72, 66, 61, 57, 51, 49]),
  },
  "30d": {
    titleSuffix: "Last 30 Days",
    kpis: [
      {
        title: "Total Vehicles Today",
        value: "36,920",
        detail: "+5% monthly avg",
        tone: "positive",
      },
      {
        title: "Avg Signal Wait Time",
        value: "61s",
        detail: "9% improvement",
        tone: "positive",
      },
      {
        title: "Congestion Reduction",
        value: "15.2%",
        detail: "AI optimization",
        tone: "neutral",
      },
      {
        title: "Active Intersections",
        value: "42",
        detail: "All operational",
        tone: "neutral",
      },
    ],
    trafficTrend: buildTrafficSeries(
      [780, 740, 860, 1360, 2420, 2710, 3010, 3240, 3410, 2870, 2040, 1600],
      [17, 15, 18, 27, 42, 45, 50, 56, 59, 45, 31, 23],
    ),
    waitTimes: buildWaitSeries([49, 47, 48, 56, 66, 71, 74, 68, 63, 59, 54, 50]),
  },
};

export const navigationItems = [
  "Overview",
  "Live Dashboard",
  "AI Decision",
  "Emergency",
  "Parking",
  "Analytics",
];
