import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Link } from "react-router-dom";
import loginImage from "@/assets/loginImg.jpeg";
import forgotImg from "@/assets/forgotImg.jpeg";
import { useState } from "react";
import Login from "./login";

import { useTranslation } from "react-i18next";

import ResetFlow from "./components/ResetFlow";

const Main = () => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<"login" | "forgotPassword">(
    "login"
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row max-w-5xl mx-auto w-full  ">
      <div className="w-full flex-1  animate-fadeIn overflow-hidden ">
        <img
          src={activeTab === "login" ? loginImage : forgotImg}
          alt="Two restaurant staff members smiling"
          className="object-cover rounded-2xl md:h-[600px] md:w-[508px] h-0 w-0 lg:mb-0 mb-5"
        />
      </div>

      <div className="w-full flex-1 space-between  px-8 flex flex-col">
        <Tabs
          defaultValue="login"
          className="w-full items-center lg:items-start max-w-md mx-auto lg:mt-0 lg:mb-0 mb-2"
        >
          <TabsList className=" rounded-full py-7 flex  bg-gray-100">
            <TabsTrigger
              value="login"
              className={`rounded-full hover:cursor-pointer flex-1 px-8 py-5 data-[state=active]:bg-black data-[state=active]:text-white `}
              onClick={() => setActiveTab("login")}
            >
              {t("auth.main.login")}
            </TabsTrigger>
            <TabsTrigger
              value="reset"
              className={`rounded-full hover:cursor-pointer flex-1 px-8 py-5 data-[state=active]:bg-black data-[state=active]:text-white `}
              onClick={() => setActiveTab("forgotPassword")}
            >
              {t("auth.main.resetPassword")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "login" ? <Login /> : <ResetFlow />}

        <div className="mt-auto pt-8 text-center text-sm text-gray-400">
          © {t("auth.main.copyright.1")},{" "}
          <Link to="#" className="text-orange-400">
            Saucy Menu
          </Link>
          . {t("auth.main.copyright.2")}.
        </div>
      </div>
    </div>
  );
};

export default Main;
