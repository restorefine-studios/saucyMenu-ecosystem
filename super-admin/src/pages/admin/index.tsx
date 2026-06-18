import { Outlet } from "react-router-dom";
import { AdminNavbar } from "@/components/AdminNavbar";
import { BottomNav } from "@/components/BottomNav";

const Admin = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="pt-0 md:pt-28 pb-24 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
export default Admin;
