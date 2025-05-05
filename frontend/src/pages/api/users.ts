import { axiosWithAuth } from "@/context/AuthContext";

// Fetch a user by ID
export const getUser = async (token: string | null, userId: string) => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const axiosInstance = axiosWithAuth(token);
    const response = await axiosInstance.get(
      `${apiUrl}/api/go/users/${userId}`
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching user:", error);
    throw error;
  }
};

export const searchUsers = async (token: string | null, query: string) => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    const axiosInstance = axiosWithAuth(token);
    
    const response = await axiosInstance.get<{ users: any[] }>(
      `${apiUrl}/api/go/users/search`,
      {
        params: { search: query },
        timeout: 5000
      }
    );
    
    return response.data.users || [];
  } catch (error: any) {
    console.error("Error searching users:", error);
    throw error;
  }
};