import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Download,
  RefreshCcw,
  Calendar,
  CheckSquare,
  Square,
  FileSpreadsheet,
} from "lucide-react";
import { useInformation } from "../contexts/InformationContext";
import ExportModal from "../components/report/ExportModal";
import { useNotification } from "../hooks/useNotification";
import FilterInputWithAdd from "../components/common/FilterInputWithAdd";
import SelectedFiltersDisplay from "../components/common/SelectedFiltersDisplay";
import { exportReportToExcel } from "../services/reportService";
import supabase from "../config/supabaseClient";

const Report = () => {
  const { showSuccess, showError, showInfo } = useNotification();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const { agents, tourRecipients, transferRecipients, addInformation } =
    useInformation();

  // Filter states - Date Range
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Multiple filter selections
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [selectedTourRecipients, setSelectedTourRecipients] = useState([]);
  const [selectedTransferRecipients, setSelectedTransferRecipients] = useState(
    []
  );

  // Current input values for each filter
  const [currentAgentValue, setCurrentAgentValue] = useState("");
  const [currentTourValue, setCurrentTourValue] = useState("");
  const [currentTransferValue, setCurrentTransferValue] = useState("");

  // Export states
  const [exportFormat, setExportFormat] = useState("combined");
  const [isExporting, setIsExporting] = useState(false);

  // Data states
  const [tourBookings, setTourBookings] = useState([]);
  const [transferBookings, setTransferBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selection states
  const [selectedTourIds, setSelectedTourIds] = useState(new Set());
  const [selectedTransferIds, setSelectedTransferIds] = useState(new Set());
  const [selectAllTour, setSelectAllTour] = useState(false);
  const [selectAllTransfer, setSelectAllTransfer] = useState(false);

  // Load data when filters change
  useEffect(() => {
    const hasFilters =
      selectedAgents.length > 0 ||
      selectedTourRecipients.length > 0 ||
      selectedTransferRecipients.length > 0;

    if (hasFilters) {
      fetchReportData();
    } else {
      // Clear data when no filter is selected
      setTourBookings([]);
      setTransferBookings([]);
      setSelectedTourIds(new Set());
      setSelectedTransferIds(new Set());
    }
  }, [
    startDate,
    endDate,
    selectedAgents,
    selectedTourRecipients,
    selectedTransferRecipients,
  ]);

  // Update select all checkboxes
  useEffect(() => {
    setSelectAllTour(
      tourBookings.length > 0 && selectedTourIds.size === tourBookings.length
    );
  }, [selectedTourIds, tourBookings]);

  useEffect(() => {
    setSelectAllTransfer(
      transferBookings.length > 0 &&
        selectedTransferIds.size === transferBookings.length
    );
  }, [selectedTransferIds, transferBookings]);

  // แก้ไขฟังก์ชัน fetchReportData ในไฟล์ Report.jsx
  const fetchReportData = async () => {
    setLoading(true);
    setError(null);

    try {

      let allTourBookings = [];
      let allTransferBookings = [];

      // ดึงข้อมูลจาก Agent filters - แก้ไขตรงนี้
      if (selectedAgents.length > 0) {
        for (const agent of selectedAgents) {
          const { data: tourData } = await supabase
            .from("tour_bookings")
            .select(
              `
            *,
            orders!inner (
              first_name,
              last_name,
              agent_name,
              reference_id,
              pax_adt,
              pax_chd,
              pax_inf
            )
          `
            )
            .gte("tour_date", startDate)
            .lte("tour_date", endDate)
            .ilike("orders.agent_name", agent) // เปลี่ยนจาก .eq เป็น .ilike
            .order("tour_date", { ascending: true });

          const { data: transferData } = await supabase
            .from("transfer_bookings")
            .select(
              `
            *,
            orders!inner (
              first_name,
              last_name,
              agent_name,
              reference_id,
              pax_adt,
              pax_chd,
              pax_inf
            )
          `
            )
            .gte("transfer_date", startDate)
            .lte("transfer_date", endDate)
            .ilike("orders.agent_name", agent) // เปลี่ยนจาก .eq เป็น .ilike
            .order("transfer_date", { ascending: true });

          if (tourData) allTourBookings = [...allTourBookings, ...tourData];
          if (transferData)
            allTransferBookings = [...allTransferBookings, ...transferData];
        }
      }

      // ดึงข้อมูลจาก Tour Recipient filters - แก้ไขตรงนี้
      if (selectedTourRecipients.length > 0) {
        for (const recipient of selectedTourRecipients) {
          const { data: tourData } = await supabase
            .from("tour_bookings")
            .select(
              `
            *,
            orders (
              first_name,
              last_name,
              agent_name,
              reference_id,
              pax_adt,
              pax_chd,
              pax_inf
            )
          `
            )
            .gte("tour_date", startDate)
            .lte("tour_date", endDate)
            .ilike("send_to", recipient) // เปลี่ยนจาก .eq เป็น .ilike
            .order("tour_date", { ascending: true });

          if (tourData) allTourBookings = [...allTourBookings, ...tourData];
        }
      }

      // ดึงข้อมูลจาก Transfer Recipient filters - แก้ไขตรงนี้
      if (selectedTransferRecipients.length > 0) {
        for (const recipient of selectedTransferRecipients) {
          const { data: transferData } = await supabase
            .from("transfer_bookings")
            .select(
              `
            *,
            orders (
              first_name,
              last_name,
              agent_name,
              reference_id,
              pax_adt,
              pax_chd,
              pax_inf
            )
          `
            )
            .gte("transfer_date", startDate)
            .lte("transfer_date", endDate)
            .ilike("send_to", recipient) // เปลี่ยนจาก .eq เป็น .ilike
            .order("transfer_date", { ascending: true });

          if (transferData)
            allTransferBookings = [...allTransferBookings, ...transferData];
        }
      }

      // ลบข้อมูลซ้ำ (ถ้ามี)
      const uniqueTourBookings = allTourBookings.filter(
        (booking, index, self) =>
          index === self.findIndex((b) => b.id === booking.id)
      );

      const uniqueTransferBookings = allTransferBookings.filter(
        (booking, index, self) =>
          index === self.findIndex((b) => b.id === booking.id)
      );

      setTourBookings(uniqueTourBookings);
      setTransferBookings(uniqueTransferBookings);

      // Reset selections
      setSelectedTourIds(new Set());
      setSelectedTransferIds(new Set());
    } catch (err) {
      console.error("Error fetching report data:", err);
      setError("Cannot load data");
      setTourBookings([]);
      setTransferBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding filters
  const handleAddAgent = (agent) => {
    if (!selectedAgents.includes(agent)) {
      setSelectedAgents([...selectedAgents, agent]);
    }
  };

  const handleAddTourRecipient = (recipient) => {
    if (!selectedTourRecipients.includes(recipient)) {
      setSelectedTourRecipients([...selectedTourRecipients, recipient]);
    }
  };

  const handleAddTransferRecipient = (recipient) => {
    if (!selectedTransferRecipients.includes(recipient)) {
      setSelectedTransferRecipients([...selectedTransferRecipients, recipient]);
    }
  };

  // Handle removing filters
  const handleRemoveFilter = (type, value) => {
    switch (type) {
      case "agent":
        setSelectedAgents(selectedAgents.filter((agent) => agent !== value));
        break;
      case "tour_recipient":
        setSelectedTourRecipients(
          selectedTourRecipients.filter((recipient) => recipient !== value)
        );
        break;
      case "transfer_recipient":
        setSelectedTransferRecipients(
          selectedTransferRecipients.filter((recipient) => recipient !== value)
        );
        break;
    }
  };

  // Handle adding new information
  const handleAddNewInformation = async (value, category) => {
    try {
      const result = await addInformation({
        category,
        value,
        description: `Added from Report page`,
        active: true,
      });
      return result.data;
    } catch (error) {
      throw new Error("Cannot add new information");
    }
  };

  const handleReset = () => {
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
    setSelectedAgents([]);
    setSelectedTourRecipients([]);
    setSelectedTransferRecipients([]);
    setCurrentAgentValue("");
    setCurrentTourValue("");
    setCurrentTransferValue("");
    setSelectedTourIds(new Set());
    setSelectedTransferIds(new Set());
    setExportFormat("combined");
  };

  const handleTourSelectAll = (checked) => {
    if (checked) {
      setSelectedTourIds(new Set(tourBookings.map((b) => b.id)));
    } else {
      setSelectedTourIds(new Set());
    }
  };

  const handleTransferSelectAll = (checked) => {
    if (checked) {
      setSelectedTransferIds(new Set(transferBookings.map((b) => b.id)));
    } else {
      setSelectedTransferIds(new Set());
    }
  };

  const handleTourSelect = (id, checked) => {
    const newSelected = new Set(selectedTourIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedTourIds(newSelected);
  };

  const handleTransferSelect = (id, checked) => {
    const newSelected = new Set(selectedTransferIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedTransferIds(newSelected);
  };

  const formatPax = (booking) => {
    if (booking.orders) {
      const adt = parseInt(booking.orders.pax_adt) || 0;
      const chd = parseInt(booking.orders.pax_chd) || 0;
      const inf = parseInt(booking.orders.pax_inf) || 0;

      let paxParts = [];
      if (adt > 0) paxParts.push(adt.toString());
      if (chd > 0) paxParts.push(chd.toString());
      if (inf > 0) paxParts.push(inf.toString());

      return paxParts.length > 0 ? paxParts.join("+") : "0";
    }
    return booking.pax || "0";
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return "0";
    return parseFloat(amount).toLocaleString();
  };

  const calculateProfit = (booking) => {
    const cost = parseFloat(booking.cost_price) || 0;
    const sell = parseFloat(booking.selling_price) || 0;
    const profit = sell - cost;
    return profit;
  };

  // เพิ่ม state สำหรับคอลัมน์ที่แสดง
  const [visibleColumns, setVisibleColumns] = useState({
    Date: true,
    Agent: true,
    ReferenceID: false,
    CustomerName: true,
    Pax: true,
    PickupTime: false,
    Hotel: false, // เปลี่ยนจาก HotelOrPickup
    Details: false, // เปลี่ยนจาก DetailsOrDropoff
    PickupFrom: false, // ใหม่
    DropTo: false, // ใหม่
    Flight: false,
    FlightTime: false,
    SendTo: false,
    Note: false,
    Cost: true,
    Sell: true,
    Profit: true,
  });

  // ฟังก์ชันจัดการการเปลี่ยนแปลง checkbox
  const handleColumnToggle = (column) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [column]: !prev[column],
    }));
  };

  const handleExport = async () => {
    // ตรวจสอบข้อมูลก่อน
    const selectedTours =
      selectedTourIds.size > 0
        ? tourBookings.filter((b) => selectedTourIds.has(b.id))
        : tourBookings;

    const selectedTransfers =
      selectedTransferIds.size > 0
        ? transferBookings.filter((b) => selectedTransferIds.has(b.id))
        : transferBookings;

    if (selectedTours.length === 0 && selectedTransfers.length === 0) {
      showError("No data to export");
      return;
    }

    // เปิด Modal แทนการ Export ทันที
    setIsExportModalOpen(true);
  };

  const handleConfirmExport = async (
    finalTourBookings,
    finalTransferBookings
  ) => {
    setIsExporting(true);
    setIsExportModalOpen(false);
    showInfo("Creating Excel file, please wait...");

    try {
      // เตรียม selectedFilters object สำหรับ reportService
      const selectedFilters = {
        agents: selectedAgents,
        tourRecipients: selectedTourRecipients,
        transferRecipients: selectedTransferRecipients,
      };

      const result = await exportReportToExcel(
        finalTourBookings,
        finalTransferBookings,
        startDate,
        endDate,
        exportFormat,
        selectedFilters
      );

      if (result.success) {
        showSuccess(result.message);
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error("Export error:", error);
      showError("Error exporting data");
    } finally {
      setIsExporting(false);
    }
  };

  // แก้ไขฟังก์ชัน fetchAllDataForRange ในไฟล์ Report.jsx
  const fetchAllDataForRange = async () => {
    setLoading(true);
    setError(null);

    try {
      // ดึงข้อมูลทั้งหมดไม่มีเงื่อนไข (ไม่ต้องแก้ส่วนนี้เพราะไม่มีการกรองด้วย text)
      const { data: tourData, error: tourError } = await supabase
        .from("tour_bookings")
        .select(
          `
      *,
      orders (
        first_name,
        last_name,
        agent_name,
        reference_id,
        pax_adt,
        pax_chd,
        pax_inf
      )
    `
        )
        .gte("tour_date", startDate)
        .lte("tour_date", endDate)
        .order("tour_date", { ascending: true });

      const { data: transferData, error: transferError } = await supabase
        .from("transfer_bookings")
        .select(
          `
      *,
      orders (
        first_name,
        last_name,
        agent_name,
        reference_id,
        pax_adt,
        pax_chd,
        pax_inf
      )
    `
        )
        .gte("transfer_date", startDate)
        .lte("transfer_date", endDate)
        .order("transfer_date", { ascending: true });

      if (tourError) throw tourError;
      if (transferError) throw transferError;

      setTourBookings(tourData || []);
      setTransferBookings(transferData || []);

      // Reset selections
      setSelectedTourIds(new Set());
      setSelectedTransferIds(new Set());

      showSuccess(
        `Showing all data from ${format(new Date(startDate), "dd/MM/yyyy")} to ${format(new Date(endDate), "dd/MM/yyyy")}`
      );
    } catch (err) {
      console.error("Error fetching all data:", err);
      setError("Cannot load data");
      setTourBookings([]);
      setTransferBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const renderTourTable = () => {
    if (tourBookings.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No Tour data in selected period
        </div>
      );
    }

    const columns = [
      { key: "Date", label: "Date" },
      { key: "Agent", label: "Agent" },
      { key: "ReferenceID", label: "Reference ID" },
      { key: "CustomerName", label: "Customer Name" },
      { key: "Pax", label: "Pax" },
      { key: "PickupTime", label: "Pickup Time" },
      { key: "PickupFrom", label: "Pickup From" }, // ใหม่
      { key: "DropTo", label: "Drop To" }, // ใหม่
      { key: "Flight", label: "Flight" },
      { key: "FlightTime", label: "Flight Time" },
      { key: "SendTo", label: "Send To" },
      { key: "Note", label: "Note" },
      { key: "Cost", label: "Cost" },
      { key: "Sell", label: "Sell" },
      { key: "Profit", label: "Profit" },
    ].filter((col) => visibleColumns[col.key]);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-green-50">
            <tr>
              <th className="px-4 py-3 text-center">
                <button
                  onClick={() => handleTourSelectAll(!selectAllTour)}
                  className="text-green-600 hover:text-green-800"
                >
                  {selectAllTour ? (
                    <CheckSquare size={18} />
                  ) : (
                    <Square size={18} />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                No.
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase ${
                    ["Cost", "Sell", "Profit"].includes(col.key)
                      ? "text-right"
                      : ""
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tourBookings.map((booking, index) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() =>
                      handleTourSelect(
                        booking.id,
                        !selectedTourIds.has(booking.id)
                      )
                    }
                    className="text-green-600 hover:text-green-800"
                  >
                    {selectedTourIds.has(booking.id) ? (
                      <CheckSquare size={18} />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm">{index + 1}</td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm ${
                      ["Cost", "Sell", "Profit"].includes(col.key)
                        ? "text-right"
                        : ""
                    } ${
                      ["Details", "Note"].includes(col.key)
                        ? "max-w-xs truncate"
                        : ""
                    }`}
                    title={
                      ["Details", "Note"].includes(col.key)
                        ? booking[
                            col.key === "Details" ? "tour_detail" : "note"
                          ]
                        : undefined
                    }
                  >
                    {col.key === "Date"
                      ? formatDateDisplay(booking.tour_date)
                      : col.key === "Agent"
                      ? booking.orders?.agent_name || "-"
                      : col.key === "ReferenceID"
                      ? booking.orders?.reference_id || "-"
                      : col.key === "CustomerName"
                      ? booking.orders
                        ? `${booking.orders.first_name || ""} ${
                            booking.orders.last_name || ""
                          }`.trim() || "-"
                        : "-"
                      : col.key === "Pax"
                      ? formatPax(booking)
                      : col.key === "PickupTime"
                      ? booking.tour_pickup_time || "-"
                      : col.key === "PickupFrom"
                      ? booking.tour_hotel || "-"
                      : col.key === "DropTo"
                      ? booking.tour_detail || "-"
                      : col.key === "Flight"
                      ? booking.tour_flight || "-"
                      : col.key === "FlightTime"
                      ? booking.tour_ftime || "-"
                      : col.key === "SendTo"
                      ? booking.send_to || "-"
                      : col.key === "Note"
                      ? booking.note || "-"
                      : col.key === "Cost"
                      ? formatCurrency(booking.cost_price)
                      : col.key === "Sell"
                      ? formatCurrency(booking.selling_price)
                      : col.key === "Profit"
                      ? formatCurrency(calculateProfit(booking))
                      : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTransferTable = () => {
    if (transferBookings.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No Transfer data in selected period
        </div>
      );
    }

    const columns = [
      { key: "Date", label: "Date" },
      { key: "Agent", label: "Agent" },
      { key: "ReferenceID", label: "Reference ID" },
      { key: "CustomerName", label: "Customer Name" },
      { key: "Pax", label: "Pax" },
      { key: "PickupTime", label: "Pickup Time" },
      { key: "PickupFrom", label: "Pickup From" },
      { key: "DropTo", label: "Drop To" },
      { key: "Flight", label: "Flight" },
      { key: "FlightTime", label: "Flight Time" },
      { key: "SendTo", label: "Send To" },
      { key: "Note", label: "Note" },
      { key: "Cost", label: "Cost" },
      { key: "Sell", label: "Sell" },
      { key: "Profit", label: "Profit" },
    ].filter((col) => visibleColumns[col.key]);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-4 py-3 text-center">
                <button
                  onClick={() => handleTransferSelectAll(!selectAllTransfer)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {selectAllTransfer ? (
                    <CheckSquare size={18} />
                  ) : (
                    <Square size={18} />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                No.
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase ${
                    ["Cost", "Sell", "Profit"].includes(col.key)
                      ? "text-right"
                      : ""
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transferBookings.map((booking, index) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() =>
                      handleTransferSelect(
                        booking.id,
                        !selectedTransferIds.has(booking.id)
                      )
                    }
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {selectedTransferIds.has(booking.id) ? (
                      <CheckSquare size={18} />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm">{index + 1}</td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm ${
                      ["Cost", "Sell", "Profit"].includes(col.key)
                        ? "text-right"
                        : ""
                    } ${
                      ["PickupFrom", "DropTo", "Note"].includes(col.key)
                        ? "max-w-xs truncate"
                        : ""
                    }`}
                    title={
                      ["PickupFrom", "DropTo", "Note"].includes(col.key)
                        ? booking[
                            col.key === "PickupFrom"
                              ? "pickup_location"
                              : col.key === "DropTo"
                              ? "drop_location"
                              : "note"
                          ]
                        : undefined
                    }
                  >
                    {col.key === "Date"
                      ? formatDateDisplay(booking.transfer_date)
                      : col.key === "Agent"
                      ? booking.orders?.agent_name || "-"
                      : col.key === "ReferenceID"
                      ? booking.orders?.reference_id || "-"
                      : col.key === "CustomerName"
                      ? booking.orders
                        ? `${booking.orders.first_name || ""} ${
                            booking.orders.last_name || ""
                          }`.trim() || "-"
                        : "-"
                      : col.key === "Pax"
                      ? formatPax(booking)
                      : col.key === "PickupTime"
                      ? booking.transfer_time || "-"
                      : col.key === "PickupFrom"
                      ? booking.pickup_location || "-" // ใหม่
                      : col.key === "DropTo"
                      ? booking.drop_location || "-" // ใหม่
                      : col.key === "Flight"
                      ? booking.transfer_flight || "-"
                      : col.key === "FlightTime"
                      ? booking.transfer_ftime || "-"
                      : col.key === "SendTo"
                      ? booking.send_to || "-"
                      : col.key === "Note"
                      ? booking.note || "-"
                      : col.key === "Cost"
                      ? formatCurrency(booking.cost_price)
                      : col.key === "Sell"
                      ? formatCurrency(booking.selling_price)
                      : col.key === "Profit"
                      ? formatCurrency(calculateProfit(booking))
                      : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50 min-h-screen">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Report</h1>
        <p className="text-gray-600">Create Reports and Export Booking Data</p>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Data Filters</h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          {/* Start Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <div className="relative">
              <Calendar
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <div className="relative">
              <Calendar
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Agent Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent
            </label>
            <FilterInputWithAdd
              options={agents}
              value={currentAgentValue}
              onChange={setCurrentAgentValue}
              onAdd={handleAddAgent}
              onAddNew={(value) => handleAddNewInformation(value, "agent")}
              placeholder="Select Agent"
              selectedItems={selectedAgents}
            />
          </div>

          {/* Tour Recipient Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send To (Tour)
            </label>
            <FilterInputWithAdd
              options={tourRecipients}
              value={currentTourValue}
              onChange={setCurrentTourValue}
              onAdd={handleAddTourRecipient}
              onAddNew={(value) =>
                handleAddNewInformation(value, "tour_recipients")
              }
              placeholder="Select Tour Recipient"
              selectedItems={selectedTourRecipients}
            />
          </div>

          {/* Transfer Recipient Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send To (Transfer)
            </label>
            <FilterInputWithAdd
              options={transferRecipients}
              value={currentTransferValue}
              onChange={setCurrentTransferValue}
              onAdd={handleAddTransferRecipient}
              onAddNew={(value) =>
                handleAddNewInformation(value, "transfer_recipients")
              }
              placeholder="Select Transfer Recipient"
              selectedItems={selectedTransferRecipients}
            />
          </div>
        </div>

        {/* Selected Filters Display */}
        <SelectedFiltersDisplay
          selectedAgents={selectedAgents}
          selectedTourRecipients={selectedTourRecipients}
          selectedTransferRecipients={selectedTransferRecipients}
          onRemove={handleRemoveFilter}
        />

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <RefreshCcw size={18} className="mr-2" />
              Reset
            </button>
            <button
              onClick={fetchAllDataForRange}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Calendar size={18} className="mr-2" />
              Show All Data
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Export Format Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                Excel Format:
              </label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="combined">Combined</option>
                <option value="separate">Separate Tour/Transfer</option>
              </select>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={
                isExporting ||
                (tourBookings.length === 0 && transferBookings.length === 0)
              }
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={18} className="mr-2" />
                  Export Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading/Error States */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
          {error}
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-800">Orders</h4>
                <p className="text-2xl font-bold text-gray-600">
                  {
                    [
                      ...new Set([
                        ...tourBookings.map((b) => b.order_id),
                        ...transferBookings.map((b) => b.order_id),
                      ]),
                    ].length
                  }
                </p>
                <p className="text-sm text-gray-600">Total Orders</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-green-800">Tour</h4>
                <p className="text-2xl font-bold text-green-600">
                  {tourBookings.length}
                </p>
                <p className="text-sm text-gray-600">
                  Selected: {selectedTourIds.size} items
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-blue-800">
                  Transfer
                </h4>
                <p className="text-2xl font-bold text-blue-600">
                  {transferBookings.length}
                </p>
                <p className="text-sm text-gray-600">
                  Selected: {selectedTransferIds.size} items
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-purple-800">
                  Total
                </h4>
                <p className="text-2xl font-bold text-purple-600">
                  {tourBookings.length + transferBookings.length}
                </p>
                <p className="text-sm text-gray-600">
                  Selected: {selectedTourIds.size + selectedTransferIds.size}{" "}
                  items
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="text-lg font-semibold mb-2">
              Select Columns to Display
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-8 gap-2">
              {Object.keys(visibleColumns).map((column) => (
                <label key={column} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={visibleColumns[column]}
                    onChange={() => handleColumnToggle(column)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">
                    {column === "Hotel"
                      ? "Hotel"
                      : column === "Details"
                      ? "Details"
                      : column === "PickupFrom"
                      ? "Pickup From"
                      : column === "DropTo"
                      ? "Drop To"
                      : column === "CustomerName"
                      ? "Customer Name"
                      : column === "PickupTime"
                      ? "Pickup Time"
                      : column === "ReferenceID"
                      ? "Reference ID"
                      : column === "Pax"
                      ? "Pax"
                      : column === "SendTo"
                      ? "Send To"
                      : column === "FlightTime"
                      ? "Flight Time"
                      : column}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Tour Table */}
          {tourBookings.length > 0 && (
            <div className="bg-white rounded-lg shadow-md mb-6">
              <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-4 rounded-t-lg">
                <h3 className="text-lg font-semibold">
                  Tour Bookings ({tourBookings.length})
                </h3>
              </div>
              <div className="p-4">{renderTourTable()}</div>
            </div>
          )}

          {/* Transfer Table */}
          {transferBookings.length > 0 && (
            <div className="bg-white rounded-lg shadow-md">
              <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 rounded-t-lg">
                <h3 className="text-lg font-semibold">
                  Transfer Bookings ({transferBookings.length})
                </h3>
              </div>
              <div className="p-4">{renderTransferTable()}</div>
            </div>
          )}

          {/* No Data Message */}
          {tourBookings.length === 0 && transferBookings.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              {selectedAgents.length === 0 &&
              selectedTourRecipients.length === 0 &&
              selectedTransferRecipients.length === 0
                ? "Please select filters to display data"
                : "No data found matching the selected criteria"}
            </div>
          )}
        </>
      )}
      {/* Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          tourBookings={
            selectedTourIds.size > 0
              ? tourBookings.filter((b) => selectedTourIds.has(b.id))
              : tourBookings
          }
          transferBookings={
            selectedTransferIds.size > 0
              ? transferBookings.filter((b) => selectedTransferIds.has(b.id))
              : transferBookings
          }
          onConfirm={handleConfirmExport}
          onCancel={() => setIsExportModalOpen(false)}
          startDate={startDate}
          endDate={endDate}
          exportFormat={exportFormat}
        />
      )}
    </div>
  );
};

export default Report;
