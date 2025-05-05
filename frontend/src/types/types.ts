// Assuming the Post and Comment interfaces
interface Comment {
   id: number;
   post_id: number;
   user_id: number;
   user_name: string;
   user_avatar: string;
   content: string;
   timestamp: string;
}
export interface Post {
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
   rating?: number;
   likes: number;
   comments: Comment[];
}
export interface PostFilter {
   user_id?: number;
   latitude?: number;
   longitude?: number;
   date?: string;
   activity?: string;
   dive_type?: string;
}
export interface User {
   id: number;
   first_name: string;
   last_name: string;
   email: string;
   latitude: number;
   longitude: number;
   age: number;
   bio?: string;
   avatar?: string; // URL to profile picture
}
