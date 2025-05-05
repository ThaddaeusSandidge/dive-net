import Sidebar from "./Sidebar";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Layout({ children }: { children: React.ReactNode }) {
   const { isLoggedIn } = useAuth();

   if (!isLoggedIn) {
      return (
         <div className="flex min-h-screen">
            {/* Sidebar - Make sure it's correctly positioned */}

            {/* Content Area */}
            <div className="flex-1">{children}</div>
         </div>
      );
   }

   return (
      <div className="flex min-h-screen">
         <Sidebar />
         {/* Content Area */}
         <div className="flex-1 md:pl-6 lg:pl-16">{children}</div>
      </div>
   );
}
