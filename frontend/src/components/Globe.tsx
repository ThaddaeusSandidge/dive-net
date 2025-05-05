import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAuth } from "@/context/AuthContext";
import { Post } from "@/types/types";
import PostCard from "./PostCard";
import { useMap } from "@/context/MapContext";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

type MapProps = {
   posts: Post[];
};

const Globe: React.FC<MapProps> = ({ posts }) => {
   const mapContainer = useRef<HTMLDivElement>(null);
   const map = useRef<mapboxgl.Map | null>(null);
   const markerRef = useRef<mapboxgl.Marker | null>(null);
   const { user } = useAuth();
   const [selectedPost, setSelectedPost] = useState<Post | null>(null);
   const [modalOpen, setModalOpen] = useState(false);
   const [mapInitialized, setMapInitialized] = useState(false);
   const [searchQuery, setSearchQuery] = useState("");
   const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
   const { targetLocation, setTargetLocation } = useMap();

   // Initialize the map
   useEffect(() => {
      if (!mapContainer.current) return;

      const isValidCoordinate = (coord: number | undefined, max: number) => coord !== undefined && !isNaN(coord) && Math.abs(coord) <= max;

      const validLat = user && isValidCoordinate(user.latitude, 90);
      const validLon = user && isValidCoordinate(user.longitude, 180);

      const initialCenter = validLat && validLon ? [user.longitude as number, user.latitude as number] : [0, 0];

      if (!map.current) {
         map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v11",
            center: initialCenter as [number, number],
            zoom: validLat && validLon ? 9 : 1.5,
            projection: { name: "mercator" },
         });

         map.current.on("load", () => {
            if (!map.current) return;

            map.current.addSource("posts", {
               type: "geojson",
               data: { type: "FeatureCollection", features: [] },
            });

            map.current.addLayer({
               id: "post-circles",
               type: "circle",
               source: "posts",
               paint: {
                  "circle-color": "#3B82F6",
                  "circle-radius": 6,
                  "circle-opacity": 0.9,
                  "circle-stroke-width": 2,
                  "circle-stroke-color": "#ffffff",
               },
            });

            // Add user location marker
            if (validLat && validLon) {
               markerRef.current = new mapboxgl.Marker({
                  color: "#3B82F6",
                  draggable: false,
               })
                  .setLngLat([user.longitude as number, user.latitude as number])
                  .addTo(map.current);
            }

            // Set mouse cursor
            map.current.on("mouseenter", "post-circles", () => {
               map.current?.getCanvas().style.setProperty("cursor", "pointer");
            });

            map.current.on("mouseleave", "post-circles", () => {
               map.current?.getCanvas().style.setProperty("cursor", "");
            });

            // Handle click on post dots
            map.current.on("click", "post-circles", (e) => {
               const feature = e.features?.[0];
               if (!feature) return;

               const postId = Number(feature.id);
               console.log("🔎 Clicked post ID:", postId);

               // Fetch the latest post features from the map source
               const source = map.current?.getSource("posts") as mapboxgl.GeoJSONSource & { _data?: any };
               const data = source._data;

               if (data?.features) {
                  const clickedFeature = data.features.find((f: any) => f.id === postId);
                  if (clickedFeature) {
                     const clickedPostData = clickedFeature.properties;
                     console.log("✅ Clicked post data:", clickedPostData);
                     setSelectedPost(clickedPostData as Post);
                  } else {
                     console.warn("Post not found for ID:", postId);
                     setSelectedPost(null);
                  }
               }

               setModalOpen(true);
            });

            setMapInitialized(true);
            updatePostData(posts);
         });
      }

      return () => {
         if (map.current) {
            map.current.remove();
            map.current = null;
         }
      };
   }, [user?.latitude, user?.longitude]);

   // Update posts on map
   const updatePostData = (posts: Post[]) => {
      if (!map.current || !map.current.getSource("posts")) return;

      const geojson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
         type: "FeatureCollection",
         features: posts.map((post) => ({
            type: "Feature",
            id: post.id,
            properties: {
               id: post.id,
               title: post.title,
               description: post.description,
               latitude: post.latitude,
               longitude: post.longitude,
               visibility: post.visibility,
               activity: post.activity,
               depth: post.depth,
               images: post.images,
               user_id: post.user_id,
               user_name: post.user_name,
               user_avatar: post.user_avatar,
               date: post.date,
               likes: post.likes,
               comments: post.comments,
            },
            geometry: {
               type: "Point",
               coordinates: [post.longitude, post.latitude],
            },
         })),
      };

      (map.current.getSource("posts") as mapboxgl.GeoJSONSource).setData(geojson);
   };

   //this is the useEffect to fly to location
   useEffect(() => {
      if (map.current && targetLocation) {
         map.current.flyTo({
            center: [targetLocation.longitude, targetLocation.latitude],
            zoom: 10,
            essential: true,
         });
      }
   }, [targetLocation]);

   useEffect(() => {
      if (mapInitialized) {
         updatePostData(posts);
      }
   }, [posts, mapInitialized]);

   const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim() || !map.current) return;

      try {
         const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${mapboxgl.accessToken}`);
         const data = await response.json();
         const result = data.features[0];
         if (result) {
            const [lng, lat] = result.center;
            map.current.flyTo({ center: [lng, lat], zoom: 10 });
         }
      } catch (error) {
         console.error("Error searching location:", error);
      }
   };

   const zoomIn = () => map.current?.zoomIn();
   const zoomOut = () => map.current?.zoomOut();
   const flyToUserLocation = () => {
      if (map.current && user?.latitude && user?.longitude) {
         map.current.flyTo({
            center: [user.longitude, user.latitude],
            zoom: 12,
            essential: true,
         });
      }
   };

   return (
      <>
         {modalOpen && selectedPost && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
               <div className="bg-white rounded-xl p-6 max-w-2xl w-full relative overflow-y-auto max-h-[90vh]">
                  <button onClick={() => setModalOpen(false)} className="absolute top-2 right-2 text-gray-600 hover:text-black text-2xl font-bold">
                     &times;
                  </button>
                  <PostCard post={selectedPost} />
               </div>
            </div>
         )}

         <div ref={mapContainer} className="w-full h-screen relative">
            <form onSubmit={handleSearch} className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-sm min-w-[200px]">
               <div className="relative">
                  <input
                     type="text"
                     className="w-full bg-white placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md pl-3 pr-28 py-2 shadow-sm focus:outline-none focus:border-slate-400 hover:border-slate-300"
                     placeholder="Search City..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="absolute top-1 right-1 flex items-center rounded bg-slate-800 py-1 px-2.5 text-sm text-white hover:bg-slate-700">
                     Search
                  </button>
               </div>
            </form>

            <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
               <button onClick={zoomIn} className="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-500 text-white shadow hover:bg-blue-400">
                  +
               </button>
               <button onClick={zoomOut} className="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-500 text-white shadow hover:bg-blue-400">
                  -
               </button>
            </div>

            {user?.latitude && user?.longitude && (
               <button onClick={flyToUserLocation} className="absolute bottom-20 right-4 z-10 bg-blue-500 text-white p-2 rounded-full shadow hover:bg-blue-600" title="Center on my location">
                  Center
               </button>
            )}
         </div>
      </>
   );
};

export default Globe;
