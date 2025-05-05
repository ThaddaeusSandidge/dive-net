import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Layout from "../components/Layout";
import { AuthProvider } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { MapProvider } from "@/context/MapContext";

export default function App({ Component, pageProps }: AppProps) {
   return (
      <AuthProvider>
         <SidebarProvider>
            <MapProvider>
               <Layout>
                  <Component {...pageProps} />
               </Layout>
            </MapProvider>
         </SidebarProvider>
      </AuthProvider>
   );
}
