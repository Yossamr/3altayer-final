import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapLayerProps {
    points: [number, number, number][]; // [lat, lng, intensity]
    options?: any;
}

export const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ points, options }) => {
    const map = useMap();
    const layerRef = useRef<any>(null);

    useEffect(() => {
        if (!map) return;
        
        if (layerRef.current) {
            map.removeLayer(layerRef.current);
        }

        layerRef.current = (L as any).heatLayer(points, options).addTo(map);

        return () => {
            if (layerRef.current) {
                map.removeLayer(layerRef.current);
            }
        };
    }, [map, points, options]);

    return null;
};
