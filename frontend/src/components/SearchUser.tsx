// src/components/SearchUser.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { searchUsers } from "@/pages/api/users";
import { useRouter } from "next/router"; // Add this import

interface User {
   id: number;
   first_name: string;
   last_name: string;
   email: string;
   avatar?: string;
}

const SearchUser = () => {
   const { token } = useAuth();
   const router = useRouter(); // Initialize the router
   const [query, setQuery] = useState("");
   const [users, setUsers] = useState<User[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (query.trim() === "") {
         setUsers([]);
         return;
      }

      const fetchUsers = async () => {
         setLoading(true);
         setError(null);
         try {
            const results = await searchUsers(token, query);
            setUsers(results);
         } catch (error: any) {
            console.error("Search error:", error);
            setError(error.response?.data?.message || "Failed to search users");
            setUsers([]);
         } finally {
            setLoading(false);
         }
      };

      const debounceTimer = setTimeout(fetchUsers, 300);
      return () => clearTimeout(debounceTimer);
   }, [query, token]);

   // Function to handle profile clicks
   const handleProfileClick = (userId: number) => {
      router.push(`/profile/${userId}`);
   };

   return (
      <div className="pt-8 pl-24 min-h-screen bg-grey-500">
         <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Search Users</h1>

            <div className="relative w-full max-w-xl mx-auto">
               {/* Search Input */}
               <div className="relative">
                  <input
                     type="text"
                     placeholder="Search users by name..."
                     value={query}
                     onChange={(e) => setQuery(e.target.value)}
                     className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 shadow-md text-gray-700"
                  />
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M16.65 10.35a6.3 6.3 0 11-12.6 0 6.3 6.3 0 0112.6 0z" />
                  </svg>
               </div>

               {/* Search Results */}
               {query.trim() !== "" && (
                  <div className="absolute mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-10 max-h-96 overflow-y-auto">
                     {loading && (
                        <div className="p-6 text-center text-gray-500">
                           <p>Searching users...</p>
                        </div>
                     )}

                     {error && (
                        <div className="p-6 text-center text-red-500">
                           <p>{error}</p>
                        </div>
                     )}

                     {!loading && !error && users.length === 0 && (
                        <div className="p-6 text-center text-gray-500">
                           <p>No users found for &quot;{query}&quot;</p>
                        </div>
                     )}

                     {!loading && !error && users.length > 0 && (
                        <ul>
                           {users.map((user) => (
                              <li key={user.id} onClick={() => handleProfileClick(user.id)} className="flex items-center p-4 hover:bg-gray-100 transition-colors cursor-pointer border-b border-gray-100 last:border-none">
                                 <img
                                    src={user.avatar || "/default-avatar.png"}
                                    alt={`${user.first_name} ${user.last_name}`}
                                    className="w-12 h-12 rounded-full mr-4 object-cover"
                                    onError={(e) => {
                                       (e.target as HTMLImageElement).src = "/default-avatar.png";
                                    }}
                                 />
                                 <div>
                                    <p className="font-semibold text-gray-800">
                                       {user.first_name} {user.last_name}
                                    </p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                 </div>
                              </li>
                           ))}
                        </ul>
                     )}
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};

export default SearchUser;
