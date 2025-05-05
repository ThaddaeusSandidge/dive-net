import React, { useEffect, useState } from "react";
import Globe from "@/components/Globe";
import Filter from "@/components/Filter";
import LoadPreferencesModal from "@/components/LoadPreferencesModal";
import type { FilterValues } from "@/types/filters";
import { useAuth } from "@/context/AuthContext";
import { getPosts } from "@/pages/api/posts";
import { Post, PostFilter } from "@/types/types";

const Home: React.FC = () => {
   const [posts, setPosts] = useState<Post[]>([]);
   const { token } = useAuth();
   const [filters, setFilters] = useState<PostFilter>({});
   const [isModalOpen, setIsModalOpen] = useState(false);

   useEffect(() => {
      if (!token) return;

      getPosts(token, filters)
         .then((data) => {
            if (Array.isArray(data)) {
               const sanitizedData = data.map((post) => ({
                  ...post,
                  images: post.images || [], // Default images to an empty array if null
               }));
               console.log("Fetched posts:", sanitizedData);
               setPosts(sanitizedData);
            } else {
               console.error("Unexpected data format:", data);
               setPosts([]); // Default to an empty array if data is invalid
            }
         })
         .catch((error) => {
            console.error("Error fetching posts:", error);
            setPosts([]); // Default to an empty array on error
         });
   }, [token, filters]);

   const handleLoadPreference = (loadedFilters: Partial<FilterValues>) => {
      console.log("Loaded preference received:", loadedFilters);

      setFilters((prevFilters) => ({
         ...prevFilters,
         ...Object.fromEntries(Object.entries(loadedFilters).filter(([_, value]) => value !== undefined)),
      }));
      setIsModalOpen(false);
   };

   return (
      <main className="relative flex flex-wrap justify-center items-start min-h-screen bg-gray-100">
         <div className="w-full h-screen relative">
            <Globe posts={posts} />
            <Filter />
            {isModalOpen && <LoadPreferencesModal onClose={() => setIsModalOpen(false)} onLoadPreference={handleLoadPreference} />}
         </div>
      </main>
   );
};

export default Home;
