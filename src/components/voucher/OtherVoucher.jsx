import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  ArrowLeft,
  Search,
  Calendar,
  Filter,
  RefreshCcw,
  Plus,
  Hotel,
} from "lucide-react";
import {
  fetchOtherVouchers,
  deleteOtherVoucher,
} from "../../services/voucherService";
import { useNotification } from "../../hooks/useNotification";
import { useAlertDialogContext } from "../../contexts/AlertDialogContext";
import OtherVoucherTable from "./OtherVoucherTable";
import Pagination from "./Pagination";

const OtherVoucher = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const showAlert = useAlertDialogContext();

  const [allVouchers, setAllVouchers] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [startDate, setStartDate] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(() =>
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadVouchers();
  }, [startDate, endDate]);

  useEffect(() => {
    paginate();
  }, [currentPage, allVouchers]);

  const loadVouchers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await fetchOtherVouchers({
        startDate,
        endDate,
        searchTerm,
      });
      if (error) throw new Error(error);
      setAllVouchers(data || []);
      setTotalPages(Math.ceil((data || []).length / itemsPerPage));
      setCurrentPage(1);
    } catch (e) {
      console.error(e);
      setError("Unable to load vouchers");
    } finally {
      setLoading(false);
    }
  };

  const paginate = () => {
    const start = (currentPage - 1) * itemsPerPage;
    setVouchers(allVouchers.slice(start, start + itemsPerPage));
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      loadVouchers();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleCreateHotel = () => {
    navigate("/other-vouchers/create/hotel");
  };

  const handleEdit = (voucher) => {
    navigate(`/other-vouchers/edit/${voucher.id}`);
  };

  const handleDelete = async (voucher) => {
    const confirmed = await showAlert({
      title: "ยืนยันการลบ",
      description: `ลบ Voucher #${voucher.year_number}/${voucher.sequence_number}?`,
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
      actionVariant: "destructive",
    });
    if (!confirmed) return;

    const { success, error } = await deleteOtherVoucher(voucher.id);
    if (success) {
      showSuccess("ลบ Voucher สำเร็จ");
      loadVouchers();
    } else {
      showError("ลบไม่สำเร็จ: " + error);
    }
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Other Vouchers</h1>
        <button
          onClick={() => navigate("/voucher")}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center"
        >
          <ArrowLeft size={18} className="mr-2" />
          กลับไปหน้า Voucher
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Search and Filter</h2>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check-in From
            </label>
            <div className="relative">
              <Calendar
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                className="pl-10 w-full border border-gray-300 rounded-lg p-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check-in To
            </label>
            <div className="relative">
              <Calendar
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                className="pl-10 w-full border border-gray-300 rounded-lg p-2"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="md:col-span-3 flex items-end">
            <button
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition flex items-center justify-center"
              onClick={loadVouchers}
            >
              <Filter size={18} className="mr-2" />
              Filter
            </button>
          </div>
        </div>

        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by customer, hotel, contact..."
            className="pl-10 w-full border border-gray-300 rounded-lg p-2"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">All Other Vouchers</h2>
          <div className="flex space-x-2">
            <button
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition flex items-center"
              onClick={loadVouchers}
            >
              <RefreshCcw size={16} className="mr-2" />
              Refresh
            </button>
            <button
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition flex items-center"
              onClick={handleCreateHotel}
            >
              <Hotel size={16} className="mr-2" />
              <Plus size={14} className="mr-1" />
              Hotel Voucher
            </button>
          </div>
        </div>

        <OtherVoucherTable
          vouchers={vouchers}
          loading={loading}
          error={error}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onEdit={handleEdit}
          onDelete={handleDelete}
          formatDateDisplay={formatDateDisplay}
        />

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={allVouchers.length}
          />
        )}
      </div>
    </div>
  );
};

export default OtherVoucher;
