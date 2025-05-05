import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Extend the Window interface to include mapboxMap
declare global {
  interface Window {
    mapboxMap?: mapboxgl.Map;
  }
}

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface Pin {
  latitude: number;
  longitude: number;
}

const GlobeComponent: React.FC<{ onPinSelected: (pin: Pin) => void }> = ({
  onPinSelected,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [pin, setPin] = useState<Pin | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [0, 0],
      zoom: 1.5,
      projection: { name: "mercator" as const },
    });

    // Expose the map instance globally for testing
    window.mapboxMap = map.current;

    map.current.on("load", () => {
      if (!map.current) return;
      map.current.setFog({
        "horizon-blend": 0.0,
        "star-intensity": 0.6,
        "space-color": "#000000",
      });
    });

    map.current.on("click", (e) => {
      const newPin = {
        latitude: e.lngLat.lat,
        longitude: e.lngLat.lng,
      };
      setPin(newPin);
      onPinSelected(newPin);
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [onPinSelected]);

  useEffect(() => {
    if (pin && map.current) {
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = new mapboxgl.Marker()
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(map.current);
    }
  }, [pin]);

  return <div ref={mapContainer} className="w-full h-screen relative" />;
};

export default GlobeComponent;
