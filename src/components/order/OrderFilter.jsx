import React from "react";
import { Search, Calendar, Filter, RefreshCcw } from "lucide-react";

const OrderFilter = ({
  startDate,
  endDate,
  searchTerm,
  filterType,
  onStartDateChange,
  onEndDateChange,
  onSearchChange,
  onFilterTypeChange,
  onApplyFilters,
  onRefresh,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md mb-6 p-4">
      <h5 className="font-medium text-lg mb-3 flex items-center">
        <Filter size={18} className="mr-2" />
        Filter Orders
      </h5>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-5">
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            From Date
          </label>
          <div className="flex items-center border border-gray-400 rounded-md">
            <span className="px-2 text-gray-500">
              <Calendar size={18} />
            </span>
            <input
              type="date"
              id="startDate"
              className="w-full p-2 rounded-md focus:outline-none"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>
        </div>
        <div className="md:col-span-5">
          <label
            htmlFor="endDate"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            To Date
          </label>
          <div className="flex items-center border border-gray-400 rounded-md">
            <span className="px-2 text-gray-500">
              <Calendar size={18} />
            </span>
            <input
              type="date"
              id="endDate"
              className="w-full p-2 rounded-md focus:outline-none"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>
        </div>
        <div className="md:col-span-2 flex items-end">
          <button
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition flex items-center justify-center"
            onClick={onApplyFilters}
          >
            <Search size={18} className="mr-2" />
            Apply
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
        <div className="md:col-span-6">
          <div className="flex items-center border border-gray-400 rounded-md">
            <span className="px-2 text-gray-500">
              <Search size={18} />
            </span>
            <input
              type="text"
              className="w-full p-2 rounded-md focus:outline-none"
              placeholder="Search by name or order ID..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        <div className="md:col-span-6 flex justify-between">
          <div className="flex rounded-md overflow-hidden">
            <button
              className={`px-3 py-2 border rounded-l-md ${
                filterType === "all" ? "bg-gray-200 font-medium" : "bg-white"
              }`}
              onClick={() => onFilterTypeChange("all")}
            >
              All Orders
            </button>
            <button
              className={`px-3 py-2 border border-gray-400 ${
                filterType === "completed"
                  ? "bg-green-200 font-medium text-green-800"
                  : "bg-white"
              }`}
              onClick={() => onFilterTypeChange("completed")}
            >
              เรียบร้อย
            </button>
            <button
              className={`px-3 py-2 border border-gray-400 rounded-r-md ${
                filterType === "incomplete"
                  ? "bg-yellow-200 font-medium text-yellow-800"
                  : "bg-white"
              }`}
              onClick={() => onFilterTypeChange("incomplete")}
            >
              ยังไม่เรียบร้อย
            </button>
          </div>

          <button
            onClick={onRefresh}
            className="px-3 py-2 border rounded-md flex items-center"
          >
            <RefreshCcw size={16} className="mr-1" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderFilter;
