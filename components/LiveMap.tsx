import { useLanguage } from "../services/LanguageContext";
import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { User, Order, OrderStatus } from '../types';
interface LiveMapProps {
  users: User[];
  orders: Order[];
  viewOnly?: boolean;
  heatmapMode?: boolean;
  heatmapRangeDays?: number;
}
const MapResizer = () => {
  const {
    t
  } = useLanguage();
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      console.log('Map invalidated size');
    }, 500);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};
export const LiveMap: React.FC<LiveMapProps> = ({
  users,
  orders,
  viewOnly = false,
  heatmapMode = false,
  heatmapRangeDays = 7
}) => {
  const {
    t
  } = useLanguage();
  const drivers = useMemo(() => users.filter(u => (u.role as string) === 'DRIVER' || (u.role as string) === 'agent' || (u.role as string) === 'driver'), [users]);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const createMarkerIcon = (isOnline: boolean, isBusy: boolean, isIdle: boolean) => {
    let color = '#9CA3AF'; // offline gray
    let ringColor = 'white';
    let animation = '';
    if (isOnline) {
      color = isBusy ? '#ef4444' : '#22c55e'; // red busy, green available
      if (isIdle) {
        color = '#f59e0b'; // Amber for idle
        ringColor = '#fef3c7';
        animation = 'animate-pulse';
      }
    }
    return L.divIcon({
      html: `
                <div class="relative flex flex-col items-center justify-center ${animation}" style="width: 32px; height: 32px;">
                    <div class="absolute inset-0 rounded-full blur-[6px] opacity-60 scale-125" style="background-color: ${color};"></div>
                    <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid ${ringColor}; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3); display: flex; align-items: center; justify-content: center; position: relative;">
                        ${isIdle && isOnline ? '<div style="position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; width: 14px; height: 14px; border-radius: 50%; font-size: 9px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">!</div>' : ''}
                        <div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>
                    </div>
                </div>
            `,
      className: 'custom-driver-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  };
  const driversWithStatus = useMemo(() => {
    let defaultLat = 31.0360;
    let defaultLng = 30.4600;
    const now = Date.now();
    return drivers.map((driver, index) => {
      const isOnline = driver.isOnline !== undefined ? driver.isOnline : false;
      const activeOrders = orders.filter(o => o.driverId && String(o.driverId) === String(driver.id) && [OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.ON_THE_WAY, OrderStatus.RECEIPT_PAID, OrderStatus.WAITING_PREP].includes(o.status));
      const isBusy = activeOrders.length > 0;

      // Idle detection: 10 mins threshold for UI marking
      const idleTimeMs = driver.lastMovedAt ? now - driver.lastMovedAt : 0;
      const isIdle = isOnline && !isBusy && idleTimeMs > 10 * 60 * 1000;

      // Give dummy coordinates if missing (for demo/fallback)
      const lat = driver.currentLat || defaultLat + index * 0.005;
      const lng = driver.currentLng || defaultLng + index * 0.005;
      return {
        ...driver,
        isOnline,
        isBusy,
        isIdle,
        idleTimeMs,
        currentLat: lat,
        currentLng: lng,
        activeOrderIds: activeOrders.map(o => o.id)
      };
    });
  }, [drivers, orders]);
  const onlineDrivers = driversWithStatus.filter(d => d.isOnline);
  const idleDrivers = onlineDrivers.filter(d => d.isIdle);
  const busyDrivers = onlineDrivers.filter(d => d.isBusy);
  const freeDrivers = onlineDrivers.filter(d => !d.isBusy && !d.isIdle);

  // Default to an approximate center. 
  // Ideally we fit bounds to the online drivers, but a fixed center is fine to start.
  const centerPos: [number, number] = [31.0360, 30.4600]; // Damanhour default
  const firstActiveDriver = onlineDrivers.find(d => d.currentLat && d.currentLng);
  const mapCenter: [number, number] = firstActiveDriver && firstActiveDriver.currentLat && firstActiveDriver.currentLng ? [firstActiveDriver.currentLat, firstActiveDriver.currentLng] : centerPos;
  const heatmapData = useMemo(() => {
    if (!heatmapMode) return [];

    // 1. Filter active orders
    const activeOrders = orders.filter(o => o.deliveryAddress?.lat && o.deliveryAddress?.lng && Date.now() - o.createdAt < heatmapRangeDays * 24 * 60 * 60 * 1000);

    // 2. Grid Clustering Algorithm (~1.1km grid cells in Cairo/Egypt longitude)
    const grid: Record<string, {
      lat: number;
      lng: number;
      count: number;
      orders: Order[];
    }> = {};
    activeOrders.forEach(o => {
      const lat = o.deliveryAddress.lat!;
      const lng = o.deliveryAddress.lng!;

      // Round to 2 decimal places creates roughly 1.1km x 1.1km buckets
      const gridLat = Math.round(lat * 100) / 100;
      const gridLng = Math.round(lng * 100) / 100;
      const key = `${gridLat},${gridLng}`;
      if (!grid[key]) {
        grid[key] = {
          lat: gridLat,
          lng: gridLng,
          count: 0,
          orders: []
        };
      }
      grid[key].count += 1;
      grid[key].orders.push(o);
    });

    // 3. Find max density for relative color scaling
    const maxDensity = Math.max(1, ...Object.values(grid).map(c => c.count));

    // 4. Map clusters to view models
    return Object.values(grid).map(cluster => {
      const intensity = cluster.count / maxDensity; // 0.0 to 1.0

      // Dynamic color logic based on intensity
      let color = '#f97316'; // orange-500 default
      let coreColor = '#ef4444'; // red-500 default

      if (intensity > 0.7) {
        color = '#ef4444'; // Red for high density
        coreColor = '#b91c1c'; // Dark red core
      } else if (intensity < 0.3) {
        color = '#eab308'; // Yellow for low density
        coreColor = '#f59e0b'; // Amber core
      }
      return {
        ...cluster,
        intensity,
        color,
        coreColor
      };
    });
  }, [orders, heatmapMode]);
  return <div className="flex flex-col gap-4">
            {/* Status Summary */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-[1.5rem] p-4 border border-white dark:border-gray-700 shadow-xl flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95">
                    <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">{t("ar_all_1220")}</span>
                    <span className="text-2xl font-black text-primary">{onlineDrivers.length}</span>
                </div>
                <div className="bg-green-500/10 dark:bg-green-500/20 backdrop-blur-md rounded-[1.5rem] p-4 border border-green-500/20 dark:border-green-500/30 shadow-lg flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95">
                    <span className="text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-widest">{t("ar_all_1221")}</span>
                    <span className="text-2xl font-black text-green-600 dark:text-green-400">{freeDrivers.length}</span>
                </div>
                <div className="bg-red-500/10 dark:bg-red-500/20 backdrop-blur-md rounded-[1.5rem] p-4 border border-red-500/20 dark:border-red-500/30 shadow-lg flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95">
                    <span className="text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest">{t("ar_all_1222")}</span>
                    <span className="text-2xl font-black text-red-600 dark:text-red-400">{busyDrivers.length}</span>
                </div>
                <div className="bg-amber-500/10 dark:bg-amber-500/20 backdrop-blur-md rounded-[1.5rem] p-4 border border-amber-500/20 dark:border-amber-500/30 shadow-lg flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95">
                    <span className="text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest">{t("ar_all_1223")}</span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{idleDrivers.length}</span>
                </div>
            </div>

            {/* Map Area */}
            <div className="w-full h-[65vh] min-h-[450px] bg-gray-100 dark:bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white dark:border-gray-800 relative z-0">
                <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                    <button onClick={() => setRefreshKey(prev => prev + 1)} className="bg-white dark:bg-gray-800 p-2 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 text-primary active:scale-95 transition-all">
                        <span className="material-icons-round">refresh</span>
                    </button>
                </div>

                <MapContainer key={refreshKey} center={mapCenter} zoom={12} style={{
        width: '100%',
        height: '100%',
        zIndex: 1
      }} scrollWheelZoom={true} attributionControl={false}>
                    <MapResizer />
                    <TileLayer url={heatmapMode ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"} className={heatmapMode ? "map-tiles no-invert" : "map-tiles"} />
                    
                    {heatmapMode ? (/* Heatmap Overlay: Render density markers using new clustering algorithm */
        heatmapData.map((cluster, idx) => <React.Fragment key={`heat-cluster-${idx}`}>
                                {/* Outer Glow scaled by intensity */}
                                <Circle center={[cluster.lat, cluster.lng]} radius={600 + cluster.intensity * 400} pathOptions={{
            fillColor: cluster.color,
            color: 'transparent',
            fillOpacity: 0.1 * cluster.intensity,
            weight: 0
          }} />
                                {/* Mid Glow */}
                                <Circle center={[cluster.lat, cluster.lng]} radius={300 + cluster.intensity * 150} pathOptions={{
            fillColor: cluster.color,
            color: 'transparent',
            fillOpacity: 0.2 * cluster.intensity,
            weight: 0
          }} />
                                {/* Core Hotspot */}
                                <Circle center={[cluster.lat, cluster.lng]} radius={120} pathOptions={{
            fillColor: cluster.coreColor,
            color: 'white',
            fillOpacity: 0.5 * cluster.intensity + 0.3,
            weight: 1,
            opacity: 0.2
          }}>
                                    <Popup>
                                        <div className="text-center font-['Cairo']">
                                            <div className="font-black text-lg text-primary">{cluster.count}{t("ar_all_1224")}</div>
                                            <div className="text-xs text-gray-500">{t("ar_all_1225")}</div>
                                        </div>
                                    </Popup>
                                </Circle>
                            </React.Fragment>)) : (/* Standard View with Drivers and Order Markers */
        <>
                            {driversWithStatus.filter(d => d.currentLat && d.currentLng).map(driver => <Marker key={driver.id} position={[driver.currentLat!, driver.currentLng!]} icon={createMarkerIcon(driver.isOnline, driver.isBusy, driver.isIdle)}>
                                    <Popup minWidth={180}>
                                        <div className="text-right flex flex-col items-end gap-1 font-['Cairo']" dir="rtl">
                                            <div className="flex items-center gap-2 mb-1">
                                                {!driver.isOnline && <span className="bg-gray-100 text-gray-500 text-[8px] px-1 rounded">{t("ar_all_1226")}</span>}
                                                <strong className="text-primary text-sm">{driver.name}</strong>
                                            </div>
                                            <span className="text-gray-500 text-[10px]">{driver.phone}</span>
                                            
                                            {driver.isOnline && <div className="mt-1 flex flex-col gap-1 w-full items-end">
                                                    {driver.isIdle && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-[9px] font-bold border border-amber-200 w-full text-center">{t("ar_all_1227")}{Math.floor(driver.idleTimeMs / 60000)}{t("ar_all_1129")}</span>}
                                                    <div className="text-[8px] text-gray-400 w-full text-center mt-1">{t("ar_all_1228")}{driver.lastSeenAt ? new Date(driver.lastSeenAt).toLocaleTimeString('ar-EG') : t("ar_all_1229")}
                                                    </div>
                                                    {driver.isBusy ? <span className="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-bold">{t("ar_all_1230")}{driver.activeOrderIds.length}{t("ar_all_1231")}</span> : <span className="bg-green-100 text-green-600 px-2 py-1 rounded-lg text-[10px] font-bold">{t("ar_all_1232")}</span>}
                                                </div>}
                                        </div>
                                    </Popup>
                                </Marker>)}
                        </>)}
                </MapContainer>
            </div>
        </div>;
};