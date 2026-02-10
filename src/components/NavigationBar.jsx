import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../assets/logo.svg";

function NavigationBar({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminPage = location.pathname === "/admin";

  return (
    <div className="w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="hidden md:flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img
              src={Logo}
              alt="Dental Daily Logo"
              className="h-10 w-auto"
            />
          </div>

          {currentUser && (
            <div className="md:hidden text-sm font-semibold text-gray-800">
              {currentUser.name}
            </div>
          )}
        </div>

        {currentUser && (
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-sm font-medium text-gray-700">
              {currentUser.name}
            </div>

            {currentUser.is_admin && (
              <button
                onClick={() =>
                  navigate(isAdminPage ? "/" : "/admin")
                }
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                {isAdminPage ? "Главная" : "Админка"}
              </button>
            )}

            <button
              onClick={onLogout}
              className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-black/90"
            >
              Выйти
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default NavigationBar;
