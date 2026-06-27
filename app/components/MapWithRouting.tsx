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
  
  const [routeInfo, setRouteInfo] = useState<{ distance: string; time: string } | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const startLocRef = useRef<L.LatLng | null>(null);
  const destLocRef = useRef<L.LatLng | null>(null);
  const routingControlRef = useRef<L.Routing.Control | null>(null);

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
        startLocRef.current = L.latLng(startLat, startLng);

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
        destLocRef.current = L.latLng(destLat, destLng);

        setLoadingMsg("");

        // Initialize Map
        map = L.map(mapRef.current, { zoomControl: false }).setView([startLat, startLng], 13);
        mapInstanceRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Custom icons
        const startIcon = L.divIcon({
          html: `<div style="background-color: #22c55e; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);"></div>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const endIcon = L.divIcon({
          html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"><div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div></div>`,
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const plan = L.Routing.plan([startLocRef.current, destLocRef.current], {
            createMarker: function(i: number, wp: any) {
                return L.marker(wp.latLng, {
                    icon: i === 0 ? startIcon : endIcon,
                    draggable: false
                });
            },
            routeWhileDragging: false
        });

        routingControl = L.Routing.control({
          plan: plan,
          show: false, // Hide the default itinerary
          addWaypoints: false,
          fitSelectedRoutes: true,
          lineOptions: {
            styles: [{ color: '#3b82f6', weight: 6, opacity: 0.8 }],
            extendToWaypoints: true,
            missingRouteTolerance: 10
          },
        }).addTo(map);

        routingControlRef.current = routingControl;

        routingControl.on('routesfound', function(e: any) {
            const routes = e.routes;
            const summary = routes[0].summary;
            
            // distance in meters
            const distanceKm = (summary.totalDistance / 1000).toFixed(1);
            
            // time in seconds
            const timeMinutes = Math.round(summary.totalTime / 60);
            const timeHours = Math.floor(timeMinutes / 60);
            const mins = timeMinutes % 60;
            
            let timeStr = '';
            if (timeHours > 0) {
                timeStr = `${timeHours} hr ${mins} min`;
            } else {
                timeStr = `${mins} min`;
            }

            setRouteInfo({ distance: `${distanceKm} km`, time: timeStr });
        });

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

  const focusStart = () => {
      if (mapInstanceRef.current && startLocRef.current) {
          mapInstanceRef.current.setView(startLocRef.current, 15, { animate: true });
      }
  };

  const focusEnd = () => {
      if (mapInstanceRef.current && destLocRef.current) {
          mapInstanceRef.current.setView(destLocRef.current, 15, { animate: true });
      }
  };

  const focusRoute = () => {
      if (mapInstanceRef.current && startLocRef.current && destLocRef.current) {
          const bounds = L.latLngBounds(startLocRef.current, destLocRef.current);
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
      }
  };

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden shadow-inner bg-slate-100 flex flex-col" style={{ zIndex: 1 }}>
      <style>{`
        /* Force hide the default leaflet routing container if show:false is not enough */
        .leaflet-routing-container {
            display: none !important;
        }
      `}</style>
      
      {/* Overlay UI elements */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-3 pointer-events-none">
          {routeInfo && (
              <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-slate-100 pointer-events-auto self-start animate-in slide-in-from-top-4 fade-in duration-500 max-w-sm w-full sm:w-auto">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Trip Summary</h3>
                  <div className="flex items-end gap-5">
                      <div>
                          <p className="text-3xl font-black text-blue-600 tracking-tight">{routeInfo.time}</p>
                      </div>
                      <div className="mb-1">
                          <p className="text-lg font-bold text-slate-700">{routeInfo.distance}</p>
                      </div>
                  </div>
              </div>
          )}
      </div>

      <div className="absolute bottom-6 left-4 z-[1000] flex flex-col gap-2 pointer-events-none">
          {routeInfo && (
              <div className="flex flex-col gap-2 pointer-events-auto">
                  <button onClick={focusStart} className="bg-white hover:bg-slate-50 text-slate-700 p-2.5 px-4 rounded-xl shadow-md border border-slate-100 transition-all flex items-center justify-start gap-2.5 font-medium text-sm group" title="My Location">
                      <div className="w-3 h-3 rounded-full bg-green-500 group-hover:scale-125 transition-transform shadow-sm"></div>
                      My Location
                  </button>
                  <button onClick={focusRoute} className="bg-white hover:bg-slate-50 text-slate-700 p-2.5 px-4 rounded-xl shadow-md border border-slate-100 transition-all flex items-center justify-start gap-2.5 font-medium text-sm" title="View Route">
                      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      View Entire Route
                  </button>
                  <button onClick={focusEnd} className="bg-white hover:bg-slate-50 text-slate-700 p-2.5 px-4 rounded-xl shadow-md border border-slate-100 transition-all flex items-center justify-start gap-2.5 font-medium text-sm group" title="Destination">
                      <div className="w-3 h-3 rounded-full bg-red-500 flex items-center justify-center group-hover:scale-125 transition-transform shadow-sm"><div className="w-1 h-1 rounded-full bg-white"></div></div>
                      Destination
                  </button>
              </div>
          )}
      </div>

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
             <div className="inline-flex h-12 w-12 rounded-full bg-red-100 items-center justify-center mb-4 shadow-inner">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
             </div>
             <p className="text-red-700 font-medium text-lg">{error}</p>
           </div>
        </div>
      )}
      <div ref={mapRef} className="w-full flex-1 min-h-[400px]" />
    </div>
  );
}
