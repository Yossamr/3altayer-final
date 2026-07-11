import { useLanguage } from "../services/LanguageContext";
import toast from 'react-hot-toast';
import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Use declaring a global `L` variable for Leaflet loaded via CDN
declare const L: any;
interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}
export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  initialLat,
  initialLng
}) => {
  const {
    t
  } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Default to Damanhour if no location provided
  const DEFAULT_LAT = 31.0360;
  const DEFAULT_LNG = 30.4600;
  useEffect(() => {
    // Initialize Map
    if (mapContainerRef.current && !mapInstanceRef.current && typeof L !== 'undefined') {
      const startLat = initialLat || DEFAULT_LAT;
      const startLng = initialLng || DEFAULT_LNG;
      const map = L.map(mapContainerRef.current).setView([startLat, startLng], 13);

      // Add OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Create Draggable Marker
      const marker = L.marker([startLat, startLng], {
        draggable: true
      }).addTo(map);
      marker.on('dragend', function (event: any) {
        const position = marker.getLatLng();
        onLocationSelect(position.lat, position.lng);
      });

      // Click map to move marker
      map.on('click', function (e: any) {
        marker.setLatLng(e.latlng);
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      });
      mapInstanceRef.current = map;
      markerRef.current = marker;
      setIsLoading(false);

      // Try to get user current location if no initial data
      if (!initialLat && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          const {
            latitude,
            longitude
          } = pos.coords;
          map.setView([latitude, longitude], 15);
          marker.setLatLng([latitude, longitude]);
          onLocationSelect(latitude, longitude);
        }, () => {});
      }
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);
  const handleLocateMe = (e: React.MouseEvent) => {
    e.preventDefault();
    if (navigator.geolocation) {
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(pos => {
        const {
          latitude,
          longitude
        } = pos.coords;
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 15);
          markerRef.current.setLatLng([latitude, longitude]);
        }
        onLocationSelect(latitude, longitude);
        setIsLoading(false);
      }, () => {
        toast.error(t("ar_all_1216"));
        setIsLoading(false);
      });
    }
  };
  return <div className="relative w-full h-64 rounded-xl overflow-hidden border-2 border-gray-200">
            {isLoading && <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
                    <Loader2 className="animate-spin text-primary" />
                </div>}
            <div ref={mapContainerRef} className="w-full h-full z-0" />
            
            <button onClick={handleLocateMe} className="absolute top-2 left-2 right-2 bg-white p-3 rounded-xl shadow-md z-[400] text-blue-600 hover:bg-blue-50 border border-blue-200 flex items-center justify-center gap-2 font-black" title={t("ar_all_1217")}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>{t("ar_all_1218")}</button>

            <div className="absolute bottom-2 left-2 right-2 bg-white/90 p-2 rounded-lg text-xs text-center font-bold z-[400] shadow-sm">{t("ar_all_1219")}</div>
        </div>;
};