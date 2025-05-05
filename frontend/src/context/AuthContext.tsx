import axios from "axios";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/router";
import { User } from "@/types/types";
import { jwtDecode } from "jwt-decode"; // Correct import for jwt-decode

interface AuthProviderProps {
   children: React.ReactNode;
}

interface AuthContextType {
   token: string | null;
   setToken: React.Dispatch<React.SetStateAction<string | null>>;
   isLoggedIn: boolean;
   loading: boolean;
   user: User | null;
   userId: string | null; // Add userId to the context
   fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
   const [token, setToken] = useState<string | null>(typeof window !== "undefined" ? localStorage.getItem("token") : null);
   const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
   const [loading, setLoading] = useState<boolean>(true);
   const [user, setUser] = useState<User | null>(null);
   const [userId, setUserId] = useState<string | null>(null); // State for user ID
   const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
   const router = useRouter();

   useEffect(() => {
      if (token) {
         localStorage.setItem("token", token);
         setIsLoggedIn(true);

         // Decode the token to extract the user ID
         try {
            const decoded: any = jwtDecode(token);
            console.log("Decoded token:", decoded);
            setUserId(decoded.user_id); // Set the user ID in state
         } catch (err) {
            console.error("Error decoding token:", err);
            setUserId(null);
         }
      } else {
         localStorage.removeItem("token");
         setIsLoggedIn(false);
         setUserId(null); // Clear the user ID if no token
      }
   }, [token]);

   useEffect(() => {
      const verifyToken = async () => {
         if (router.pathname === "/sign-up" || router.pathname === "/login") {
            setLoading(false);
            return;
         }

         if (token) {
            try {
               const response = await axios.post(`${apiUrl}/verify-token`, {}, { headers: { Authorization: `Bearer ${token}` } });
               if (!response.data.valid) throw new Error("Token invalid");

               setIsLoggedIn(true);
               await fetchUser(); // Fetch user data on successful token verification
            } catch (err) {
               console.error("Token invalid:", err);
               setToken(null);
               setIsLoggedIn(false);
               router.push("/login");
            }
         } else {
            setIsLoggedIn(false);
            router.push("/login");
         }
         setLoading(false);
      };

      verifyToken();
   }, [token, apiUrl, router.pathname]);

   const fetchUser = async () => {
      if (!token || !userId) return; // Ensure token and userId are available

      try {
         const response = await axios.get(`${apiUrl}/api/go/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
         });
         setUser(response.data);
         console.log("Fetched user:", response.data);
      } catch (error) {
         console.error("Error fetching user:", error);
         setUser(null);
      }
   };

   if (loading) {
      return (
         <div className="flex items-center justify-center h-screen">
            <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
         </div>
      );
   }

   return <AuthContext.Provider value={{ token, setToken, isLoggedIn, loading, user, userId, fetchUser }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
   const context = useContext(AuthContext);
   if (!context) {
      throw new Error("useAuth must be used within an AuthProvider");
   }
   return context;
};

// Helper function to include token in headers
export const axiosWithAuth = (token: string | null) => {
   return axios.create({
      headers: {
         Authorization: `Bearer ${token}`,
         "Content-Type": "application/json",
      },
   });
};
