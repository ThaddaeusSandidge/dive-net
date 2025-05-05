"use client";

import React, { useEffect, useState } from "react";
import { FaEnvelope, FaMapMarkerAlt, FaUserEdit, FaCalendarAlt } from "react-icons/fa";
import PostCard from "@/components/PostCard";
import { Post, User } from "@/types/types";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { getPosts } from "@/pages/api/posts";
import { getUser } from "@/pages/api/users";
import axios from "axios";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const ProfilePage: React.FC = () => {
   const params = useParams();
   const { userId: loggedInUserId, token } = useAuth();

   const idParam = params?.id;
   const profileUserId = Array.isArray(idParam) ? idParam[0] : idParam ?? loggedInUserId;

   const [user, setUser] = useState<User | null>(null);
   const [posts, setPosts] = useState<Post[]>([]);
   const [loading, setLoading] = useState<boolean>(true);
   const [editMode, setEditMode] = useState(false);
   const [avatarFile, setAvatarFile] = useState<File | null>(null);
   const [preview, setPreview] = useState<string | null>(null);

   const [updatedInfo, setUpdatedInfo] = useState<{
      email: string;
      age: string;
      avatar: string;
   }>({
      email: "",
      age: "",
      avatar: "",
   });

   useEffect(() => {
      if (avatarFile) {
         const objectUrl = URL.createObjectURL(avatarFile);
         setPreview(objectUrl);
         return () => URL.revokeObjectURL(objectUrl);
      }
   }, [avatarFile]);

   useEffect(() => {
      if (!profileUserId || !token) return;

      const fetchUserData = async () => {
         try {
            const userData = await getUser(token, profileUserId.toString());
            setUser(userData);
            setUpdatedInfo({
               email: userData.email,
               age: userData.age?.toString() || "",
               avatar: userData.avatar || "",
            });

            const userNumericId = parseInt(profileUserId.toString());
            const postData = await getPosts(token, { user_id: userNumericId });

            const safePosts = postData.map((post: any) => ({
               ...post,
               comments: Array.isArray(post.comments) ? post.comments : [],
            }));

            setPosts(safePosts);
         } catch (error) {
            console.error("Failed to load user data or posts", error);
         } finally {
            setLoading(false);
         }
      };

      fetchUserData();
   }, [profileUserId, token]);

   const handleSave = async () => {
      if (!token || !profileUserId || !user) return;

      let avatarUrl = user.avatar;

      try {
         if (avatarFile) {
            const formData = new FormData();
            formData.append("avatar", avatarFile);

            const uploadRes = await axios.post(`${apiUrl}/api/go/users/avatar`, formData, {
               headers: {
                  "Content-Type": "multipart/form-data",
                  Authorization: `Bearer ${token}`,
               },
            });

            avatarUrl = uploadRes.data.avatar;
         }

         const payload = {
            email: updatedInfo.email,
            age: parseInt(updatedInfo.age, 10),
            avatar: avatarUrl,
            first_name: user.first_name,
            last_name: user.last_name,
            latitude: user.latitude,
            longitude: user.longitude,
            bio: user.bio || "",
         };

         await axios.put(`${apiUrl}/api/go/users/${profileUserId}`, payload, {
            headers: {
               Authorization: `Bearer ${token}`,
            },
         });

         setUser((prev) =>
            prev
               ? {
                    ...prev,
                    email: updatedInfo.email,
                    age: parseInt(updatedInfo.age, 10),
                    avatar: avatarUrl,
                 }
               : null
         );

         setEditMode(false);
         setAvatarFile(null);
         setPreview(null);
      } catch (error: any) {
         console.error("Failed to update user profile:", error.response?.data || error.message);
         alert("Failed to update profile. Please try again.");
      }
   };

   if (loading) return <p className="text-center mt-10 text-gray-500">Loading profile...</p>;
   if (!user) return <p className="text-center mt-10 text-gray-500">User not found.</p>;

   return (
      <div className="max-w-3xl mx-auto my-10 p-6 bg-white shadow-lg rounded-2xl">
         {/* Profile Header */}
         <div className="relative flex flex-col items-center pb-6 border-b">
            <div className="relative">
               <img src={preview || user.avatar || "/default-avatar.png"} alt={user.first_name} className="w-32 h-32 rounded-full border-4 border-blue-400 shadow-md object-cover" />
               {editMode && (
                  <input
                     type="file"
                     accept="image/*"
                     onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                     className="mt-2 block text-sm text-gray-600 file:mr-4 file:py-1 file:px-3 file:border-0 file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
                  />
               )}
            </div>

            <h1 className="text-2xl font-bold mt-4">{`${user.first_name} ${user.last_name}`}</h1>
            <p className="text-gray-500 text-sm">{user.bio}</p>

            {String(loggedInUserId) === String(profileUserId) && (
               <button onClick={() => setEditMode(!editMode)} className="absolute top-0 right-4 text-gray-600 hover:text-gray-900 transition" title="Edit Profile">
                  <FaUserEdit className="text-2xl" />
               </button>
            )}
         </div>

         {/* User Details */}
         <div className="mt-6 space-y-4 text-gray-700">
            <div className="flex items-center gap-2">
               <FaEnvelope className="text-blue-500" />
               {editMode ? (
                  <input
                     type="email"
                     value={updatedInfo.email}
                     onChange={(e) => setUpdatedInfo({ ...updatedInfo, email: e.target.value })}
                     className="border border-gray-300 rounded px-2 py-1 text-sm w-full max-w-xs bg-gray-50 focus:outline-none focus:ring focus:ring-blue-200"
                  />
               ) : (
                  <span>{user.email}</span>
               )}
            </div>

            <div className="flex items-center gap-2">
               <FaCalendarAlt className="text-green-500" />
               {editMode ? (
                  <input
                     type="number"
                     value={updatedInfo.age}
                     onChange={(e) => setUpdatedInfo({ ...updatedInfo, age: e.target.value })}
                     className="border border-gray-300 rounded px-2 py-1 text-sm w-20 bg-gray-50 focus:outline-none focus:ring focus:ring-green-200"
                  />
               ) : (
                  <span>{user.age} years old</span>
               )}
            </div>

            <div className="flex items-center gap-2">
               <FaMapMarkerAlt className="text-red-500" />
               <span>
                  {user.latitude}, {user.longitude}
               </span>
            </div>
         </div>

         {/* Save/Cancel Buttons */}
         {editMode && (
            <div className="mt-6 flex justify-center gap-4">
               <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 shadow-sm">
                  Save Changes
               </button>
               <button
                  onClick={() => {
                     setEditMode(false);
                     setAvatarFile(null);
                     setPreview(null);
                     setUpdatedInfo({
                        email: user.email,
                        age: user.age.toString(),
                        avatar: user.avatar || "",
                     });
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 shadow-sm"
               >
                  Cancel
               </button>
            </div>
         )}

         {/* User Posts */}
         <h2 className="mt-10 text-xl font-semibold border-b pb-2">Recent Posts</h2>
         <div className="mt-4 space-y-6">{posts.length > 0 ? posts.map((post) => <PostCard key={post.id} post={post} />) : <p className="text-gray-500 text-center">No posts yet.</p>}</div>
      </div>
   );
};

export default ProfilePage;
