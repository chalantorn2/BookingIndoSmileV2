// src/pages/BookingForm.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import supabase from "../config/supabaseClient";
import OrderSelector from "../components/forms/OrderSelector";
import TourForm from "../components/forms/TourForm";
import TransferForm from "../components/forms/TransferForm";
import BookingCounter from "../components/ui/BookingCounter";
import { generateOrderID, generateBookingID } from "../utils/idGenerator";
import { fetchInformationByCategory } from "../services/informationService";
import AutocompleteInput from "../components/common/AutocompleteInput";
import { useInformation } from "../contexts/InformationContext";
import { useNotification } from "../hooks/useNotification";
import { useAlertDialogContext } from "../contexts/AlertDialogContext";

const BookingForm = () => {
  const showAlert = useAlertDialogContext();
  const { showSuccess, showError, showInfo } = useNotification();
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [currentOrderKey, setCurrentOrderKey] = useState(null);
  const [isBookingSectionVisible, setIsBookingSectionVisible] = useState(false);
  const [tourForms, setTourForms] = useState([]);
  const [transferForms, setTransferForms] = useState([]);
  const { agents, addNewInformation, refreshInformation } = useInformation();
  const [isCreatingNewOrder, setIsCreatingNewOrder] = useState(false);
  const [mainFormData, setMainFormData] = useState({
    agent: "",
    firstName: "",
    lastName: "",
    paxAdt: "0",
    paxChd: "0",
    paxInf: "0",
  });

  const [status, setStatus] = useState({
    loading: false,
    message: "",
    error: "",
  });
  const [bookingCounts, setBookingCounts] = useState(null);
  const orderSelectorRef = useRef(null);

  const handleOrderSelect = (orderKey, orderId, counts, orderData) => {
    if (orderKey) {
      setCurrentOrderKey(orderKey);
      setCurrentOrderId(orderId);
      setBookingCounts(counts);
      setIsBookingSectionVisible(true);
      setIsCreatingNewOrder(false);
      if (orderData) {
        // ถ้ามีข้อมูล pax แบบเก่า แปลงเป็นรูปแบบใหม่
        const paxTotal = orderData.pax || "0";
        setMainFormData({
          agent: orderData.agent_name || "",
          firstName: orderData.first_name || "",
          lastName: orderData.last_name || "",
          paxAdt: paxTotal, // เริ่มต้นให้ค่า pax เดิมอยู่ในช่อง ADT
          paxChd: "0",
          paxInf: "0",
        });
      } else {
        loadOrderBasicDetails(orderKey);
      }
    } else {
      resetForm();
      setCurrentOrderKey(null);
      setCurrentOrderId(null);
      setIsBookingSectionVisible(false);
      setIsCreatingNewOrder(false);
      setBookingCounts(null);
    }
  };

  const formDataRef = useRef(mainFormData);
  useEffect(() => {
    formDataRef.current = mainFormData;
  }, [mainFormData]);

  const handleAgentChange = useCallback((value) => {
    setMainFormData((prev) => ({
      ...prev,
      agent: value,
    }));
  }, []);

  const handleCreateNewOrder = () => {
    resetForm();
    setCurrentOrderKey(null);
    setCurrentOrderId(null);
    setIsBookingSectionVisible(true);
    setIsCreatingNewOrder(true);
  };

  const handleAddNewAgent = async (value) => {
    try {
      const { data, error } = await supabase
        .from("information")
        .insert({
          category: "agent",
          value: value.trim(),
          description: "",
          phone: "", // เพิ่มฟิลด์ phone
          active: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error adding new agent:", error);
      return null;
    }
  };

  const processOrderData = (orderData) => {
    // แปลงค่า pax เดิมเป็นรูปแบบใหม่ (ให้ค่าเดิมเป็น ADT)
    const paxTotal = orderData.pax || "0";

    setMainFormData({
      agent: orderData.agent_name || "",
      firstName: orderData.first_name || "",
      lastName: orderData.last_name || "",
      paxAdt: orderData.pax_adt?.toString() || "0", // ✅ ถูก
      paxChd: orderData.pax_chd?.toString() || "0", // ✅ ถูก
      paxInf: orderData.pax_inf?.toString() || "0", // ✅ ถูก
    });

    if (orderData.tour_bookings && orderData.tour_bookings.length > 0) {
      const formattedTours = orderData.tour_bookings.map((tour, index) => ({
        id: index + 1,
        data: tour,
      }));
      setTourForms(formattedTours);
    } else {
      setTourForms([]);
    }

    if (orderData.transfer_bookings && orderData.transfer_bookings.length > 0) {
      const formattedTransfers = orderData.transfer_bookings.map(
        (transfer, index) => ({
          id: index + 1,
          data: transfer,
        })
      );
      setTransferForms(formattedTransfers);
    } else {
      setTransferForms([]);
    }
  };

  const loadOrderBasicDetails = async (orderKey) => {
    try {
      setStatus({ ...status, loading: true, error: "" });
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderKey)
        .single();
      if (error) throw error;

      // แปลงค่า pax เดิมเป็นรูปแบบใหม่
      const paxTotal = data.pax || "0";

      setMainFormData({
        agent: data.agent_name || "",
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        paxAdt: data.pax_adt?.toString() || "0", // ✅ ถูก
        paxChd: data.pax_chd?.toString() || "0", // ✅ ถูก
        paxInf: data.pax_inf?.toString() || "0", // ✅ ถูก
      });

      setTourForms([]);
      setTransferForms([]);
    } catch (error) {
      console.error("Error loading order details:", error);
      setStatus({ ...status, error: "ไม่สามารถโหลดข้อมูล Order ได้" });
    } finally {
      setStatus({ ...status, loading: false });
    }
  };

  const resetForm = () => {
    setMainFormData({
      agent: "",
      firstName: "",
      lastName: "",
      paxAdt: "0",
      paxChd: "0",
      paxInf: "0",
    });
    setTourForms([]);
    setTransferForms([]);
    setStatus({ loading: false, message: "", error: "" });
    setCurrentOrderKey(null);
    setCurrentOrderId(null);
    setIsCreatingNewOrder(false);
    setBookingCounts(null);
  };

  const handleAddTourForm = () => {
    const nextId =
      tourForms.length > 0
        ? Math.max(...tourForms.map((form) => form.id)) + 1
        : 1;
    setTourForms([...tourForms, { id: nextId }]);
  };

  const handleAddTransferForm = () => {
    const nextId =
      transferForms.length > 0
        ? Math.max(...transferForms.map((form) => form.id)) + 1
        : 1;
    setTransferForms([...transferForms, { id: nextId }]);
  };

  const handleRemoveTourForm = useCallback((id) => {
    setTourForms((prev) => prev.filter((form) => form.id !== id));
  }, []);

  const handleRemoveTransferForm = useCallback((id) => {
    setTransferForms((prev) => prev.filter((form) => form.id !== id));
  }, []);

  const tourFormsRef = useRef(tourForms);
  const transferFormsRef = useRef(transferForms);
  useEffect(() => {
    tourFormsRef.current = tourForms;
  }, [tourForms]);
  useEffect(() => {
    transferFormsRef.current = transferForms;
  }, [transferForms]);

  const handleMainFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setMainFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, message: "", error: "" });

    try {
      console.log("Starting submit with data:", {
        mainFormData,
        tourForms,
        transferForms,
      });

      if (!mainFormData.agent) {
        throw new Error(
          "กรุณากรอก Agent ก่อน เพื่อใช้เป็น prefix ของ Order ID"
        );
      }
      if (tourForms.length === 0 && transferForms.length === 0) {
        throw new Error(
          "กรุณาเพิ่มการจอง Tour หรือ Transfer อย่างน้อย 1 รายการ"
        );
      }

      // คำนวณค่า pax รวมจากค่า ADT, CHD, INF
      const totalPax =
        (parseInt(mainFormData.paxAdt) || 0) +
        (parseInt(mainFormData.paxChd) || 0) +
        (parseInt(mainFormData.paxInf) || 0);

      let referenceId = currentOrderId;
      let orderKey = currentOrderKey;

      // เพิ่มการหา agentId ก่อนใช้งาน
      const findAgentId = (agentName) => {
        const agent = agents.find((agent) => agent.value === agentName);
        return agent ? agent.id : null;
      };

      // ประกาศตัวแปร agentId
      const agentId = findAgentId(mainFormData.agent);

      if (!orderKey) {
        referenceId = await generateOrderID(mainFormData.agent);
        const { data: newOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            first_name: mainFormData.firstName,
            last_name: mainFormData.lastName,
            agent_name: mainFormData.agent,
            agent_id: agentId, // ✅ ตอนนี้ agentId ถูกประกาศแล้ว
            reference_id: referenceId,
            pax: totalPax.toString(),
            pax_adt: parseInt(mainFormData.paxAdt) || 0,
            pax_chd: parseInt(mainFormData.paxChd) || 0,
            pax_inf: parseInt(mainFormData.paxInf) || 0,
          })
          .select()
          .single();

        if (orderError) throw orderError;
        if (!newOrder) throw new Error("ไม่สามารถสร้าง Order ใหม่ได้");

        orderKey = newOrder.id;
        console.log("Order created with ID:", orderKey);
      } else {
        // อัพเดท order ที่มีอยู่แล้ว
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            first_name: mainFormData.firstName,
            last_name: mainFormData.lastName,
            agent_name: mainFormData.agent,
            agent_id: agentId, // ✅ ใช้ agentId ที่ประกาศแล้ว
            pax: totalPax.toString(),
            pax_adt: parseInt(mainFormData.paxAdt) || 0,
            pax_chd: parseInt(mainFormData.paxChd) || 0,
            pax_inf: parseInt(mainFormData.paxInf) || 0,
          })
          .eq("id", orderKey);

        if (updateError) throw updateError;
      }
      console.log("orderKey after processing:", orderKey, typeof orderKey);

      const { data: existingTours, error: tourError } = await supabase
        .from("tour_bookings")
        .select("tour_date")
        .eq("order_id", orderKey);
      if (tourError) throw tourError;

      const { data: existingTransfers, error: transferError } = await supabase
        .from("transfer_bookings")
        .select("transfer_date")
        .eq("order_id", orderKey);
      if (transferError) throw transferError;

      const allDates = [
        ...(existingTours?.map((t) => t.tour_date) || []),
        ...(existingTransfers?.map((t) => t.transfer_date) || []),
      ];

      const formElements = document.forms[0].elements;
      console.log(
        "Form elements:",
        Array.from(formElements).map((e) => ({ name: e.name, value: e.value }))
      );

      const tourBookings = [];
      for (const tourForm of tourForms) {
        const formId = tourForm.id;
        const bookingId = await generateBookingID("tour");
        const tourDateElement = formElements[`tour_${formId}_date`];
        const tourDate = tourDateElement ? tourDateElement.value : "";
        if (!tourDate) {
          throw new Error(`Tour ${formId} ต้องระบุวันที่`);
        }
        if (tourDate) allDates.push(tourDate);

        const tourBooking = {
          order_id: Number(orderKey),
          tour_date: tourDate,
          reference_id: bookingId,
          status: "pending",
          pax: totalPax, // ยังคงเก็บ pax รวมไว้
          pax_adt: parseInt(mainFormData.paxAdt) || 0, // เพิ่มคอลัมน์ใหม่
          pax_chd: parseInt(mainFormData.paxChd) || 0, // เพิ่มคอลัมน์ใหม่
          pax_inf: parseInt(mainFormData.paxInf) || 0, // เพิ่มคอลัมน์ใหม่
        };

        const detailElement = formElements[`tour_${formId}_detail`];
        if (detailElement) tourBooking.tour_detail = detailElement.value;
        const noteElement = formElements[`tour_${formId}_note`];
        if (noteElement) tourBooking.note = noteElement.value;
        const typeElement = formElements[`tour_${formId}_type`];
        if (typeElement) tourBooking.tour_type = typeElement.value;
        const hotelElement = formElements[`tour_${formId}_hotel`];
        if (hotelElement) tourBooking.tour_hotel = hotelElement.value;
        const roomNoElement = formElements[`tour_${formId}_room_no`];
        if (roomNoElement) tourBooking.tour_room_no = roomNoElement.value;
        const pickupTimeElement = formElements[`tour_${formId}_pickup_time`];
        if (pickupTimeElement)
          tourBooking.tour_pickup_time = pickupTimeElement.value;
        const contactNoElement = formElements[`tour_${formId}_contact_no`];
        if (contactNoElement)
          tourBooking.tour_contact_no = contactNoElement.value;
        const sendToElement = formElements[`tour_${formId}_send_to`];
        if (sendToElement) tourBooking.send_to = sendToElement.value;

        tourBookings.push(tourBooking);
      }

      const transferBookings = [];
      for (const transferForm of transferForms) {
        const formId = transferForm.id;
        const bookingId = await generateBookingID("transfer");
        const transferDateElement = formElements[`transfer_${formId}_date`];
        const transferDate = transferDateElement
          ? transferDateElement.value
          : "";
        if (!transferDate) {
          throw new Error(`Transfer ${formId} ต้องระบุวันที่`);
        }
        if (transferDate) allDates.push(transferDate);

        const transferBooking = {
          order_id: Number(orderKey),
          transfer_date: transferDate,
          status: "pending",
          reference_id: bookingId,
          pax: totalPax, // ยังคงเก็บ pax รวมไว้
          pax_adt: parseInt(mainFormData.paxAdt) || 0, // เพิ่มคอลัมน์ใหม่
          pax_chd: parseInt(mainFormData.paxChd) || 0, // เพิ่มคอลัมน์ใหม่
          pax_inf: parseInt(mainFormData.paxInf) || 0, // เพิ่มคอลัมน์ใหม่
        };

        const timeElement = formElements[`transfer_${formId}_pickup_time`];
        if (timeElement) transferBooking.transfer_time = timeElement.value;
        const pickupLocationElement =
          formElements[`transfer_${formId}_pickup_location`];
        if (pickupLocationElement)
          transferBooking.pickup_location = pickupLocationElement.value;
        const dropLocationElement =
          formElements[`transfer_${formId}_drop_location`];
        if (dropLocationElement)
          transferBooking.drop_location = dropLocationElement.value;
        const detailElement = formElements[`transfer_${formId}_detail`];
        if (detailElement)
          transferBooking.transfer_detail = detailElement.value;
        const typeElement = formElements[`transfer_${formId}_type`];
        if (typeElement) transferBooking.transfer_type = typeElement.value;
        const sendToElement = formElements[`transfer_${formId}_send_to`];
        if (sendToElement) transferBooking.send_to = sendToElement.value;
        const flightElement = formElements[`transfer_${formId}_flight`];
        if (flightElement)
          transferBooking.transfer_flight = flightElement.value;
        const ftimeElement = formElements[`transfer_${formId}_ftime`];
        if (ftimeElement) transferBooking.transfer_ftime = ftimeElement.value;
        const carModelElement = formElements[`transfer_${formId}_car_model`];
        if (carModelElement) transferBooking.car_model = carModelElement.value;
        const phoneNumberElement =
          formElements[`transfer_${formId}_phone_number`];
        if (phoneNumberElement)
          transferBooking.phone_number = phoneNumberElement.value;
        const noteElement = formElements[`transfer_${formId}_note`];
        if (noteElement) transferBooking.note = noteElement.value;

        transferBookings.push(transferBooking);
      }
      console.log("Current orderKey:", orderKey);
      console.log("Tour bookings data:", tourBookings);
      console.log("Transfer bookings data:", transferBookings);

      if (tourBookings.length > 0) {
        const { error: tourError } = await supabase
          .from("tour_bookings")
          .insert(tourBookings);
        if (tourError) throw tourError;
      }

      if (transferBookings.length > 0) {
        const { error: transferError } = await supabase
          .from("transfer_bookings")
          .insert(transferBookings);
        if (transferError) throw transferError;
      }

      if (allDates.length > 0) {
        allDates.sort();
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            start_date: allDates[0],
            end_date: allDates[allDates.length - 1],
          })
          .eq("id", orderKey);
        if (updateError) throw updateError;
      }

      showSuccess(
        `บันทึกข้อมูลสำเร็จ! Tour: ${tourBookings.length}, Transfer: ${transferBookings.length}`
      );
      setStatus({ loading: false, error: "" });
      console.log("Submit success, message set: ");

      setTimeout(() => {
        resetForm();
        setIsBookingSectionVisible(false);
        if (orderSelectorRef.current) {
          orderSelectorRef.current.refreshOrders();
        }
      }, 2000);
    } catch (error) {
      console.error("Submit error:", error.message, error);
      setStatus({
        loading: false,
        message: "",
        error: `เกิดข้อผิดพลาด: ${error.message}`,
      });
    }
  };

  const handleCancelCreateOrder = async () => {
    setIsCreatingNewOrder(false);
    if (
      mainFormData.firstName ||
      mainFormData.lastName ||
      mainFormData.agent ||
      mainFormData.paxAdt !== "0" ||
      mainFormData.paxChd !== "0" ||
      mainFormData.paxInf !== "0"
    ) {
      const confirmed = await showAlert({
        title: "ยืนยันการยกเลิก",
        description:
          "คุณต้องการยกเลิกการสร้าง Order ใหม่ใช่หรือไม่? ข้อมูลที่กรอกจะหายไป",
        confirmText: "ยกเลิก",
        cancelText: "กลับไปกรอกข้อมูลต่อ",
        actionVariant: "destructive",
      });

      if (confirmed) {
        resetForm();
        setIsBookingSectionVisible(false);
      } else {
        // กลับไปกรอกข้อมูลต่อ
        setIsCreatingNewOrder(true);
      }
    } else {
      resetForm();
      setIsBookingSectionVisible(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50 min-h-screen">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          เพิ่มรายการจอง
        </h1>
        <p className="text-gray-600 mb-4">
          กรุณาเลือกฟอร์มที่ต้องการกรอก หรือสร้างรายการจองใหม่
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-bold text-center mb-4">เลือก Order</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <div className="w-full md:w-2/3">
            <OrderSelector
              ref={orderSelectorRef}
              onOrderSelect={handleOrderSelect}
              onCreateNewOrder={handleCreateNewOrder}
              isCreatingNewOrder={isCreatingNewOrder}
              selectedOrderId={currentOrderId}
              onCancelCreate={handleCancelCreateOrder}
            />
          </div>
        </div>
      </div>

      {isBookingSectionVisible && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8 transition-all duration-300">
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-4 text-center">
            <h2 className="text-xl font-semibold">ข้อมูลหลักของ Booking</h2>
            {currentOrderId && (
              <p className="text-gray-200 text-sm mt-1">
                Order ID: {currentOrderId}
              </p>
            )}
          </div>

          {bookingCounts && (
            <div className="bg-gray-100 p-3 border-b border-gray-200">
              <p className="text-center text-gray-700">
                Order นี้มี{" "}
                <span className="font-bold text-green-600">
                  {bookingCounts.tourCount} ทัวร์
                </span>{" "}
                และ
                <span className="font-bold text-blue-600">
                  {" "}
                  {bookingCounts.transferCount} รถรับส่ง
                </span>{" "}
                อยู่แล้ว
              </p>
            </div>
          )}
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="col-span-2">
                  <label
                    htmlFor="agent"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Agent <span className="text-red-500">*</span>
                  </label>
                  <AutocompleteInput
                    options={agents}
                    value={mainFormData.agent}
                    onChange={handleAgentChange}
                    placeholder="เลือกหรือพิมพ์ชื่อ Agent"
                    onAddNew={handleAddNewAgent}
                    name="agent"
                    id="agent"
                  />
                </div>
                <div className="col-span-1 ">
                  <label
                    htmlFor="paxAdt"
                    className="block  text-sm font-medium text-gray-700 mb-1"
                  >
                    Adult (ADT) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="paxAdt"
                    name="paxAdt"
                    value={mainFormData.paxAdt}
                    onChange={handleMainFormChange}
                    className="w-full border p-2 rounded-md border-gray-300 text-right shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    placeholder="จำนวนผู้ใหญ่"
                    min="0"
                    required
                  />
                </div>
                <div className="col-span-1">
                  <label
                    htmlFor="paxChd"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Child (CHD)
                  </label>
                  <input
                    type="number"
                    id="paxChd"
                    name="paxChd"
                    value={mainFormData.paxChd}
                    onChange={handleMainFormChange}
                    className="w-full border p-2 rounded-md border-gray-300 text-right shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    placeholder="จำนวนเด็ก"
                    min="0"
                  />
                </div>
                <div className="col-span-1">
                  <label
                    htmlFor="paxInf"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Infant (INF)
                  </label>
                  <input
                    type="number"
                    id="paxInf"
                    name="paxInf"
                    value={mainFormData.paxInf}
                    onChange={handleMainFormChange}
                    className="w-full border p-2 rounded-md border-gray-300 text-right shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    placeholder="จำนวนทารก"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 ">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={mainFormData.firstName}
                    onChange={handleMainFormChange}
                    className="w-full border p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    placeholder="ชื่อลูกค้า"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={mainFormData.lastName}
                    onChange={handleMainFormChange}
                    className="w-full border p-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    placeholder="นามสกุลลูกค้า"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <button
                  type="button"
                  onClick={handleAddTourForm}
                  className="px-6 py-2 border-2 border-green-500 text-green-600 font-medium rounded-md hover:bg-green-500 hover:text-white transition flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  เพิ่มทัวร์
                </button>

                <button
                  type="button"
                  onClick={handleAddTransferForm}
                  className="px-6 py-2 border-2 border-blue-500 text-blue-600 font-medium rounded-md hover:bg-blue-500 hover:text-white transition flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  เพิ่มรถรับส่ง
                </button>
              </div>

              {(tourForms.length > 0 || transferForms.length > 0) && (
                <>
                  <BookingCounter
                    tourCount={tourForms.length}
                    transferCount={transferForms.length}
                  />

                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {tourForms.map((form) => (
                        <TourForm
                          key={form.id}
                          id={form.id}
                          data={form.data}
                          onRemove={handleRemoveTourForm}
                          paxAdt={mainFormData.paxAdt}
                          paxChd={mainFormData.paxChd}
                          paxInf={mainFormData.paxInf}
                        />
                      ))}
                    </div>

                    <div className="space-y-4">
                      {transferForms.map((form) => (
                        <TransferForm
                          key={form.id}
                          id={form.id}
                          data={form.data}
                          onRemove={handleRemoveTransferForm}
                          paxAdt={mainFormData.paxAdt}
                          paxChd={mainFormData.paxChd}
                          paxInf={mainFormData.paxInf}
                        />
                      ))}
                    </div>
                  </div>
                  {status.message && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded my-4 shadow-sm">
                      <p style={{ whiteSpace: "pre-line" }}>{status.message}</p>
                    </div>
                  )}

                  {status.error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded my-4 shadow-sm">
                      <p>{status.error}</p>
                    </div>
                  )}

                  <div className="text-center mt-8">
                    <button
                      type="submit"
                      disabled={status.loading}
                      className="px-8 py-3 bg-yellow-500 text-white font-medium rounded-md hover:bg-yellow-600 transition disabled:opacity-50 shadow-md"
                    >
                      {status.loading ? (
                        <div className="flex items-center gap-2">
                          <svg
                            className="animate-spin h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          กำลังบันทึก...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          บันทึกข้อมูล
                        </div>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingForm;
