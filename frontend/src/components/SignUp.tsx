import React, { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";
import GlobeComponent from "./GlobeComponent";

const SignUp: React.FC = () => {
   const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
   const signUpUrl = `${apiUrl}/sign-up`;
   const uploadAvatarUrl = `${apiUrl}/api/go/users/avatar`; // Avatar upload

   const [firstName, setFirstName] = useState("");
   const [lastName, setLastName] = useState("");
   const [email, setEmail] = useState("");
   const [age, setAge] = useState(18);
   const [password, setPassword] = useState("");
   const [passwordMatch, setPasswordMatch] = useState("");
   const [error, setError] = useState("");
   const [loading, setLoading] = useState(false);
   const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
   const [avatar, setAvatar] = useState<File | null>(null);
   const [preview, setPreview] = useState<string | null>(null);

   const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

   useEffect(() => {
      if (avatar) {
         const objectUrl = URL.createObjectURL(avatar);
         setPreview(objectUrl);
         return () => URL.revokeObjectURL(objectUrl);
      }
   }, [avatar]);

   const handleSignUp = async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!email || !firstName || !lastName || !pin || !age || !password || !passwordMatch) {
         setError("Please fill out all fields.");
         return;
      }

      if (!validateEmail(email)) {
         setError("Please enter a valid email address.");
         return;
      }

      if (password !== passwordMatch) {
         setError("Passwords do not match.");
         return;
      }

      setLoading(true);

      try {
         // STEP 1: Sign up user
         const payload = {
            email,
            first_name: firstName,
            last_name: lastName,
            latitude: pin?.latitude,
            longitude: pin?.longitude,
            age,
            password,
         };

         const response = await axios.post(`${apiUrl}/sign-up`, payload);
         const { token, userId } = response.data;

         localStorage.setItem("token", token);

         // STEP 2: Upload avatar if selected
         let avatarUrl = null;

         if (avatar) {
            const formData = new FormData();
            formData.append("avatar", avatar);

            const uploadResponse = await axios.post(uploadAvatarUrl, formData, {
               headers: {
                  "Content-Type": "multipart/form-data",
                  Authorization: `Bearer ${token}`,
               },
            });

            avatarUrl = uploadResponse.data.avatar;
         }

         // STEP 3: Update user with avatar URL if needed
         if (avatarUrl) {
            await axios.put(
               `${apiUrl}/users/${userId}`,
               { avatar: avatarUrl },
               {
                  headers: {
                     Authorization: `Bearer ${token}`,
                  },
               }
            );
         }

         // STEP 4: Redirect
         window.location.href = "/";
      } catch (err: any) {
         setError(err.response?.data?.message || "An error occurred. Please try again.");
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="relative h-screen w-full overflow-hidden bg-white">
         <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
            <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,#C9EBFF,transparent)] animated-bg"></div>
         </div>

         <div className="relative z-10 flex min-h-full flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
               <h2 className="text-center text-3xl font-extrabold text-gray-900">Create an Account</h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl">
               <div className="bg-white py-10 px-8 shadow-lg rounded-2xl sm:px-12">
                  {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-6 text-sm font-medium">{error}</div>}

                  <form onSubmit={handleSignUp} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Left Side */}
                     <div className="flex flex-col space-y-6">
                        <div>
                           <label htmlFor="avatar" className="block text-sm font-semibold text-gray-700 mb-2">
                              Upload Profile Picture
                           </label>
                           <input
                              type="file"
                              id="avatar"
                              accept="image/*"
                              onChange={(e) => setAvatar(e.target.files?.[0] || null)}
                              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                           />
                           {preview && <img src={preview} alt="Avatar Preview" className="mt-4 w-24 h-24 rounded-full object-cover border-2 border-gray-300 shadow-md" />}
                        </div>

                        <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" required className="input-style" />
                        <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" required className="input-style" />
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="input-style" />
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="input-style" />
                        <input id="passwordMatch" type="password" value={passwordMatch} onChange={(e) => setPasswordMatch(e.target.value)} placeholder="Confirm Password" required className="input-style" />
                     </div>

                     {/* Right Side */}
                     <div className="flex flex-col space-y-6">
                        <div>
                           <label htmlFor="age" className="block text-sm font-semibold text-gray-700 mb-2">
                              Age
                           </label>
                           <input type="number" id="age" value={age} onChange={(e) => setAge(Number(e.target.value))} required className="input-style" />
                        </div>

                        <div>
                           <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                              Select Your Location
                           </label>
                           <div className="w-full mt-2 h-64 overflow-hidden rounded-lg shadow-md flex items-center justify-center bg-gray-50">
                              <GlobeComponent onPinSelected={setPin} />
                           </div>
                        </div>
                     </div>

                     {/* Submit Button */}
                     <div className="col-span-2 mt-6">
                        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition shadow-md">
                           {loading ? "Creating Account..." : "Sign Up"}
                        </button>
                     </div>
                  </form>

                  {/* Already have an account */}
                  <div className="mt-8 text-center text-gray-600 text-sm">
                     <p>
                        Already have an account?{" "}
                        <Link href="/login" className="text-blue-500 hover:underline font-semibold">
                           Login here
                        </Link>
                     </p>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default SignUp;
