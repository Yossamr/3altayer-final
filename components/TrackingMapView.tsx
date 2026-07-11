import { useLanguage } from "../services/LanguageContext";
import React, { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useApp } from '../services/AppContext';
import { Order, User } from '../types';
import { X, Navigation, MapPin, Clock, LocateFixed } from 'lucide-react';
import { CURRENCY } from '../constants';
const MapController = ({
  center,
  zoom
}: {
  center: [number, number] | null;
  zoom?: number;
}) => {
  const {
    t
  } = useLanguage();
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || map.getZoom(), {
        duration: 1.5
      });
    }
  }, [center, zoom, map]);
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};
interface TrackingMapViewProps {
  order: Order;
  driver: User;
  onClose: () => void;
}
export const TrackingMapView: React.FC<TrackingMapViewProps> = ({
  order,
  driver,
  onClose
}) => {
  const {
    t
  } = useLanguage();
  const {
    calculateDistance,
    syncDriverLocation
  } = useApp();
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [eta, setEta] = useState<string | null>(null);
  const [currentDriver, setCurrentDriver] = useState<User>(driver);

  // Initial and polling logic for driver location
  useEffect(() => {
    let isSubscribed = true;
    let intervalId: NodeJS.Timeout;
    const fetchLocation = async () => {
      const updatedDriver = await syncDriverLocation(driver.id);
      if (updatedDriver && isSubscribed) {
        setCurrentDriver(updatedDriver);
      }
    };

    // Poll every 5 seconds
    intervalId = setInterval(fetchLocation, 5000);
    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [driver.id, syncDriverLocation]);
  const driverPos: [number, number] | null = currentDriver.currentLat && currentDriver.currentLng ? [currentDriver.currentLat, currentDriver.currentLng] : null;
  const destPos: [number, number] | null = order.deliveryAddress.lat && order.deliveryAddress.lng ? [order.deliveryAddress.lat, order.deliveryAddress.lng] : null;
  useEffect(() => {
    if (driverPos && destPos) {
      const fetchRoute = async () => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${driverPos[1]},${driverPos[0]};${destPos[1]},${destPos[0]}?overview=full&geometries=geojson`;
          const response = await fetch(url);
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            setRouteCoords(route.geometry.coordinates.map((c: any) => [c[1], c[0]]));
            setEta(`${Math.round(route.duration / 60)} min`);
          }
        } catch (e) {
          setRouteCoords([driverPos, destPos]);
        }
      };
      fetchRoute();
    }
  }, [driverPos, destPos]);
  const driverIcon = L.divIcon({
    html: `
            <div class="relative w-14 h-14 flex items-center justify-center driver-marker-glow rounded-full">
                <div class="absolute inset-0 bg-[#29ABE2] rounded-full blur-md opacity-50 scale-125 animate-pulse"></div>
                <div class="relative w-12 h-12 flex items-center justify-center">
                     <svg viewBox="0 0 24 24" width="38" height="38" class="drop-shadow-lg" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.5))">
                        <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round"/>
                        <path d="M12 3.5L6 19l6-2.5 6 2.5L12 3.5z" fill="#29ABE2"/>
                    </svg>
                </div>
            </div>
        `,
    className: 'tracking-driver-marker',
    iconSize: [56, 56],
    iconAnchor: [28, 28]
  });
  const destIcon = L.divIcon({
    html: `
            <div class="relative flex flex-col items-center">
                <div class="w-8 h-8 flex items-center justify-center shrink-0 marker-glow rounded-full">
                    <div class="w-6 h-6 rounded-full bg-white border-[3px] flex items-center justify-center shadow-md relative border-[#FF6600]">
                        <div class="w-2.5 h-2.5 rounded-full bg-[#FF6600]"></div>
                    </div>
                </div>
            </div>
        `,
    className: 'dest-marker',
    iconSize: [32, 64],
    iconAnchor: [16, 32]
  });
  return <div className="fixed inset-0 z-[200] bg-white dark:bg-gray-950 flex flex-col font-['Cairo']" dir="rtl">
            <div className="absolute top-4 inset-x-4 z-[1001] pointer-events-none">
                <div className="flex justify-between items-start">
                    <button onClick={onClose} className="p-4 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl pointer-events-auto border-2 border-gray-100 dark:border-gray-700">
                        <X size={24} />
                    </button>

                    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-3 rounded-2xl shadow-2xl border-2 border-gray-100 dark:border-gray-700 pointer-events-auto flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Clock size={20} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-gray-500">{t("ar_all_1009")}</div>
                            <div className="text-xl font-black text-primary">{eta || '--'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 relative">
                <MapContainer center={driverPos || destPos || [31.0360, 30.4600]} zoom={15} className="w-full h-full" zoomControl={false} attributionControl={false}>
                    <MapController center={driverPos} zoom={15} />
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" className="map-tiles" />
                    
                    {driverPos && <Marker position={driverPos} icon={driverIcon} />}
                    {destPos && <Marker position={destPos} icon={destIcon} />}
                    
                    {routeCoords.length > 0 && <>
                            {/* Wide Soft Shadow Glow */}
                            <Polyline positions={routeCoords} pathOptions={{
            color: '#000000',
            weight: 16,
            opacity: 0.15,
            lineCap: 'round',
            lineJoin: 'round'
          }} />
                            {/* Border / Stroke layer */}
                            <Polyline positions={routeCoords} pathOptions={{
            color: '#1d92c2',
            weight: 8,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round'
          }} />
                            {/* Actual Path Core */}
                            <Polyline positions={routeCoords} pathOptions={{
            color: '#29ABE2',
            weight: 5,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round'
          }} />
                        </>}
                </MapContainer>
            </div>

            <div className="p-6 bg-white dark:bg-gray-900 border-t-2 border-gray-100 dark:border-gray-800 shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center">
                        <div className="w-12 h-12 bg-blue-600 rounded-full border-4 border-white flex items-center justify-center text-white">
                            <Navigation size={24} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-800 dark:text-white">{t("ar_all_1010")}</h3>
                        <p className="text-sm text-gray-500 font-bold">{t("ar_all_1011")}{driver.name}{t("ar_all_1012")}</p>
                    </div>
                </div>
            </div>
        </div>;
};