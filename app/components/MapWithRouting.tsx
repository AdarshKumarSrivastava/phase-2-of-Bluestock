"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// Fix leaflet default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapWithRoutingProps {
  destinationAddress: string;
}

export default function MapWithRouting({ destinationAddress }: MapWithRoutingProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState<string>("Initializing map...");

  useEffect(() => {
    if (!mapRef.current) return;

    let map: L.Map | null = null;
    let routingControl: L.Routing.Control | null = null;

    const initMap = async () => {
      try {
        setLoadingMsg("Getting your location...");
        const userLoc = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        });

        const startLat = userLoc.coords.latitude;
        const startLng = userLoc.coords.longitude;

        setLoadingMsg("Finding destination...");
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            destinationAddress
          )}`
        );
        const nomData = await nomRes.json();

        if (!nomData || nomData.length === 0) {
          setError("Could not find the destination address.");
          setLoadingMsg("");
          return;
        }

        const destLat = parseFloat(nomData[0].lat);
        const destLng = parseFloat(nomData[0].lon);

        setLoadingMsg("");

        // Initialize Map
        map = L.map(mapRef.current).setView([startLat, startLng], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        routingControl = L.Routing.control({
          waypoints: [
            L.latLng(startLat, startLng),
            L.latLng(destLat, destLng),
          ],
          routeWhileDragging: true,
          showAlternatives: true,
          fitSelectedRoutes: true,
          lineOptions: {
            styles: [{ color: '#3b82f6', weight: 6, opacity: 0.8 }],
            extendToWaypoints: true,
            missingRouteTolerance: 10
          },
        }).addTo(map);

      } catch (err: any) {
        console.error(err);
        if (err.code === 1) {
            setError("Location access denied. Please enable location services to see the route.");
        } else {
            setError(err.message || "Failed to initialize map.");
        }
        setLoadingMsg("");
      }
    };

    initMap();

    return () => {
      if (routingControl && map) {
        try {
          map.removeControl(routingControl);
        } catch (e) {}
      }
      if (map) {
        map.remove();
      }
    };
  }, [destinationAddress]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden shadow-inner bg-slate-100" style={{ zIndex: 1 }}>
      {loadingMsg && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm" style={{ zIndex: 1000 }}>
           <div className="flex flex-col items-center">
             <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
             <p className="text-slate-600 font-medium">{loadingMsg}</p>
           </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 backdrop-blur-sm p-6 text-center" style={{ zIndex: 1000 }}>
           <div>
             <div className="inline-flex h-12 w-12 rounded-full bg-red-100 items-center justify-center mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
             </div>
             <p className="text-red-700 font-medium">{error}</p>
           </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full min-h-[400px]" />
    </div>
  );
}
