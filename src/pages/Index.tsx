import { Navigate } from "react-router-dom";

const Index = () => {
  const token = localStorage.getItem("token");

  // 🔐 Not logged in → go to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Logged in → go to CAP dashboard (or change per role later)
  return <Navigate to="/cap" replace />;
};

export default Index;
