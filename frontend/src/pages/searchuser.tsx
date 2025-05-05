// pages/search.tsx
import { useAuth } from "@/context/AuthContext";
import SearchUser from "@/components/SearchUser";

const SearchPage = () => {
   const { isLoggedIn, loading } = useAuth();

   if (loading) {
      return <div>Loading...</div>;
   }

   if (!isLoggedIn) {
      return <div>Please log in to search users</div>;
   }

   return (
      <div>
         <SearchUser />
      </div>
   );
};

export default SearchPage;
