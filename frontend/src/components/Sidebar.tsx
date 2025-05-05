import { useState, useEffect } from "react";
import { FaSearch, FaHome, FaGlobe, FaPlus, FaCog, FaBars, FaTimes, FaSignOutAlt } from "react-icons/fa";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { useRouter } from "next/router";

export default function Sidebar() {
   const [isOpen, setIsOpen] = useState(false);
   const { userId, user } = useAuth();
   const [avatarKey, setAvatarKey] = useState(Date.now()); // Unique key for avatar updates

   const menuItems = [
      { href: "/", icon: <FaHome className="text-xl" />, label: "Feed" },
      { href: "/searchuser", icon: <FaSearch className="text-xl" />, label: "Search Users" },
      { href: "/globe", icon: <FaGlobe className="text-xl" />, label: "Globe" },
      { href: "/post", icon: <FaPlus className="text-xl" />, label: "Post" },
   ];

   const toggleSidebar = () => setIsOpen(!isOpen);
   const closeSidebar = () => setIsOpen(false);

   useEffect(() => {
      setAvatarKey(Date.now()); // Update the key when user avatar changes
   }, [user?.avatar]);

   const handleLogout = () => {
      localStorage.removeItem("token");
      window.location.reload(); // Refresh to apply logout state
   };

   return (
      <>
         {/* Desktop Sidebar */}
         <div className={`hidden md:flex fixed top-0 left-0 h-full bg-gray-900 text-white transition-all duration-300 z-40 flex flex-col ${isOpen ? "w-40" : "w-24"}`}>
            <ul className="mt-8 space-y-4 w-full">
               <li>
                  <button className="flex flex-col items-center w-full px-4 py-2 hover:bg-gray-700 rounded-md transition-all duration-200" onClick={() => setIsOpen(!isOpen)}>
                     <div className="text-2xl">{isOpen ? <FaTimes /> : <FaBars />}</div>
                     {isOpen && <span className="text-sm mt-1">Menu</span>}
                  </button>
               </li>

               {[
                  { href: "/", icon: <FaHome className="text-2xl" />, label: "Feed" },
                  { href: "/searchuser", icon: <FaSearch className="text-2xl" />, label: "Search Users" },
                  { href: "/globe", icon: <FaGlobe className="text-2xl" />, label: "Globe" },
                  { href: "/post", icon: <FaPlus className="text-2xl" />, label: "Post" },
               ].map(({ href, icon, label }, index) => (
                  <li key={index}>
                     <Link href={href} className="flex flex-col items-center w-full px-4 py-2 hover:bg-gray-700 rounded-md transition-all duration-200">
                        <div>{icon}</div>
                        {isOpen && <span className="text-sm mt-1">{label}</span>}
                     </Link>
                  </li>
               ))}
            </ul>

            {/* Settings and Logout at Bottom */}
            <div className="mt-auto mb-4">
               <ul className="space-y-4 w-full">
                  <li>
                     <Link href={`/profile/${userId}`} className="flex flex-col items-center w-full px-4 py-2 hover:bg-gray-700 rounded-md transition-all duration-200">
                        <div className="w-14 h-14 rounded-full border-2 border-blue-400 overflow-hidden bg-gray-500 text-white text-sm font-bold flex justify-center items-center">
                           {user?.avatar ? <img src={`${user.avatar}?key=${avatarKey}`} alt={user?.first_name} className="w-full h-full object-cover" /> : <span>P</span>}
                        </div>
                        {isOpen && <span className="text-sm mt-1">Profile</span>}
                     </Link>
                  </li>

                  <li>
                     <button className="flex flex-col items-center w-full px-4 py-2 hover:bg-gray-700 rounded-md transition-all duration-200" onClick={handleLogout}>
                        <div className="w-8 h-8 flex justify-center items-center">
                           <FaSignOutAlt className="text-2xl" />
                        </div>
                        {isOpen && <span className="text-sm mt-1">Logout</span>}
                     </button>
                  </li>
               </ul>
            </div>
         </div>

         {/* Mobile Sidebar */}
         <div className="md:hidden">
            <button className="fixed top-4 left-4 p-3 bg-gray-900 text-white rounded-full shadow-lg z-50" onClick={toggleSidebar}>
               {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>

            <div className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white transition-transform duration-300 z-40 flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
               <ul className="mt-16 space-y-4 px-4">
                  {menuItems.map(({ href, icon, label }, index) => (
                     <li key={index}>
                        <Link href={href} onClick={closeSidebar} className="flex items-center px-4 py-2 hover:bg-gray-700 rounded-md transition-all duration-200">
                           <div className="w-8 min-w-8 flex justify-center">{icon}</div>
                           <span className="ml-3 text-lg">{label}</span>
                        </Link>
                     </li>
                  ))}
               </ul>

               <div className="mt-auto mb-4 px-4">
                  <ul className="space-y-4">
                     <li>
                        <Link href={`/profile/${userId}`} onClick={closeSidebar} className="flex items-center px-4 py-2 hover:bg-gray-700 rounded-md transition-all duration-200">
                           <div className="w-8 h-8 min-w-8 min-h-8 rounded-full bg-gray-500 flex justify-center items-center text-xs">P</div>
                           <span className="ml-3 text-lg">Profile</span>
                        </Link>
                     </li>
                     <li>
                        <button className="flex items-center w-full px-4 py-2 hover:bg-gray-700 rounded-md transition-all duration-200" onClick={handleLogout}>
                           <div className="w-8 min-w-8 flex justify-center">
                              <FaSignOutAlt className="text-xl" />
                           </div>
                           <span className="ml-3 text-lg">Logout</span>
                        </button>
                     </li>
                  </ul>
               </div>
            </div>
         </div>
      </>
   );
}
