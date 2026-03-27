import { emergencyVehicleService } from "../services/emergencyVehicleService.js";

export async function startEmergencyController(req, res) {
  const data = await emergencyVehicleService.startEmergency(req.validated.body);
  res.status(201).json({
    success: true,
    data,
  });
}

export async function getActiveEmergencyController(_req, res) {
  const data = await emergencyVehicleService.getActiveVehicles();
  res.json({
    success: true,
    data,
  });
}

export async function getEmergencyHistoryController(req, res) {
  const data = await emergencyVehicleService.getHistory(req.validated.query.limit);
  res.json({
    success: true,
    data,
  });
}
