import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  fetchVoucherById,
  createOtherVoucher,
  updateOtherVoucher,
} from "../services/voucherService";
import HotelVoucherForm from "../components/voucher/HotelVoucherForm";
import { useNotification } from "../hooks/useNotification";
import supabase from "../config/supabaseClient";

const CreateOtherVoucher = ({ mode = "create" }) => {
  const { type, voucherId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const isEditMode = mode === "edit";
  const voucherType = isEditMode ? null : type || "hotel";

  const [voucherData, setVoucherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isEditMode) {
          const { data, error } = await fetchVoucherById(voucherId);
          if (error) throw new Error(error);
          if (!data) throw new Error("Voucher not found");
          setVoucherData(data);
        } else {
          const currentYear = new Date().getFullYear();
          const { data: sequenceData } = await supabase
            .from("sequences")
            .select("*")
            .eq("key", `voucher_${currentYear}`)
            .single();

          const nextSequence = sequenceData ? sequenceData.value + 1 : 1;

          setVoucherData({
            year_number: currentYear.toString(),
            sequence_number: String(nextSequence).padStart(4, "0"),
          });
        }
      } catch (e) {
        console.error(e);
        setError(e.message || "Unable to load voucher");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isEditMode, voucherId]);

  const handleSave = async (data) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      let result;
      if (isEditMode) {
        result = await updateOtherVoucher(voucherId, data);
        if (result.error) throw new Error(result.error);
        showSuccess("Voucher updated successfully");
      } else {
        result = await createOtherVoucher(data);
        if (result.error) throw new Error(result.error);
        showSuccess("Voucher created successfully");
      }
      setTimeout(() => {
        navigate("/other-vouchers");
      }, 1200);
    } catch (e) {
      console.error(e);
      showError("Unable to save Voucher: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderForm = () => {
    if (isEditMode) {
      if (voucherData?.booking_type === "accommodation") {
        return (
          <HotelVoucherForm voucherData={voucherData} onSave={handleSave} />
        );
      }
      return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          Voucher type ไม่รองรับใน Other Vouchers editor
        </div>
      );
    }

    switch (voucherType) {
      case "hotel":
        return (
          <HotelVoucherForm voucherData={voucherData} onSave={handleSave} />
        );
      default:
        return (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            ไม่รองรับ type "{voucherType}"
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          {isEditMode ? "Edit Other Voucher" : "Create Other Voucher"}
        </h1>
        <button
          onClick={() => navigate("/other-vouchers")}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center"
        >
          <ArrowLeft size={18} className="mr-2" />
          กลับไปหน้า Other Vouchers
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-purple-500 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          <p>{error}</p>
        </div>
      ) : (
        renderForm()
      )}
    </div>
  );
};

export default CreateOtherVoucher;
