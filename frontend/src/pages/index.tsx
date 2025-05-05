import React, { useState } from "react";
import Feed from "@/components/Feed";
import { useAuth } from "@/context/AuthContext";
import Login from "@/components/Login"; // Import the login component

const Home: React.FC = () => {
   const minDate = new Date("2020-01-01");
   return (
      <main className="relative flex flex-wrap justify-center items-start min-h-screen">
         <div className="w-full relative">
            <Feed />
         </div>
      </main>
   );
};

export default Home;
