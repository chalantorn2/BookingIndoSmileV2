// src/components/common/Sidebar.jsx
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  BarChart2,
  Calendar,
  ClipboardPlus,
  FileText,
  CreditCard,
  PieChart,
  Database,
  Receipt,
  Users,
  LogOut,
  User,
  DollarSign,
  Printer,
  Ticket,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, checkPermission } = useAuth();

  const navItems = [
    { path: "/", label: "Home", icon: <Home size={20} />, permission: null },
    {
      path: "/booking-form",
      label: "Bookings",
      icon: <ClipboardPlus size={20} />,
      permission: null,
    },
    {
      path: "/orders",
      label: "Orders",
      icon: <Calendar size={20} />,
      permission: null,
    },
    {
      path: "/view-payment",
      label: "View Payment",
      icon: <DollarSign size={20} />,
      permission: null,
    },
    {
      path: "/voucher",
      label: "Voucher",
      icon: <Ticket size={20} />,
      permission: null,
    },
    {
      path: "/payments",
      label: "Payment",
      icon: <CreditCard size={20} />,
      permission: null,
    },
    {
      path: "/invoice",
      label: "Invoice",
      icon: <FileText size={20} />,
      permission: null,
    },

    {
      path: "/information",
      label: "Information",
      icon: <Database size={20} />,
      permission: null,
    },

    // {
    //   path: "/dashboard",
    //   label: "Dashboard",
    //   icon: <BarChart2 size={20} />,
    //   disabled: true,
    //   permission: null,
    // },
    // {
    //   path: "/reports",
    //   label: "Report",
    //   icon: <PieChart size={20} />,
    //   disabled: true,
    //   permission: null,
    // },
    {
      path: "/users",
      label: "Users Management",
      icon: <Users size={20} />,
      permission: "admin", // เฉพาะ admin และ dev เท่านั้น
    },
  ];

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // กรองเมนูตามสิทธิ์
  const filteredNavItems = navItems.filter((item) => {
    if (!item.permission) return true; // ไม่ต้องตรวจสอบสิทธิ์
    return checkPermission(item.permission);
  });

  return (
    <div
      className={`h-screen bg-blue-500 text-white flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-blue-400">
        <div className="flex items-center justify-between">
          {!collapsed && <h1 className="text-2xl font-bold">SevenSmile</h1>}
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-full hover:bg-blue-600 transition-colors"
          >
            {collapsed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-2 px-2">
          {filteredNavItems.map((item, index) => (
            <li key={index}>
              <Link
                to={item.disabled ? "#" : item.path}
                className={`flex items-center p-3 rounded-lg transition-colors ${
                  item.disabled
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:bg-blue-600"
                } ${
                  location.pathname === item.path && !item.disabled
                    ? "bg-white text-blue-500"
                    : ""
                }`}
                onClick={(e) => {
                  if (item.disabled) {
                    e.preventDefault();
                  }
                }}
              >
                <span className="mr-3">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* User Info */}
      {user && (
        <div className="p-4 border-t border-blue-400">
          <div className="flex items-center">
            <div className="rounded-full bg-blue-400 p-2 mr-3">
              <User size={20} className="text-white" />
            </div>
            {!collapsed && (
              <div>
                <div className="font-medium">{user.fullname}</div>
                <div className="text-xs text-blue-100">
                  {user.role === "dev"
                    ? "Developer"
                    : user.role === "admin"
                    ? "Admin"
                    : "User"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout Button */}
      <div className="p-2 border-t border-blue-400 ">
        <button
          onClick={handleLogout}
          className="flex items-center center p-1 pl-4 rounded-lg hover:bg-blue-600 transition-colors w-full"
        >
          <LogOut size={20} className="mr-3" />
          {!collapsed && <span>ออกจากระบบ</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
