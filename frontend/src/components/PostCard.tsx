import { useState } from "react";
import {
  FaHeart,
  FaRegHeart,
  FaComment,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaEye,
  FaChevronDown,
  FaChevronUp,
  FaEllipsisV,
  FaTrash,
  FaWater,
} from "react-icons/fa";
import { Post } from "../types/types";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useMap } from "@/context/MapContext";
import { useRouter } from "next/router";

const PostCard: React.FC<{ post: Post }> = ({ post }) => {
  const { token, userId } = useAuth();
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const [likes, setLikes] = useState(post.likes);
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState(post.comments || []);
  const [hasLiked, setHasLiked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { setTargetLocation } = useMap();
  const router = useRouter();

  const toggleComments = () => setIsCommentsVisible(!isCommentsVisible);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  const handleFlyToCoordinates = async (lat: number, lng: number) => {
    await setTargetLocation({ latitude: lat, longitude: lng });
    router.push("/globe"); // navigate to globe
  };

  const handleLike = async () => {
    if (!token) return;

    const method = hasLiked ? "DELETE" : "POST";

    const res = await fetch(`${apiUrl}/api/go/posts/${post.id}/likes`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      setHasLiked(!hasLiked);
      setLikes((prev) => (hasLiked ? prev - 1 : prev + 1));
    } else {
      console.error("Failed to toggle like");
    }
  };

  const handlePostComment = async () => {
    if (!token || !commentInput.trim()) return;

    const res = await fetch(`${apiUrl}/api/go/posts/${post.id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ post_id: post.id, content: commentInput }),
    });

    if (res.ok) {
      const newComment = await res.json();
      const userInfoRes = await fetch(`${apiUrl}/api/go/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userInfo = await userInfoRes.json();

      setComments((prev) => [
        ...prev,
        {
          ...newComment,
          user_name: `${userInfo.first_name} ${userInfo.last_name}`,
          user_avatar: userInfo.avatar,
        },
      ]);
      setCommentInput("");
    } else {
      console.error("Failed to post comment");
    }
  };

  const handleDelete = async () => {
    if (!token) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this post?"
    );
    if (!confirmed) return;

    const res = await fetch(`${apiUrl}/api/go/posts/${post.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      window.location.reload(); // or filter it out in a parent list if available
    } else {
      console.error("Failed to delete post");
    }
  };

  // Inside PostCard.tsx, replace your return (
  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 mb-6 max-w-2xl mx-auto transition hover:shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center space-x-4">
          <img
            src={post.user_avatar || "/default-avatar.png"}
            alt={post.user_name}
            className="w-12 h-12 rounded-full object-cover border-2 border-blue-400"
          />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {post.title}
            </h2>
            <p className="text-gray-600 text-sm flex items-center">
              <FaCalendarAlt className="mr-2 text-blue-500" />
              {new Date(post.date).toLocaleDateString()} –{" "}
              <Link
                href={`/profile/${post.user_id}`}
                className="text-blue-500 ml-1"
              >
                {post.user_name}
              </Link>
            </p>
          </div>
        </div>

        {String(userId) === String(post.user_id) && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaEllipsisV />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded shadow-md z-10">
                <button
                  onClick={handleDelete}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  <FaTrash className="mr-2" />
                  Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Details */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
        {/* Left Column */}
        <div className="space-y-2">
          <div className="flex items-center">
            <FaEye className="mr-2 text-green-500" />
            <span>
              Visibility:{" "}
              <span className="font-semibold">{post.visibility} ft</span>
            </span>
          </div>
          <div className="flex items-center">
            <FaWater className="mr-2 text-blue-400" />
            <span>
              Depth: <span className="font-semibold">{post.depth} m</span>
            </span>
          </div>
          <div className="flex items-center">
            <FaMapMarkerAlt className="mr-2 text-red-500" />
            <button
              onClick={() =>
                handleFlyToCoordinates(post.latitude, post.longitude)
              }
              className="text-blue-500 hover:underline"
            >
              {post.latitude.toFixed(4)}, {post.longitude.toFixed(4)}
            </button>
          </div>
          <p>
            <span className="font-medium">Activity:</span> {post.activity}
          </p>
        </div>

        {/* Right Column (Image) */}
        {post.images?.length > 0 && (
          <img
            src={post.images[0]}
            alt="Post Image"
            className="w-full h-48 object-cover rounded-lg shadow-sm"
          />
        )}
      </div>

      {/* Caption */}
      <div className="mt-6 bg-gray-100 p-4 rounded-md">
        <h3 className="font-semibold text-gray-800 mb-2">Caption:</h3>
        <p className="text-gray-700">{post.description}</p>
      </div>

      {/* Likes + Comments */}
      <div className="flex items-center justify-between mt-6 border-t pt-4">
        <button
          onClick={handleLike}
          className="flex items-center text-red-500 hover:text-red-600 font-semibold transition"
        >
          {hasLiked ? (
            <FaHeart className="mr-2" />
          ) : (
            <FaRegHeart className="mr-2" />
          )}
          {likes} Likes
        </button>

        <button
          onClick={toggleComments}
          className="flex items-center text-blue-600 hover:text-blue-800 font-semibold transition"
        >
          <FaComment className="mr-2" />
          {isCommentsVisible ? "Hide" : "Show"} Comments ({comments.length})
          {isCommentsVisible ? (
            <FaChevronUp className="ml-2" />
          ) : (
            <FaChevronDown className="ml-2" />
          )}
        </button>
      </div>

      {/* Comments Section */}
      {isCommentsVisible && (
        <div className="mt-4 bg-gray-50 p-4 rounded-lg shadow-inner">
          {/* Comments List */}
          {comments.length > 0 ? (
            <ul className="space-y-3">
              {comments.map((comment, index) => (
                <li
                  key={index}
                  className="border-b pb-2 flex items-start space-x-3"
                >
                  <img
                    src={comment.user_avatar || "/default-avatar.png"}
                    alt={comment.user_name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-blue-400"
                  />
                  <div>
                    <Link
                      href={`/profile/${comment.user_id}`}
                      className="text-blue-500 font-medium hover:underline"
                    >
                      {comment.user_name}
                    </Link>
                    <p className="text-gray-700">{comment.content}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(comment.timestamp).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No comments yet.</p>
          )}

          {/* Comment Input */}
          <div className="mt-4 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Write a comment..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              className="flex-1 p-2 border rounded-lg"
            />
            <button
              onClick={handlePostComment}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
