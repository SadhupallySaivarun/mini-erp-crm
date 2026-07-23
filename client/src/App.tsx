import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Customers } from "./pages/Customers";
import { CustomerDetail } from "./pages/CustomerDetail";
import { Products } from "./pages/Products";
import { Inventory } from "./pages/Inventory";
import { Challans } from "./pages/Challans";
import { ChallanDetail } from "./pages/ChallanDetail";
import { CreateChallan } from "./pages/CreateChallan";
import { Profile } from "./pages/Profile";

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />

            <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SALES", "ACCOUNTS"]} />}>
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
            </Route>

            <Route path="/products" element={<Products />} />

            <Route element={<ProtectedRoute allowedRoles={["ADMIN", "WAREHOUSE", "ACCOUNTS"]} />}>
              <Route path="/inventory" element={<Inventory />} />
            </Route>

            <Route path="/challans" element={<Challans />} />
            <Route path="/challans/:id" element={<ChallanDetail />} />
            <Route element={<ProtectedRoute allowedRoles={["ADMIN", "SALES"]} />}>
              <Route path="/challans/new" element={<CreateChallan />} />
            </Route>

            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
