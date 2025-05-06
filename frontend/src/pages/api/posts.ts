import { axiosWithAuth } from "@/context/AuthContext";
import { PostFilter } from "@/types/types";

// Fetch posts with optional filters
export async function getPosts(token: string, filters: { user_id?: number }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  const res = await fetch(`${apiUrl}/api/go/posts/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(filters),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch posts");
  }

  const data = await res.json();
  return data;
}
