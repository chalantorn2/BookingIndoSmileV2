import React, { useState } from "react";
import {
  Eye,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

const OrderTable = ({ orders, onViewDetails, onUpdateNote }) => {
  const [sortField, setSortField] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");

  // Sorting handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Format date for display
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const parsedDate = parseISO(dateStr);
      if (isValid(parsedDate)) {
        return format(parsedDate, "dd/MM/yyyy");
      }
      return dateStr;
    } catch (error) {
      return dateStr;
    }
  };

  // Get date range display
  const getDateRangeDisplay = (order) => {
    const startDate = order.start_date
      ? formatDateDisplay(order.start_date)
      : "-";
    const endDate = order.end_date ? formatDateDisplay(order.end_date) : "-";

    return startDate === endDate || startDate === "-" || endDate === "-"
      ? startDate
      : `${startDate} - ${endDate}`;
  };

  // Format voucher numbers
  const formatVouchers = (vouchersList) => {
    if (!vouchersList || vouchersList.length === 0) return "-";
    return vouchersList
      .map((v) => `${v.year_number}-${v.sequence_number}`)
      .join(", ");
  };

  // Render note input with inline edit
  const renderNoteCell = (order) => {
    const [isEditing, setIsEditing] = useState(false);
    const [noteText, setNoteText] = useState(order.note || "");

    const handleSaveNote = () => {
      onUpdateNote(order.id, noteText);
      setIsEditing(false);
    };

    if (isEditing) {
      return (
        <div className="flex items-center">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="border p-1 w-full rounded text-sm"
            autoFocus
            onBlur={handleSaveNote}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveNote();
              if (e.key === "Escape") setIsEditing(false);
            }}
          />
        </div>
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-gray-100 p-1 rounded flex items-center"
        onClick={() => setIsEditing(true)}
      >
        <FileText size={16} className="mr-1 text-gray-400" />
        <span className="truncate">{order.note || "คลิกเพื่อเพิ่มบันทึก"}</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 justify-center items-center">
          <tr className="text-center">
            <th
              className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort("id")}
            >
              <div className="flex items-center justify-center">
                <span>ID</span>
                {sortField === "id" && (
                  <span className="ml-1">
                    {sortDirection === "asc" ? (
                      <ArrowUp size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    )}
                  </span>
                )}
              </div>
            </th>
            <th
              className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort("agent_name")}
            >
              <div className="flex items-center justify-center">
                <span>Agent</span>
                {sortField === "agent_name" && (
                  <span className="ml-1">
                    {sortDirection === "asc" ? (
                      <ArrowUp size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    )}
                  </span>
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
              Voucher
            </th>
            <th
              className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort("customer_name")}
            >
              <div className="flex items-center justify-center">
                <span>Customer Name</span>
                {sortField === "customer_name" && (
                  <span className="ml-1">
                    {sortDirection === "asc" ? (
                      <ArrowUp size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    )}
                  </span>
                )}
              </div>
            </th>
            <th
              className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider"
              colSpan="3"
            >
              PAX
            </th>
            <th
              className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort("start_date")}
            >
              <div className="flex items-center justify-center">
                <span>Date</span>
                {sortField === "start_date" && (
                  <span className="ml-1">
                    {sortDirection === "asc" ? (
                      <ArrowUp size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    )}
                  </span>
                )}
              </div>
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
              หมายเหตุ
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
              สถานะ
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
          <tr className="text-center">
            <th colSpan="4" className="px-6 py-1 text-center text-sm"></th>
            <th className="px-2 py-1 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
              ADL
            </th>
            <th className="px-2 py-1 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
              CHD
            </th>
            <th className="px-2 py-1 text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
              INF
            </th>
            <th colSpan="4" className="px-6 py-1 text-center text-sm"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.length === 0 ? (
            <tr>
              <td
                colSpan="11"
                className="px-6 py-4 text-center text-sm text-gray-500"
              >
                ไม่พบข้อมูล Order
              </td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.reference_id || `#${order.id}`}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {order.agent_name || "-"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatVouchers(order.vouchers)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {`${order.first_name || ""} ${
                    order.last_name || ""
                  }`.trim() || "No Name"}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-500">
                  {order.pax_adt || "0"}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-500">
                  {order.pax_chd || "0"}
                </td>
                <td className="px-2 py-3 whitespace-nowrap text-sm text-center text-gray-500">
                  {order.pax_inf || "0"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {getDateRangeDisplay(order)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-xs">
                  {renderNoteCell(order)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                  {order.completed ? (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      <CheckCircle size={16} className="mr-1" />
                      เรียบร้อย
                    </span>
                  ) : (
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      <XCircle size={16} className="mr-1" />
                      ยังไม่เรียบร้อย
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onViewDetails(order)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;
