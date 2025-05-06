import React, { useState } from "react";

interface AvatarUploadProps {
  userId: string; // Should be a string to match Supabase auth.uid()
  onAvatarUpload: (avatarUrl: string) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  userId,
  onAvatarUpload,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("User is not authenticated.");
      }

      const response = await fetch(`${apiUrl}/api/go/users/avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-User-Id": userId, // Send user ID for file path
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload avatar");
      }

      const data = await response.json();
      if (data.avatar) {
        onAvatarUpload(data.avatar);
      } else {
        throw new Error("Failed to retrieve avatar URL.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      <button type="submit" disabled={loading}>
        {loading ? "Uploading..." : "Upload Avatar"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
};

export default AvatarUpload;
