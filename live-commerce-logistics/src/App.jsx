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
      {/* <header className="topbar">
        <div className="brand" style={{ cursor: "pointer" }} onClick={() => nav("/")}>
          <div className="logo">LC</div>
          <div>
            <div className="title">Live Commerce Logistics</div>
            <div className="subtitle">Dashboard • Influencers • Orders • Packing</div>
          </div>
        </div>

        <nav className="nav">
          {!session.role && (
            <NavLink to="/" className={({ isActive }) => (isActive ? "active" : "")}>
              Home
            </NavLink>
          )}

          {session.role === "admin" && (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
                Dashboard
              </NavLink>
              <NavLink to="/influencers" className={({ isActive }) => (isActive ? "active" : "")}>
                Influencers
              </NavLink>
              <NavLink to="/order-list" className={({ isActive }) => (isActive ? "active" : "")}>
                Order List
              </NavLink>
              <NavLink to="/orders" className={({ isActive }) => (isActive ? "active" : "")}>
                Influencer/Seller
              </NavLink>
            </>
          )}

          {session.role === "influencer" && (
            <NavLink to="/orders" className={({ isActive }) => (isActive ? "active" : "")}>
              Influencer/Seller
            </NavLink>
          )}

          {session.role && (
            <button className="btn danger" style={{ marginLeft: 10 }} onClick={logout} type="button">
              Logout
            </button>
          )}
        </nav>
      </header> */}

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
          {/* <Route
            path="/dashboard"
            element={
              <ProtectedRoute allow="admin">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/influencers"
            element={
              <ProtectedRoute allow="admin">
                <Influencers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-list"
            element={
              <ProtectedRoute allow="admin">
                <OrderList />
              </ProtectedRoute>
            }
          /> */}
          <Route
            path="/packing/:orderId"
            element={
              <ProtectedRoute allow="admin">
                <Packing />
              </ProtectedRoute>
            }
          />

          {/* Influencer-only page */}
          <Route
            path="/orders"
            element={
              <ProtectedRoute allow={session.role === "admin" ? "admin" : "influencer"}>
                <Orders />
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