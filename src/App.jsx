import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { getUser, removeAccessToken } from "./api";
import Loader from "./components/Loader";
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

  if (isUserLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<MainPage currentUser={currentUser} handleLogout={handleLogout} />}
      />
      <Route
        path="/admin"
        element={<AdminPage currentUser={currentUser} handleLogout={handleLogout} />}
      />
      <Route
        path="/login"
        element={<LoginPage setCurrentUser={setCurrentUser} />}
      />
    </Routes>
  );
}

export default App;
