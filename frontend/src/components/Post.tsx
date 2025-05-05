import { useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import GlobeComponent from "@/components/GlobeComponent";
import axios from "axios";
import { useRouter } from "next/router";

export default function Post() {
   const { userId, token } = useAuth();
   const [files, setFiles] = useState<File[]>([]);
   const [imageSrcs, setImageSrcs] = useState<string[]>([]);
   const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
   const router = useRouter(); //used to switch to feed page after post is created

   const [formData, setFormData] = useState({
      title: "",
      date: "",
      depth: "",
      visibility: "",
      activity: "",
      description: "",
   });

   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
   };

   const handleActivityChange = (activity: string) => {
      setFormData((prev) => ({ ...prev, activity }));
   };

   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files;
      if (selectedFiles) {
         const fileArray = Array.from(selectedFiles);
         setFiles(fileArray);

         const imagePreviews: string[] = [];
         fileArray.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
               imagePreviews.push(e.target?.result as string);
               if (imagePreviews.length === fileArray.length) {
                  setImageSrcs(imagePreviews);
               }
            };
            reader.readAsDataURL(file);
         });
      } else {
         setFiles([]);
         setImageSrcs([]);
      }
   };

   const handleImageClick = () => {
      document.getElementById("upload")?.click();
   };

   const handleSubmit = async () => {
      if (!userId || !pin) {
         alert("Please log in and select a location.");
         return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

      // STEP 1: Create Post
      const createPayload = {
         user_id: parseInt(userId),
         title: formData.title,
         date: formData.date,
         latitude: pin.latitude,
         longitude: pin.longitude,
         depth: parseFloat(formData.depth),
         visibility: parseFloat(formData.visibility),
         activity: formData.activity,
         description: formData.description,
         images: [], // Placeholder, updated in step 2
         timestamp: new Date().toISOString(),
         rating: 0,
      };

      try {
         console.log("Submitting post with token:", token);

         const createResponse = await fetch(`${apiUrl}/api/go/posts`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
               Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(createPayload),
         });

         console.log("Create response:", createResponse);

         if (!createResponse.ok) {
            const text = await createResponse.text();
            console.error("Failed to create post - raw response:", text);
            throw new Error("Post creation failed");
         }

         let createdPost;
         try {
            createdPost = await createResponse.json();
            console.log("Parsed createdPost:", createdPost);
         } catch (e) {
            console.error("Failed to parse JSON. Server may have returned an empty response.");
            throw new Error("Invalid JSON in response");
         }

         const postId = createdPost.id;

         // STEP 2: Upload Images
         if (files.length > 0) {
            const formData = new FormData();
            formData.append("post_id", postId.toString());
            files.forEach((file) => {
               formData.append("images", file);
            });

            const uploadRes = await fetch(`${apiUrl}/api/go/posts/images/upload`, {
               method: "POST",
               headers: {
                  Authorization: `Bearer ${token}`,
               },
               body: formData,
            });

            if (!uploadRes.ok) throw new Error("Image upload failed");

            const uploadResult = await uploadRes.json();
            console.log("Images uploaded:", uploadResult.images);
         }

         // Done
         alert("Post created successfully!");
         router.push("/feed"); //go to feed once submitted
      } catch (error) {
         console.error("Error submitting post:", error);
         alert("Something went wrong while creating the post.");
      }
   };

   return (
      <div className="pt-8 pl-24 pr-8 min-h-screen bg-white">
         <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-8 text-center">New Post</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Left Side (Form Details) */}
               <div className="space-y-6">
                  <div>
                     <label className="block text-gray-700 font-medium mb-2">Title</label>
                     <input name="title" value={formData.title} onChange={handleChange} type="text" className="w-full p-3 border rounded-lg shadow-sm" />
                  </div>

                  <div>
                     <label className="block text-gray-700 font-medium mb-2">Date</label>
                     <input name="date" value={formData.date} onChange={handleChange} type="date" className="w-full p-3 border rounded-lg shadow-sm" />
                  </div>

                  <div className="flex space-x-4">
                     <div className="flex-1">
                        <label className="block text-gray-700 font-medium mb-2">
                           Depth <span className="text-gray-400 text-sm">(meters)</span>
                        </label>
                        <input name="depth" value={formData.depth} onChange={handleChange} type="number" placeholder="15" className="w-full p-3 border rounded-lg shadow-sm" />
                     </div>

                     <div className="flex-1">
                        <label className="block text-gray-700 font-medium mb-2">
                           Visibility <span className="text-gray-400 text-sm">(feet)</span>
                        </label>
                        <input name="visibility" value={formData.visibility} onChange={handleChange} type="number" placeholder="30" className="w-full p-3 border rounded-lg shadow-sm" />
                     </div>
                  </div>

                  <div>
                     <label className="block text-gray-700 font-medium mb-2">Activity Type</label>
                     <div className="flex flex-wrap gap-4">
                        {["Spear Fishing", "Snorkeling", "Scuba Diving", "Fishing", "Lobster Hunting"].map((activity, index) => (
                           <div key={index}>
                              <input className="hidden peer" type="radio" id={`activity-${index}`} name="activity" checked={formData.activity === activity} onChange={() => handleActivityChange(activity)} />
                              <label htmlFor={`activity-${index}`} className="px-4 py-2 rounded-lg cursor-pointer bg-blue-400 text-white peer-checked:bg-blue-600 peer-checked:ring-2 peer-checked:ring-blue-500 transition">
                                 {activity}
                              </label>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div>
                     <label className="block text-gray-700 font-medium mb-2">Caption / Description</label>
                     <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full p-3 border rounded-lg shadow-sm"></textarea>
                  </div>
               </div>

               {/* Right Side (Map + Image Upload) */}
               <div className="space-y-8">
                  <div>
                     <label htmlFor="location" className="block text-gray-700 font-medium mb-2">
                        Select Your Location
                     </label>
                     <div className="w-full h-64 overflow-hidden rounded-md shadow-md flex items-center justify-center bg-gray-50">
                        <GlobeComponent onPinSelected={setPin} />
                     </div>
                  </div>

                  <div className="bg-gray-100 p-6 rounded-lg shadow-md text-center cursor-pointer" onClick={handleImageClick}>
                     <input id="upload" type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                     {imageSrcs.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                           {imageSrcs.map((src, index) => (
                              <img key={index} src={src} className="h-32 w-full object-cover rounded-lg" alt={`Image preview ${index + 1}`} />
                           ))}
                        </div>
                     ) : (
                        <div className="text-gray-500">Click here to upload images</div>
                     )}
                  </div>
               </div>
            </div>

            {/* Submit Button */}
            <div className="mt-10 max-w-4xl mx-auto">
               <button onClick={handleSubmit} className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold shadow-md">
                  Submit Post
               </button>
            </div>
         </div>
      </div>
   );
}
