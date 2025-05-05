import { createContext, useContext, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

interface Location {
   latitude: number;
   longitude: number;
}

interface MapContextType {
   mapRef: React.MutableRefObject<mapboxgl.Map | null>;
   targetLocation: Location | null;
   setTargetLocation: (location: Location | null) => void;
}

const MapContext = createContext<MapContextType | null>(null);

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const mapRef = useRef<mapboxgl.Map | null>(null);
   const [targetLocation, setTargetLocation] = useState<Location | null>(null);

   return <MapContext.Provider value={{ mapRef, targetLocation, setTargetLocation }}>{children}</MapContext.Provider>;
};

export const useMap = () => {
   const context = useContext(MapContext);
   if (!context) throw new Error("useMap must be used within MapProvider");
   return context;
};
