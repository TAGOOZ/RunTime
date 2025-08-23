import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GPSPoint } from '../lib/gps';

// Fix for default markers in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RouteMapProps {
  points: GPSPoint[];
  className?: string;
}

export function RouteMap({ points, className = '' }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([points[0].latitude, points[0].longitude], 15);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear existing layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    if (points.length < 2) return;

    // Create route polyline
    const latLngs: L.LatLngExpression[] = points.map(point => [point.latitude, point.longitude]);
    const polyline = L.polyline(latLngs, { 
      color: '#FF5722', 
      weight: 4,
      opacity: 0.8 
    }).addTo(map);

    // Add start marker
    L.marker([points[0].latitude, points[0].longitude])
      .addTo(map)
      .bindPopup('Start')
      .openPopup();

    // Add end marker
    if (points.length > 1) {
      const endPoint = points[points.length - 1];
      L.marker([endPoint.latitude, endPoint.longitude])
        .addTo(map)
        .bindPopup('Finish');
    }

    // Fit map to route bounds
    map.fitBounds(polyline.getBounds(), { padding: [20, 20] });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-8 text-center ${className}`}>
        <p className="text-gray-400">No GPS data available for this workout</p>
      </div>
    );
  }

  return <div ref={mapRef} className={`rounded-lg ${className}`} style={{ height: '300px', width: '100%' }} />;
}