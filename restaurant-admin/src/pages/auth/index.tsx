import { Outlet, useNavigate } from "react-router-dom";
import logo from "../../assets/4f02a2e6c6acd8a847d3ddaba33f3830.png";
import { useEffect } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";

const Auth = () => {
  const userString = localStorage.getItem("user");
  // Safely parse only if userString exists
  let userData: { token?: string } | null = null;
  if (userString) {
    userData = JSON.parse(userString);
  }

  const navigate = useNavigate();

  useEffect(() => {
    if (userData?.token) {
      navigate("/admin/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="max-h-screen w-full">
      <header className="md:p-12 p-8">
        <img className="w-36 h-16 " src={logo} alt="Logo" />
      </header>
      <main>
        <Outlet />
      </main>
      <InstallPrompt />
    </div>
  );
};

export default Auth;
