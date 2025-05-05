import React, { useState } from "react";
import { FiFilter, FiCalendar, FiGlobe } from "react-icons/fi";

const Filter: React.FC = () => {
   const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
   const [dateRange, setDateRange] = useState<"week" | "custom">("week");
   const [startDate, setStartDate] = useState<string>("");
   const [endDate, setEndDate] = useState<string>("");
   const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

   const activities = ["Spear Fishing", "Snorkeling", "Scuba Diving", "Fishing", "Lobster Hunting"];

   const handleActivityToggle = (activity: string) => {
      setSelectedActivities((prev) => (prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]));
   };

   const handleDateRangeChange = (range: "week" | "custom") => {
      setDateRange(range);
      if (range === "week") {
         const today = new Date();
         const weekAgo = new Date();
         weekAgo.setDate(today.getDate() - 7);
         setStartDate(formatDate(weekAgo));
         setEndDate(formatDate(today));
      }
   };

   const formatDate = (date: Date): string => {
      return date.toISOString().split("T")[0];
   };

   const resetFilters = () => {
      setDateRange("week");
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      setStartDate(formatDate(weekAgo));
      setEndDate(formatDate(today));
      setSelectedActivities([]);
   };

   return (
      <div className="absolute top-4 right-4 w-80 z-50">
         <button onClick={() => setIsFilterMenuVisible(!isFilterMenuVisible)} className="w-full flex items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-400 transition-colors">
            <FiFilter className="mr-2" /> Filter Globe Data
         </button>

         {isFilterMenuVisible && (
            <div className="bg-gray-800 rounded-xl p-5 shadow-xl border border-gray-700 mt-2">
               <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <FiGlobe className="mr-2" /> Data Filters
               </h2>

               {/* Date Range Selection */}
               <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
                     <FiCalendar className="mr-1" /> Time Range
                  </label>
                  <div className="flex space-x-2 mb-3">
                     <button onClick={() => handleDateRangeChange("week")} className={`flex-1 py-2 rounded-md text-sm ${dateRange === "week" ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-300"}`}>
                        Last Week
                     </button>
                     <button onClick={() => handleDateRangeChange("custom")} className={`flex-1 py-2 rounded-md text-sm ${dateRange === "custom" ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-300"}`}>
                        Custom
                     </button>
                  </div>

                  {dateRange === "custom" && (
                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-xs text-gray-400 mb-1">Start</label>
                           <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded bg-gray-700 border-gray-600 text-white text-sm p-2" />
                        </div>
                        <div>
                           <label className="block text-xs text-gray-400 mb-1">End</label>
                           <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded bg-gray-700 border-gray-600 text-white text-sm p-2" />
                        </div>
                     </div>
                  )}
               </div>

               {/* Activity Selection */}
               <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-3">Display Events</label>
                  <div className="space-y-2">
                     {activities.map((activity) => (
                        <label key={activity} className="flex items-center space-x-2 cursor-pointer">
                           <input type="checkbox" checked={selectedActivities.includes(activity)} onChange={() => handleActivityToggle(activity)} className="rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-700" />
                           <span className="text-sm text-gray-300">{activity}</span>
                        </label>
                     ))}
                  </div>
               </div>

               {/* Action Buttons */}
               <div className="flex space-x-3">
                  <button onClick={resetFilters} className="flex-1 py-2 bg-gray-700 text-gray-300 rounded-md text-sm hover:bg-gray-600 transition-colors">
                     Reset
                  </button>
                  <button onClick={() => setIsFilterMenuVisible(false)} className="flex-1 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-500 transition-colors">
                     Apply
                  </button>
               </div>
            </div>
         )}
      </div>
   );
};

export default Filter;
