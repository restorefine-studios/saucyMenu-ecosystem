/* eslint-disable @typescript-eslint/no-explicit-any */
import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";
import AppSidebar from "./components/sidebar";

const Admin = () => {
  return (
    
      <SidebarProvider
        style={
          {
            "--sidebar-width": "20rem",
            "--sidebar-width-mobile": "20rem",
          } as any
        }
        // className=" w-[90%] h-[90%] bg-white shadow-inner border border-gray-300 rounded-lg"
      >
       
<AppSidebar />
    
  
       
      
        <section className=" w-full ">
          <Outlet />
        </section>
      </SidebarProvider>
   
  );
};
export default Admin;
