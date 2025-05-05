import React from "react";
import Link from "next/link";

// Defining setIsNewUser as a boolean value
type LoginFormProps = {
   setIsNewUser: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function LoginForm({ setIsNewUser }: LoginFormProps) {
   return (
      <div className="bg-white p-8 rounded-lg shadow-lg w-80">
         <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
         <form>
            <div className="mb-4">
               <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
               </label>
               <input type="text" id="username" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="mb-4">
               <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
               </label>
               <input type="password" id="password" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center justify-between">
               <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md">
                  Login
               </button>
               <Link href="#">
                  <a className="text-sm text-blue-500 hover:underline">Forgot your password?</a>
               </Link>
            </div>
            <div className="mt-4 text-center">
               <p className="text-sm text-gray-600">
                  Don&apos;t have an account?{" "}
                  <a href="#" className="text-blue-500 hover:underline" onClick={() => setIsNewUser(true)}>
                     Sign up
                  </a>
               </p>
            </div>
         </form>
      </div>
   );
}
