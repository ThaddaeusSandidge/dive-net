"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import PostCard from "@/components/PostCard";

type Comment = {
  id: number;
  post_id: number;
  user_id: number;
  user_name: string;
  user_avatar: string;
  content: string;
  timestamp: string;
};

type Post = {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar: string;
  title: string;
  date: string;
  latitude: number;
  longitude: number;
  depth: number;
  visibility: number;
  activity: string;
  description: string;
  images: string[];
  timestamp: string;
  rating: number;
  likes: number;
  comments: Comment[]; //this was missing
};

const Feed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const { token } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  useEffect(() => {
    if (!token) return;

    const fetchPosts = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/go/posts/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}), // you can add filters later
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Failed to fetch posts:", errorText);
          return;
        }

        const data = await res.json();
        console.log("Fetched posts:", data);
        setPosts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching posts:", err);
      }
    };

    fetchPosts();
  }, [token]);

  return (
    <div className="pt-8 pl-24">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Dive Feed</h1>

        {posts.length > 0 ? (
          [...posts]
            .reverse()
            .map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <p className="text-gray-500">No posts found.</p>
        )}
      </div>
    </div>
  );
};

export default Feed;
