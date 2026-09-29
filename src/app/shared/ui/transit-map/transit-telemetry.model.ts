export type WaypointType =
  'ORIGIN' | 'EXPORT_PORT' | 'CORRIDOR' | 'IMPORT_CUSTOMS' | 'SORT_FACILITY' | 'DESTINATION';

export type WaypointStatus = 'COMPLETED' | 'IN_TRANSIT' | 'UPCOMING';

export type TransitMode = 'AIR_CARGO' | 'OCEAN_VESSEL' | 'GROUND_EXPRESS';

export interface LogisticsWaypoint {
  id: string;
  name: string;
  hubCode: string;
  location: string;
  type: WaypointType;
  status: WaypointStatus;
  timestamp?: string;
  coords: { x: number; y: number }; // Relative percentage coordinates on canvas (0 - 100)
  details: string;
  sealNumber?: string;
  temperatureOrSpec?: string;
}

export interface TransitTelemetry {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  mode: TransitMode;
  vesselOrFlightNumber: string;
  originName: string;
  originCountry: string;
  destinationName: string;
  destinationCountry: string;
  departureDate: string;
  estimatedArrival: string;
  progressPercent: number; // 0 - 100
  currentStatusText: string;
  speedOrAltitude?: string;
  currentCoords: { x: number; y: number };
  waypoints: LogisticsWaypoint[];
}
