import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Orders from "./pages/Orders.jsx";
import Packing from "./pages/Packing.jsx";
import OrderList from "./pages/OrderList.jsx";
import Landing from "./pages/Landing.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import InfluencerLogin from "./pages/InfluencerLogin.jsx";
import Influencers from "./pages/Influencers.jsx";
import AppShell from "./layout/AppShell.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import ExcelOrderReview from "./pages/ExcelOrderReview.jsx";

function withShell(title, subtitle, element) {
  return (
    <AppShell pageTitle={title} pageSubtitle={subtitle}>
      {element}
    </AppShell>
  );
}

export default function App() {
  return (
    <div className="app">
      <main className="main">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/login/influencer" element={<InfluencerLogin />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allow="admin">
                {withShell(
                  "Dashboard",
                  "Inventory, stock, and operations overview",
                  <Dashboard />
                )}
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute allow="influencer">
                {withShell(
                  "Orders",
                  "Create, review, and process logistics orders",
                  <Orders />
                )}
              </ProtectedRoute>
            }
          />

          <Route
            path="/order-list"
            element={
              <ProtectedRoute allow="admin">
                {withShell(
                  "Order List",
                  "Confirmed operational orders and packing references",
                  <OrderList />
                )}
              </ProtectedRoute>
            }
          />

          <Route
            path="/influencers"
            element={
              <ProtectedRoute allow="admin">
                {withShell(
                  "Influencers",
                  "Profiles, performance, and sales activity",
                  <Influencers />
                )}
              </ProtectedRoute>
            }
          />

          <Route
            path="/packing/:orderId"
            element={
              <ProtectedRoute allow="admin">
                <Packing />
              </ProtectedRoute>
            }
          />

          <Route path="/excel-review" element={<ExcelOrderReview />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
