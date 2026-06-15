import { Outlet } from "react-router-dom";
import logo from "../../assets/4f02a2e6c6acd8a847d3ddaba33f3830.png";

const Auth = () => {
  return (
    <div className="min-h-screen w-full">
      <header className="md:p-12 p-8">
        <img className="w-36 h-16 " src={logo} alt="Logo" />
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default Auth;
