import React, { useState, useEffect } from "react";
import { useInformation } from "../../contexts/InformationContext";
import AutocompleteInput from "../common/AutocompleteInput";

const TransferForm = ({
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
  const {
    transferTypes,
    transferRecipients,
    places, // เปลี่ยนจาก pickupLocations, dropLocations เป็น places อย่างเดียว
    addNewInformation,
    loading,
  } = useInformation();

  useEffect(() => {
    // ตั้งค่าข้อมูลเริ่มต้น
    if (data) {
      setFormData({
        transfer_date: data.transfer_date || "",
        transfer_pickup_time: data.transfer_time || "",
        pickup_location: data.pickup_location || "",
        drop_location: data.drop_location || "",
        transfer_detail: data.transfer_detail || "",
        transfer_type: data.transfer_type || "",
        send_to: data.send_to || "",
        transfer_flight: data.transfer_flight || "",
        transfer_ftime: data.transfer_ftime || "",
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
        className="w-full border p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
        rows="3"
        placeholder={placeholder}
      ></textarea>
    </div>
  );

  // ฟังก์ชันเพิ่มข้อมูลใหม่
  const handleAddNewPickupLocation = async (newValue) => {
    try {
      const result = await addNewInformation(
        "place",
        newValue,
        "pickup_location"
      );
      return result;
    } catch (error) {
      console.error("Error adding new pickup location:", error);
      return null;
    }
  };

  const handleAddNewDropLocation = async (newValue) => {
    try {
      const result = await addNewInformation(
        "place",
        newValue,
        "drop_location"
      );
      return result;
    } catch (error) {
      console.error("Error adding new drop location:", error);
      return null;
    }
  };

  const handleAddNewTransferType = async (newValue) => {
    try {
      const result = await addNewInformation("transfer_type", newValue);
      return result;
    } catch (error) {
      console.error("Error adding new transfer type:", error);
      return null;
    }
  };

  const handleAddNewRecipient = async (newValue) => {
    try {
      const result = await addNewInformation("transfer_recipient", newValue);
      return result;
    } catch (error) {
      console.error("Error adding new recipient:", error);
      return null;
    }
  };

  const fieldNamePrefix = `transfer_${id}_`;

  // คำนวณจำนวน pax รวม
  const totalPax = parseInt(paxAdt) + parseInt(paxChd) + parseInt(paxInf);

  return (
    <div className="bg-white rounded-lg shadow-md border border-blue-300 hover:shadow-lg transition-all duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 flex justify-between items-center">
        <h3 className="text-lg font-medium">Transfer Booking #{id}</h3>
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
              options={transferTypes}
              value={formData.transfer_type || ""}
              onChange={(value) => handleValueChange("transfer_type", value)}
              placeholder="เลือกหรือพิมพ์ประเภทรถรับส่ง"
              onAddNew={handleAddNewTransferType}
              name={`${fieldNamePrefix}type`}
              id={`${fieldNamePrefix}type`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ส่งใคร
            </label>
            <AutocompleteInput
              options={transferRecipients}
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
          value={formData.transfer_detail}
          onChange={(value) => handleValueChange("transfer_detail", value)}
          placeholder="รายละเอียดเพิ่มเติม"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              รับจาก
            </label>
            <AutocompleteInput
              options={places} // ใช้ places ทั้งหมดไม่ต้องกรอง
              value={formData.pickup_location || ""}
              onChange={(value) => handleValueChange("pickup_location", value)}
              placeholder="เลือกหรือพิมพ์สถานที่รับ"
              onAddNew={handleAddNewPickupLocation}
              name={`${fieldNamePrefix}pickup_location`}
              id={`${fieldNamePrefix}pickup_location`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ไปส่งที่
            </label>
            <AutocompleteInput
              options={places} // ใช้ places ทั้งหมดไม่ต้องกรอง
              value={formData.drop_location || ""}
              onChange={(value) => handleValueChange("drop_location", value)}
              placeholder="เลือกหรือพิมพ์สถานที่ส่ง"
              onAddNew={handleAddNewDropLocation}
              name={`${fieldNamePrefix}drop_location`}
              id={`${fieldNamePrefix}drop_location`}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="เวลารับ"
            name={`${fieldNamePrefix}pickup_time`}
            value={formData.transfer_pickup_time}
            onChange={(value) =>
              handleValueChange("transfer_pickup_time", value)
            }
            placeholder="เวลารับ"
          />

          <InputField
            label="วันที่"
            name={`${fieldNamePrefix}date`}
            type="date"
            value={formData.transfer_date}
            onChange={(value) => handleValueChange("transfer_date", value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField
            label="เที่ยวบิน"
            name={`${fieldNamePrefix}flight`}
            value={formData.transfer_flight}
            onChange={(value) => handleValueChange("transfer_flight", value)}
            placeholder="เที่ยวบิน"
          />
          <InputField
            label="เวลาบิน"
            name={`${fieldNamePrefix}ftime`}
            value={formData.transfer_ftime}
            onChange={(value) => handleValueChange("transfer_ftime", value)}
            placeholder="เวลาบิน"
          />
          <InputField
            label="หมายเหตุ"
            name={`${fieldNamePrefix}note`}
            placeholder="หมายเหตุเพิ่มเติม"
            value={formData.note || ""}
            onChange={(newValue) => handleValueChange("note", newValue)}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(TransferForm);
