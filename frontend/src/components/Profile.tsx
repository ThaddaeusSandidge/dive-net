// components/Profile.tsx
"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar"; // Import Sidebar component

export default function Profile() {
   // State to track active tab, defaulting to 'activities'
   const [activeTab, setActiveTab] = useState("activities");

   return (
      <div className="flex h-screen">
         {/* Sidebar */}
         <Sidebar />

         {/* Profile Dashboard */}
         <div className="flex-1 p-10">
            <h1 className="text-3xl font-bold mb-6">Profile Dashboard</h1>

            <div className="flex items-center mb-8">
               {/* Profile Picture */}
               <div className="w-24 h-24 rounded-full bg-gray-300 flex justify-center items-center text-white text-3xl mr-6">DM</div>
               <div>
                  <h2 className="text-2xl font-semibold mb-1">Danny Mendoza</h2>
                  <p className="text-lg text-gray-500">@danny.m_11</p>
               </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-8 mb-6">
               {/* Activities Tab */}
               <div onClick={() => setActiveTab("activities")} className={`cursor-pointer text-xl font-semibold py-3 text-gray-600 ${activeTab === "activities" ? "border-b-2 border-blue-500" : ""} hover:text-blue-500`}>
                  Activities
               </div>
               {/* Account Details Tab */}
               <div onClick={() => setActiveTab("account")} className={`cursor-pointer text-xl font-semibold py-3 text-gray-600 ${activeTab === "account" ? "border-b-2 border-blue-500" : ""} hover:text-blue-500`}>
                  Account Details
               </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
               {activeTab === "activities" ? (
                  <p className="text-lg">Activities content goes here...</p>
               ) : (
                  <>
                     <p className="text-lg">Email: dmendoza92981@gmail.com</p>
                     <p className="text-lg">Age: 21</p>
                     {/* Edit Profile button only visible on Account Details tab */}
                     <button className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600">Edit Profile</button>
                  </>
               )}
            </div>
         </div>
      </div>
   );
}
