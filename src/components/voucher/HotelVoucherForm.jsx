import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ServiceItem, VoucherInput } from "./VoucherForm";
import { Check } from "lucide-react";
import CaptureButtons from "../common/CaptureButtons";

const HotelVoucherForm = ({ voucherData: initialVoucherData, onSave }) => {
  const printRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  const [voucherData, setVoucherData] = useState({
    customer_name: "",
    contact_person: "",
    accommodation: "",
    accommodation_at: "",
    accommodation_pax: "",
    accommodation_room: "",
    accommodation_night: "",
    accommodation_check_in: "",
    accommodation_check_out: "",
    accommodation_confirmation_no: "",
    accommodation_confirmation_code: "",
    payment_option: "",
    payment_amount: "",
    remark: "",
    issue_by: "",
    customer_signature: "",
    year_number: new Date().getFullYear().toString(),
    sequence_number: "0001",
    ...(initialVoucherData || {}),
  });

  useEffect(() => {
    if (initialVoucherData) {
      setVoucherData((prev) => ({
        ...prev,
        ...initialVoucherData,
      }));
    }
  }, [initialVoucherData]);

  useEffect(() => {
    const fontLink = document.createElement("link");
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Prompt:wght@400;700&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);
    return () => {
      document.head.removeChild(fontLink);
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVoucherData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePaymentOptionChange = (option) => {
    setVoucherData((prev) => ({
      ...prev,
      payment_option: prev.payment_option === option ? "" : option,
    }));
  };

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  const handleSaveVoucher = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        ...voucherData,
        booking_id: null,
        booking_type: "accommodation",
        accommodation_pax: voucherData.accommodation_pax
          ? parseInt(voucherData.accommodation_pax) || null
          : null,
        accommodation_night: voucherData.accommodation_night
          ? parseInt(voucherData.accommodation_night) || null
          : null,
        accommodation_price: null,
        accommodation_confirmation_no:
          voucherData.accommodation_confirmation_no || null,
        accommodation_confirmation_code:
          voucherData.accommodation_confirmation_code || null,
        payment_amount: voucherData.payment_amount
          ? parseFloat(voucherData.payment_amount) || null
          : null,
        accommodation_check_in: voucherData.accommodation_check_in || null,
        accommodation_check_out: voucherData.accommodation_check_out || null,
      };
      await onSave(payload);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4 font-Prompt max-w-[1000px] mx-auto">
      <div className="flex justify-center gap-4 mb-4 print:hidden">
        <button
          className={`px-4 py-2 bg-purple-600 text-white rounded-md flex items-center ${
            isSaving ? "opacity-50 cursor-not-allowed" : "hover:bg-purple-700"
          } font-Prompt text-sm`}
          onClick={handleSaveVoucher}
          disabled={isSaving}
        >
          <Check size={16} className="mr-1" />
          {isSaving ? "กำลังบันทึก..." : "บันทึก Voucher"}
        </button>
        <CaptureButtons
          targetRef={printRef}
          filename={`voucher_${voucherData.year_number}_${
            voucherData.sequence_number
          }${
            voucherData.customer_name
              ? `_${voucherData.customer_name.replace(/\s+/g, "_")}`
              : ""
          }`}
          size="sm"
          context="home"
          primaryButton="copy"
          showDownload={true}
          showCopy={true}
        />
      </div>

      <div
        ref={printRef}
        className="border border-gray-300 rounded-lg p-4 bg-white font-Prompt"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
          minHeight: "100%",
          overflow: "visible",
          width: "100%",
          fontFamily: "Prompt, sans-serif",
          lineHeight: "1.2",
        }}
      >
        <div className="flex flex-col sm:flex-row justify-between mb-4">
          <div className="flex items-center mb-2 sm:mb-0">
            <img
              src="../../assets/Final Logo.png"
              alt="INDO Smile Logo"
              className="h-12 mr-3"
              onError={(e) => (e.target.src = "/fallback-logo.png")}
            />
            <div>
              <h2 className="text-lg font-bold font-Prompt">
                INDO SMILE SOUTH SERVICES CO.,LTD.
              </h2>
              <p className="text-xs font-Prompt">
                199/100 Moo 9, Thepkrasattri Subdistrict, Thalang District,
                Phuket Province 83110
              </p>
              <p className="text-xs font-Prompt">
                095 265 5516, 082 253 6662 | TAT License No. 34/03566
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-start">
            <div className="bg-purple-600 text-white p-1 text-center mb-1">
              <span className="block font-Prompt text-sm">
                เลขที่: {voucherData.year_number || new Date().getFullYear()}
              </span>
            </div>
            <div className="bg-purple-600 text-white p-1 text-center">
              <span className="block font-Prompt text-sm">
                เลขที่: {voucherData.sequence_number || "0001"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
          <div className="mb-2 sm:mb-0 flex-1 w-[60%]">
            <span className="font-Prompt text-sm">Customer's name:</span>
            <VoucherInput
              name="customer_name"
              value={voucherData.customer_name}
              onChange={handleInputChange}
              width="w-full"
              className="font-bold text-xl text-purple-700"
            />
          </div>
          <div className="flex-1 w-[40%]">
            <span className="font-bold font-Prompt text-sm">
              Contact person:
            </span>
            <VoucherInput
              name="contact_person"
              value={voucherData.contact_person}
              onChange={handleInputChange}
              width="w-full"
            />
          </div>
        </div>

        <div className="text-center mb-3">
          <h2 className="text-xl font-extrabold font-Prompt bg-purple-100 py-1">
            Service Order for Accommodation
          </h2>
        </div>

        <div className="border border-gray-300 p-3 mb-4">
          <h3 className="text-base font-bold font-Prompt mb-2">Hotel</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <ServiceItem
                label="Hotel"
                name="accommodation"
                value={voucherData.accommodation}
                onChange={handleInputChange}
              />
              <ServiceItem
                label="Location"
                name="accommodation_at"
                value={voucherData.accommodation_at}
                onChange={handleInputChange}
              />
              <ServiceItem
                label="Room"
                name="accommodation_room"
                value={voucherData.accommodation_room}
                onChange={handleInputChange}
              />
              <div className="flex items-center bg-yellow-100">
                <span className="min-w-[80px] inline-block text-left">
                  Check-in:
                </span>
                <div className="flex-1 flex justify-center">
                  <input
                    type="date"
                    name="accommodation_check_in"
                    value={voucherData.accommodation_check_in || ""}
                    onChange={handleInputChange}
                    className="border-b border-gray-500 focus:outline-none font-Prompt"
                    style={{ textAlign: "center" }}
                  />
                </div>
              </div>
              <div className="flex items-center bg-yellow-100">
                <span className="min-w-[80px] inline-block text-left">
                  Check-out:
                </span>
                <div className="flex-1 flex justify-center">
                  <input
                    type="date"
                    name="accommodation_check_out"
                    value={voucherData.accommodation_check_out || ""}
                    onChange={handleInputChange}
                    className="border-b border-gray-500 focus:outline-none font-Prompt"
                    style={{ textAlign: "center" }}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <ServiceItem
                label="Pax"
                name="accommodation_pax"
                value={voucherData.accommodation_pax}
                onChange={handleInputChange}
              />
              <ServiceItem
                label="Night"
                name="accommodation_night"
                value={voucherData.accommodation_night}
                onChange={handleInputChange}
              />
              <div className="flex items-start mb-3 font-Prompt">
                <span className="min-w-[150px] inline-block text-left">
                  Hotel Confirm No.:
                </span>
                <input
                  type="text"
                  name="accommodation_confirmation_no"
                  value={voucherData.accommodation_confirmation_no || ""}
                  onChange={handleInputChange}
                  className="border-b border-gray-500 focus:outline-none flex-1 text-center font-Prompt"
                />
              </div>
              <div className="flex items-start mb-3 font-Prompt">
                <span className="min-w-[150px] inline-block text-left">
                  Confirmation Code:
                </span>
                <input
                  type="text"
                  name="accommodation_confirmation_code"
                  value={voucherData.accommodation_confirmation_code || ""}
                  onChange={handleInputChange}
                  className="border-b border-gray-500 focus:outline-none flex-1 text-center font-Prompt"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="items-start">
              <div className="flex">
                <input
                  type="checkbox"
                  id="no_payment"
                  name="payment_option"
                  checked={voucherData.payment_option === "no_payment"}
                  onChange={() => handlePaymentOptionChange("no_payment")}
                  className="mr-2 h-4 w-4 mt-1"
                />
                <label htmlFor="no_payment" className="text-xs font-Prompt">
                  ไม่ต้องเก็บเงินใดๆ จากผู้เดินทางอีก <br />
                  The clients do not have to pay any more
                </label>
              </div>
            </div>
            <div className="items-start">
              <div className="flex flex-col">
                <div className="flex">
                  <input
                    type="checkbox"
                    id="pay_at_office"
                    name="payment_option"
                    checked={voucherData.payment_option === "pay_at_office"}
                    onChange={() => handlePaymentOptionChange("pay_at_office")}
                    className="mr-2 h-4 w-4 mt-1"
                  />
                  <label
                    htmlFor="pay_at_office"
                    className="text-xs font-Prompt"
                  >
                    ผู้เดินทางต้องชำระเงิน ก่อนเข้ารับบริการอีกเป็นจำนวนเงิน{" "}
                    <br />
                    The clients are to pay at the referred office. the unpaid
                    amount of
                  </label>
                </div>
                {voucherData.payment_option === "pay_at_office" && (
                  <div className="mt-1 ml-6">
                    <VoucherInput
                      name="payment_amount"
                      value={voucherData.payment_amount}
                      onChange={handleInputChange}
                      placeholder="ระบุจำนวนเงิน / Enter amount"
                      width="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex mb-1">
            <span className="font-bold font-Prompt text-sm">Remark:</span>
            <div className="relative flex-1">
              <input
                type="text"
                name="remark"
                value={voucherData.remark || ""}
                onChange={handleInputChange}
                className="border-b border-gray-500 focus:outline-none w-full text-center font-Prompt whitespace-pre-wrap"
                style={{ textAlign: "center" }}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8 px-16">
          <div className="text-center">
            <VoucherInput
              name="customer_signature"
              value={voucherData.customer_signature}
              onChange={handleInputChange}
              width="w-40"
            />
            <div className="border-t border-gray-500 w-40 mx-auto"></div>
            <p className="font-medium mt-1 font-Prompt text-sm">
              Customer's signature
            </p>
          </div>
          <div className="text-center">
            <VoucherInput
              name="issue_by"
              value={voucherData.issue_by}
              onChange={handleInputChange}
              width="w-40"
            />
            <div className="border-t border-gray-500 w-40 mx-auto"></div>
            <p className="font-medium mt-1 font-Prompt text-sm">Issue by</p>
          </div>
        </div>

        <div className="text-center mt-4 text-xs">
          <p className="font-Prompt">
            *** This voucher-ticket is non refundable and can use on the
            specific date and the time only. ***
          </p>
        </div>
      </div>
    </div>
  );
};

export default HotelVoucherForm;
