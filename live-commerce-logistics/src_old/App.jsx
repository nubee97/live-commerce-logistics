import { NavLink, Route, Routes, Navigate, useNavigate } from "react-router-dom";
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
import { useAuth } from "./auth/AuthProvider.jsx";
import ExcelOrderReview from "./pages/ExcelOrderReview";

export default function App() {
  const { session, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="app">
      <main className="main">
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/login/influencer" element={<InfluencerLogin />} />

          {/* Admin-only */}
          <Route
  path="/dashboard"
  element={
    <ProtectedRoute allow="admin">
      <AppShell pageTitle="Dashboard" pageSubtitle="Inventory, stock, and operations overview">
        <Dashboard />
      </AppShell>
    </ProtectedRoute>
  }
/>
<Route
  path="/orders"
  element={
    <ProtectedRoute allow="influencer">
      <AppShell pageTitle="Orders" pageSubtitle="Create, review, and process logistics orders">
        <Orders />
      </AppShell>
    </ProtectedRoute>
  }
/>

<Route
  path="/order-list"
  element={
    <ProtectedRoute allow="admin">
      <AppShell pageTitle="Order List" pageSubtitle="Confirmed operational orders and packing references">
        <OrderList />
      </AppShell>
    </ProtectedRoute>
  }
/>

<Route
  path="/influencers"
  element={
    <ProtectedRoute allow="admin">
      <AppShell pageTitle="Influencers" pageSubtitle="Profiles, performance, and sales activity">
        <Influencers />
      </AppShell>
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

          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/excel-review" element={<ExcelOrderReview />} />
        </Routes>
      </main>
    </div>
  );
}