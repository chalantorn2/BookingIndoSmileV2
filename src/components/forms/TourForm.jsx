import React, { useState, useEffect } from "react";
import { useInformation } from "../../contexts/InformationContext";
import AutocompleteInput from "../common/AutocompleteInput";

const TourForm = ({
  id,
  onRemove,
  data,
  paxAdt = "0",
  paxChd = "0",
  paxInf = "0",
}) => {
  // ลบการใช้ useForm ที่อาจเป็นสาเหตุของปัญหา
  const [formData, setFormData] = useState({});

  // ใช้ context แทนการเรียก API โดยตรง
  const { tourTypes, tourRecipients, places, addNewInformation, loading } =
    useInformation();

  useEffect(() => {
    // ตั้งค่าข้อมูลเริ่มต้น
    if (data) {
      setFormData({
        tour_date: data.tour_date || "",
        tour_detail: data.tour_detail || "",
        tour_pickup_time: data.tour_pickup_time || "",
        tour_hotel: data.tour_hotel || "",
        tour_room_no: data.tour_room_no || "",
        tour_contact_no: data.tour_contact_no || "",
        send_to: data.send_to || "",
        tour_type: data.tour_type || "",
        note: data.note || "", // เพิ่มบรรทัดนี้
      });
    }
  }, [data]);

  useEffect(() => {
    // ตรวจสอบข้อมูล places ทั้งหมด
    console.log("ALL Places:", places);

    // ตรวจสอบเฉพาะข้อมูลที่ใช้
    const filteredHotels = places.filter(
      (place) =>
        place.description === "hotel" || place.description === "จาก hotel"
    );
    console.log("Filtered Hotels:", filteredHotels);

    // ตรวจสอบว่ามีข้อมูลหรือไม่
    if (filteredHotels.length === 0) {
      console.warn("No hotels found in places data!");
    }
  }, [places]);

  const handleValueChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const InputField = ({
    label,
    name,
    type = "text",
    required,
    placeholder,
    value,
    onChange,
  }) => (
    <div>
      <label
        className="block text-sm font-medium text-gray-700 mb-1"
        htmlFor={name}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        id={name}
        placeholder={placeholder}
        defaultValue={value || ""}
        onBlur={onChange ? (e) => onChange(e.target.value) : undefined}
        className="w-full border p-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
        required={required}
      />
    </div>
  );

  const TextAreaField = ({ label, name, placeholder, value, onChange }) => (
    <div>
      <label
        className="block text-sm font-medium text-gray-700 mb-1"
        htmlFor={name}
      >
        {label}
      </label>
      <textarea
        name={name}
        id={name}
        defaultValue={value || ""}
        onBlur={onChange ? (e) => onChange(e.target.value) : undefined}
        className="w-full border p-2 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50"
        rows="3"
        placeholder={placeholder}
      ></textarea>
    </div>
  );

  // ฟังก์ชันเพิ่มข้อมูลใหม่
  const handleAddNewTourType = async (newValue) => {
    try {
      const result = await addNewInformation("tour_type", newValue);
      return result;
    } catch (error) {
      console.error("Error adding new tour type:", error);
      return null;
    }
  };

  const handleAddNewHotel = async (newValue) => {
    try {
      const result = await addNewInformation("place", newValue, "hotel");
      return result;
    } catch (error) {
      console.error("Error adding new hotel:", error);
      return null;
    }
  };

  const handleAddNewRecipient = async (newValue) => {
    try {
      const result = await addNewInformation("tour_recipient", newValue);
      return result;
    } catch (error) {
      console.error("Error adding new recipient:", error);
      return null;
    }
  };

  const fieldNamePrefix = `tour_${id}_`;

  // คำนวณจำนวน pax รวม
  const totalPax = parseInt(paxAdt) + parseInt(paxChd) + parseInt(paxInf);

  return (
    <div
      className="bg-white rounded-lg shadow-md border border-green-300 hover:shadow-lg transition-all duration-300"
      id={`tour-${id}`}
    >
      <div className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-2 flex justify-between items-center">
        <h3 className="text-lg font-medium">Tour Booking #{id}</h3>
        <button
          type="button"
          onClick={() => onRemove(id)}
          className="bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded text-sm"
        >
          ลบ
        </button>
      </div>

      <div className="p-4 grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ประเภท
            </label>
            <AutocompleteInput
              options={tourTypes}
              value={formData.tour_type || ""}
              onChange={(value) => handleValueChange("tour_type", value)}
              placeholder="เลือกหรือพิมพ์ประเภททัวร์"
              onAddNew={handleAddNewTourType}
              name={`${fieldNamePrefix}type`}
              id={`${fieldNamePrefix}type`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ส่งใคร
            </label>
            <AutocompleteInput
              options={tourRecipients}
              value={formData.send_to || ""}
              onChange={(value) => handleValueChange("send_to", value)}
              placeholder="เลือกหรือพิมพ์ผู้รับ"
              onAddNew={handleAddNewRecipient}
              name={`${fieldNamePrefix}send_to`}
              id={`${fieldNamePrefix}send_to`}
            />
          </div>
        </div>

        <TextAreaField
          label="รายละเอียด"
          name={`${fieldNamePrefix}detail`}
          value={formData.tour_detail}
          onChange={(value) => handleValueChange("tour_detail", value)}
          placeholder="รายละเอียดเพิ่มเติม"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InputField
            label="เวลารับ"
            name={`${fieldNamePrefix}pickup_time`}
            value={formData.tour_pickup_time}
            onChange={(value) => handleValueChange("tour_pickup_time", value)}
            placeholder="เวลารับ"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              โรงแรม
            </label>
            <AutocompleteInput
              options={places} // ใช้ places ทั้งหมดไม่ต้องกรอง
              value={formData.tour_hotel || ""}
              onChange={(value) => handleValueChange("tour_hotel", value)}
              placeholder="เลือกหรือพิมพ์ชื่อโรงแรม"
              onAddNew={handleAddNewHotel}
              name={`${fieldNamePrefix}hotel`}
              id={`${fieldNamePrefix}hotel`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InputField
            label="หมายเลขห้อง"
            name={`${fieldNamePrefix}room_no`}
            value={formData.tour_room_no}
            onChange={(value) => handleValueChange("tour_room_no", value)}
            placeholder="เลขห้อง"
          />
          <InputField
            label="เบอร์ติดต่อ"
            name={`${fieldNamePrefix}contact_no`}
            value={formData.tour_contact_no}
            onChange={(value) => handleValueChange("tour_contact_no", value)}
            placeholder="เบอร์โทรศัพท์"
          />
          <InputField
            label="วันที่"
            name={`${fieldNamePrefix}date`}
            type="date"
            value={formData.tour_date}
            onChange={(value) => handleValueChange("tour_date", value)}
            required
          />
        </div>
        <InputField
          label="หมายเหตุ"
          name={`${fieldNamePrefix}note`}
          placeholder="หมายเหตุเพิ่มเติม"
          value={formData.note || ""}
          onChange={(newValue) => handleValueChange("note", newValue)}
        />
      </div>
    </div>
  );
};

export default React.memo(TourForm);
