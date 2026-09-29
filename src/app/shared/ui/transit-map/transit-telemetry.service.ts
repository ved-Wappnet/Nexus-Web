import { Injectable } from '@angular/core';
import { OrderStatus, OrderStatuses, OrderView } from '@core/models';
import {
  LogisticsWaypoint,
  TransitMode,
  TransitTelemetry,
  WaypointStatus,
} from './transit-telemetry.model';

@Injectable({
  providedIn: 'root',
})
export class TransitTelemetryService {
  getTelemetryForOrder(order: OrderView): TransitTelemetry {
    const id = order.id || 'NEXUS-01';
    const status = order.status;
    const trackingNum =
      order.trackingNumber || `NX-${id.slice(0, 4).toUpperCase()}-${id.slice(-4).toUpperCase()}`;

    // Select realistic carrier & mode based on order or hash
    const carriers = [
      { name: 'FedEx Priority Air', mode: 'AIR_CARGO' as TransitMode, prefix: 'FDX' },
      { name: 'DHL Global Forwarding', mode: 'AIR_CARGO' as TransitMode, prefix: 'DHL' },
      { name: 'Maersk Line Intermodal', mode: 'OCEAN_VESSEL' as TransitMode, prefix: 'MSK' },
      { name: 'Nexus Logistics Express', mode: 'GROUND_EXPRESS' as TransitMode, prefix: 'NX-EXP' },
    ];
    const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const chosen = carriers[hash % carriers.length];

    const carrierName = order.carrier || chosen.name;
    const mode =
      carrierName.toLowerCase().includes('ocean') || carrierName.toLowerCase().includes('maersk')
        ? ('OCEAN_VESSEL' as TransitMode)
        : carrierName.toLowerCase().includes('truck') ||
            carrierName.toLowerCase().includes('express')
          ? ('GROUND_EXPRESS' as TransitMode)
          : ('AIR_CARGO' as TransitMode);

    const vesselOrFlight =
      mode === 'AIR_CARGO'
        ? `${chosen.prefix}-${100 + (hash % 899)}`
        : mode === 'OCEAN_VESSEL'
          ? `Vessel Pacific Queen V.${(hash % 90) + 10}`
          : `Fleet Transport #${(hash % 900) + 100}`;

    // Progress determination
    let progress = 20;
    let statusText = 'Manifest verified & packed at supplier factory';
    let speedOrAlt = '0 km/h · Staged at Dock';

    if (status === OrderStatuses.PROCESSING) {
      progress = 35;
      statusText = 'Export clearance completed · Ready for departure';
      speedOrAlt = 'Customs Bonded Hold';
    } else if (status === OrderStatuses.SHIPPED) {
      progress = 62;
      statusText =
        mode === 'AIR_CARGO'
          ? `In-Flight cruising corridor · En route`
          : `Open Water Transit · Container Secured`;
      speedOrAlt = mode === 'AIR_CARGO' ? '860 km/h · Alt 34,000 ft' : '19.4 knots · SE Heading';
    } else if (status === OrderStatuses.OUT_FOR_DELIVERY) {
      progress = 88;
      statusText = 'Dispatched from regional sort hub with local courier';
      speedOrAlt = 'Local Courier Unit #41';
    } else if (status === OrderStatuses.DELIVERED) {
      progress = 100;
      statusText = 'Consignment received & digital signature logged';
      speedOrAlt = 'Delivered · Terminal Complete';
    } else if (status === OrderStatuses.CANCELLED) {
      progress = 0;
      statusText = 'Shipment recalled / cancelled by platform';
      speedOrAlt = 'Voided';
    }

    // Waypoints definition with precise relative coordinates (x, y % on vector map)
    const baseWaypoints: Omit<LogisticsWaypoint, 'status' | 'timestamp'>[] = [
      {
        id: 'wp-origin',
        name: 'Shenzhen Tech Export Park',
        hubCode: 'SZX-HUB',
        location: 'Shenzhen, CN',
        type: 'ORIGIN',
        coords: { x: 10, y: 70 },
        details: 'Palletized & verified against PO specifications',
        sealNumber: `SEAL-${(hash % 8999) + 1000}`,
        temperatureOrSpec: 'Ambient 21°C · Shock Sensors Active',
      },
      {
        id: 'wp-export',
        name: 'Hong Kong International Gateway',
        hubCode: 'HKG-AIR',
        location: 'Hong Kong, HK',
        type: 'EXPORT_PORT',
        coords: { x: 26, y: 50 },
        details: 'Customs declaration sealed · Transferred to airside apron',
        sealNumber: `HK-CTN-${(hash % 999) + 100}`,
      },
      {
        id: 'wp-mid',
        name: 'Trans-Pacific Skyway Corridor',
        hubCode: 'PAC-WAY',
        location: 'Mid-Transit Air Corridor',
        type: 'CORRIDOR',
        coords: { x: 50, y: 24 },
        details: 'Real-time ADS-B transponder telemetry active · Non-stop routing',
        temperatureOrSpec: mode === 'AIR_CARGO' ? 'Pressurized Cargo Hold' : 'Dry Sea Container',
      },
      {
        id: 'wp-import',
        name: 'San Francisco Metro Logistics Port',
        hubCode: 'SFO-CARGO',
        location: 'San Francisco, CA, US',
        type: 'IMPORT_CUSTOMS',
        coords: { x: 74, y: 40 },
        details: 'US CBP Entry Cleared (Nexus Pre-Cleared B2B Escrow)',
      },
      {
        id: 'wp-sort',
        name: 'Silicon Valley Regional Distribution Center',
        hubCode: 'SJC-DC',
        location: 'San Jose, CA, US',
        type: 'SORT_FACILITY',
        coords: { x: 86, y: 60 },
        details: 'Sorted to route sequence · Assigned to final mile courier',
      },
      {
        id: 'wp-dest',
        name: 'Corporate Receiving Bay',
        hubCode: 'BAY-DEST',
        location: order.customerEmail ? 'Enterprise Facility' : 'Destination Address',
        type: 'DESTINATION',
        coords: { x: 94, y: 75 },
        details: 'Digital POD (Proof of Delivery) & recipient verification required',
      },
    ];

    // Determine each waypoint's status based on overall progress
    const waypoints: LogisticsWaypoint[] = baseWaypoints.map((wp, idx) => {
      const stepThreshold = (idx + 1) * (100 / baseWaypoints.length);
      const prevThreshold = idx * (100 / baseWaypoints.length);

      let wpStatus: WaypointStatus = 'UPCOMING';
      let ts: string | undefined = undefined;

      const orderCreated = order.createdAt ? new Date(order.createdAt) : new Date();

      if (progress >= stepThreshold) {
        wpStatus = 'COMPLETED';
        const offsetHours = idx * 6;
        const d = new Date(orderCreated.getTime() + offsetHours * 3600000);
        ts = d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } else if (progress > prevThreshold && progress < stepThreshold) {
        wpStatus = 'IN_TRANSIT';
        const offsetHours = idx * 5;
        const d = new Date(orderCreated.getTime() + offsetHours * 3600000);
        ts = `Active · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        wpStatus = 'UPCOMING';
        const offsetHours = idx * 8;
        const d = new Date(orderCreated.getTime() + offsetHours * 3600000);
        ts = `Est: ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      }

      return {
        ...wp,
        status: wpStatus,
        timestamp: ts,
      };
    });

    // Compute vehicle marker current coordinates along the polyline / bezier curve
    const currentCoords = this.interpolateCoords(waypoints, progress);

    const etaDate = order.estimatedDelivery
      ? new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      : new Date(Date.now() + 86400000 * 3).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });

    return {
      orderId: id,
      trackingNumber: trackingNum,
      carrier: carrierName,
      mode,
      vesselOrFlightNumber: vesselOrFlight,
      originName: order.destinationCountry?.toLowerCase().includes('india') ? 'Gujarat Regional Logistics Depot' : 'Shenzhen Advanced Supply Hub',
      originCountry: order.destinationCountry?.toLowerCase().includes('india') ? 'India' : 'China',
      destinationName: order.destinationCity ? `${order.destinationCity} Receiving Dock` : 'Buyer Regional Receiving',
      destinationCountry: order.destinationCountry || 'United States',
      departureDate: new Date(order.createdAt || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      estimatedArrival: etaDate,
      progressPercent: progress,
      currentStatusText: statusText,
      speedOrAltitude: speedOrAlt,
      currentCoords,
      waypoints,
    };
  }

  private interpolateCoords(
    waypoints: LogisticsWaypoint[],
    progress: number,
  ): { x: number; y: number } {
    if (progress <= 0 || waypoints.length === 0) return waypoints[0].coords;
    if (progress >= 100) return waypoints[waypoints.length - 1].coords;

    const n = waypoints.length;
    const segmentCount = n - 1;
    const segmentSpan = 100 / segmentCount;
    const i = Math.min(segmentCount - 1, Math.floor(progress / segmentSpan));
    const t = (progress - i * segmentSpan) / segmentSpan;

    const pts = waypoints.map((w) => w.coords);
    const pPrev = i === 0 ? pts[0] : pts[i - 1];
    const pCurr = pts[i];
    const pNext = pts[i + 1];
    const pAfter = i + 2 < n ? pts[i + 2] : pNext;

    const cp1X = pCurr.x + (pNext.x - pPrev.x) / 6;
    const cp1Y = pCurr.y + (pNext.y - pPrev.y) / 6;
    const cp2X = pNext.x - (pAfter.x - pCurr.x) / 6;
    const cp2Y = pNext.y - (pAfter.y - pCurr.y) / 6;

    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    const x = mt3 * pCurr.x + 3 * mt2 * t * cp1X + 3 * mt * t2 * cp2X + t3 * pNext.x;
    const y = mt3 * pCurr.y + 3 * mt2 * t * cp1Y + 3 * mt * t2 * cp2Y + t3 * pNext.y;

    return {
      x: Math.round(x),
      y: Math.round(y),
    };
  }
}
