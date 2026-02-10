import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { getUser, removeAccessToken } from "./api";
import Loader from "./components/Loader";
import NavigationBar from "./components/NavigationBar";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import MainPage from "./pages/MainPage";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setIsUserLoading(true);
        const user = await getUser();
        setCurrentUser(user);
      } catch (error) {
        setCurrentUser(null);
        if (!isLoginPage) navigate("/login");
      } finally {
        setIsUserLoading(false);
      }
    };

    if (!isLoginPage) {
      fetchUser();
    } else {
      setIsUserLoading(false);
    }
  }, [isLoginPage, navigate]);

  const handleLogout = () => {
    removeAccessToken();
    setCurrentUser(null);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {isUserLoading ? (
        <div className="w-full min-h-screen flex items-center justify-center">
          <Loader />
        </div>
      ) : (
        <>
          {!isLoginPage && (
            <NavigationBar
              currentUser={currentUser}
              onLogout={handleLogout}
            />
          )}

          <div className="flex-1">
            <Routes>
              <Route
                path="/"
                element={<MainPage currentUser={currentUser} />}
              />
              <Route
                path="/admin"
                element={<AdminPage currentUser={currentUser} />}
              />
              <Route
                path="/login"
                element={<LoginPage setCurrentUser={setCurrentUser} />}
              />
            </Routes>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
