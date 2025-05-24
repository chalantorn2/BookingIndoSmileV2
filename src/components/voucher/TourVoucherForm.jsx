import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ServiceItem, VoucherInput } from "./VoucherForm";
import { Check } from "lucide-react";
import CaptureButtons from "../common/CaptureButtons";

const TourVoucherForm = ({
  booking,
  voucherData: initialVoucherData,
  onSave,
}) => {
  const printRef = React.useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [voucherData, setVoucherData] = useState({
    customer_name: "",
    contact_person: "",
    tour_name: "",
    tour_detail: "",
    tour_pax: "",
    tour_by: "",
    tour_date: "",
    tour_pickup_at: "",
    tour_pickup_time: "",
    payment_option: "",
    payment_amount: "",
    remark: "",
    issue_by: "",
    customer_signature: "",
    year_number: new Date().getFullYear().toString(),
    sequence_number: "0001",
    ...(initialVoucherData || {}),
  });

  const formatPax = (paxData) => {
    const paxAdt = parseInt(paxData.pax_adt || 0);
    const paxChd = parseInt(paxData.pax_chd || 0);
    const paxInf = parseInt(paxData.pax_inf || 0);

    if (paxAdt === 0 && paxChd === 0 && paxInf === 0) return "0";

    let paxString = [];
    if (paxAdt > 0) paxString.push(paxAdt.toString());
    if (paxChd > 0) paxString.push(paxChd.toString());
    if (paxInf > 0) paxString.push(paxInf.toString());

    return paxString.join("+");
  };

  useEffect(() => {
    if (booking && initialVoucherData) {
      const customerName = booking.orders
        ? `${booking.orders.first_name || ""} ${
            booking.orders.last_name || ""
          }`.trim()
        : "";
      setVoucherData((prev) => ({
        ...prev,
        customer_name: customerName,
        tour_name: booking.tour_type || "",
        tour_detail: booking.tour_detail || "",
        tour_pax: formatPax(booking), // ใช้ฟังก์ชัน formatPax ที่เราสร้างขึ้น
        tour_date: booking.tour_date
          ? format(new Date(booking.tour_date), "dd/MM/yyyy")
          : "",
        tour_pickup_at: booking.tour_hotel || "",
        tour_pickup_time: booking.tour_pickup_time || "",
        ...(initialVoucherData || {}),
      }));
    }
  }, [booking, initialVoucherData]);

  useEffect(() => {
    const img = new Image();
    img.src = "../../assets/Tour and Ticket 5.png";
    img.onload = () => setImageLoaded(true);
    img.onerror = () => {
      console.error("Failed to load logo image");
      setImageLoaded(true);
    };

    const fontLink = document.createElement("link");
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Kanit:wght@400;700&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);
    setFontLoaded(true);

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

  const handleSaveVoucher = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave({
        ...voucherData,
        booking_id: booking.id,
        booking_type: "tour",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4 font-kanit max-w-[1000px] mx-auto">
      <div className="flex justify-center gap-4 mb-4 print:hidden">
        <button
          className={`px-4 py-2 bg-green-600 text-white rounded-md flex items-center ${
            isSaving ? "opacity-50 cursor-not-allowed" : "hover:bg-green-700"
          } font-kanit text-sm`}
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
        className="border border-gray-300 rounded-lg p-4 bg-white font-kanit"
        style={{
          pageBreakInside: "avoid",
          breakInside: "avoid",
          minHeight: "100%",
          overflow: "visible",
          width: "100%",
          fontFamily: "Kanit, sans-serif",
          lineHeight: "1.2",
        }}
      >
        <div className="flex flex-col sm:flex-row justify-between mb-4">
          <div className="flex items-center mb-2 sm:mb-0">
            <img
              src="../../assets/Tour and Ticket 5.png"
              alt="SevenSmile Logo"
              className="h-12 mr-3"
              onError={(e) => (e.target.src = "/fallback-logo.png")}
            />
            <div>
              <h2 className="text-lg font-bold font-kanit">
                Seven Smile Tour And Ticket
              </h2>
              <p className="text-xs font-kanit">
                33 Maharat Road, Soi 8, Pak Nam Sub-district, Mueang Krabi
                District, Krabi 81000, Thailand
              </p>
              <p className="text-xs font-kanit">
                095 265 5516, 083 969 1300 | TAT License No. 31/00878
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-start">
            <div className="bg-green-600 text-white p-1 text-center mb-1">
              <span className="block font-kanit text-sm">
                เลขที่: {voucherData.year_number || new Date().getFullYear()}
              </span>
            </div>
            <div className="bg-green-600 text-white p-1 text-center">
              <span className="block font-kanit text-sm">
                เลขที่: {voucherData.sequence_number || "0001"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
          <div className="mb-2 sm:mb-0 flex-1 w-[60%]">
            <span className=" font-kanit text-sm ">Customer's name:</span>
            <VoucherInput
              name="customer_name"
              value={voucherData.customer_name}
              onChange={handleInputChange}
              width="w-full"
              className="font-bold text-xl text-green-700"
            />
          </div>
          <div className="flex-1 w-[40%]">
            <span className="font-bold font-kanit text-sm">
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
          <h2 className="text-xl font-extrabold font-kanit bg-green-100 py-1">
            Service Order for Tour
          </h2>
        </div>

        <div className="border border-gray-300 p-3 mb-4">
          <h3 className="text-base font-bold font-kanit mb-2">Tour</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <ServiceItem
                label="Tour"
                name="tour_name"
                value={voucherData.tour_name}
                onChange={handleInputChange}
              />
              <div className="flex items-start">
                <span className="min-w-[80px] inline-block text-left">
                  Detail:
                </span>
                <div className="relative flex-1">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => {
                      const newValue = e.currentTarget.textContent;
                      setVoucherData((prev) => ({
                        ...prev,
                        tour_detail: newValue,
                      }));
                    }}
                    className="focus:outline-none w-full text-center font-kanit whitespace-pre-wrap min-h-[1.2em] py-0"
                    style={{ textAlign: "center", lineHeight: "1.2" }}
                  >
                    {voucherData.tour_detail || ""}
                  </div>
                  <div className="border-b border-gray-500 mt-0"></div>
                </div>
              </div>
              <div className="flex items-center bg-yellow-200">
                <span className="min-w-[80px] inline-block text-left">
                  Pick up time:
                </span>
                <div className="relative flex-1">
                  <input
                    type="text"
                    name="tour_pickup_time"
                    value={voucherData.tour_pickup_time || ""}
                    onChange={handleInputChange}
                    className="border-b border-gray-500 focus:outline-none w-full text-center font-kanit whitespace-pre-wrap"
                    style={{ textAlign: "center" }}
                  />
                </div>
              </div>
              <div className="bg-yellow-100">
                <ServiceItem
                  label="Pick up at"
                  name="tour_pickup_at"
                  value={voucherData.tour_pickup_at}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <ServiceItem
                label="By"
                name="tour_by"
                value={voucherData.tour_by}
                onChange={handleInputChange}
              />
              <ServiceItem
                label="Pax"
                name="tour_pax"
                value={voucherData.tour_pax}
                onChange={handleInputChange}
              />
              <ServiceItem
                label="Date"
                name="tour_date"
                value={voucherData.tour_date}
                onChange={handleInputChange}
              />
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
                <label htmlFor="no_payment" className="text-sm font-kanit">
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
                  <label htmlFor="pay_at_office" className="text-sm font-kanit">
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
            <span className="font-bold font-kanit text-sm">Remark:</span>
            <div className="relative flex-1">
              <input
                type="text"
                name="remark"
                value={voucherData.remark || ""}
                onChange={handleInputChange}
                className="border-b border-gray-500 focus:outline-none w-full text-center font-kanit whitespace-pre-wrap"
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
            <p className="font-medium mt-1 font-kanit text-sm">
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
            <p className="font-medium mt-1 font-kanit text-sm">Issue by</p>
          </div>
        </div>

        <div className="text-center mt-4 text-xs">
          <p className="font-kanit">
            *** This voucher-ticket is non refundable and can use on the
            specific date and the time only. ***
          </p>
        </div>
      </div>
    </div>
  );
};

export default TourVoucherForm;
