import React, { useState, useEffect } from "react";
import {
  fetchInformationByCategory,
  addInformation,
  updateInformation,
  deactivateInformation,
} from "../services/informationService";
import { Plus, Edit, Trash, Save, X } from "lucide-react";
import { useInformation } from "../contexts/InformationContext";
import { useNotification } from "../hooks/useNotification";
import { useAlertDialogContext } from "../contexts/AlertDialogContext";

const Information = () => {
  const showAlert = useAlertDialogContext();
  const { showSuccess, showError, showInfo } = useNotification();
  const { refreshInformation } = useInformation();

  const [categories, setCategories] = useState([
    { id: "agent", label: "Agent" },
    { id: "tour_recipient", label: "ส่งใคร Tour" },
    { id: "transfer_recipient", label: "ส่งใคร Transfer" },
    { id: "tour_type", label: "ประเภท Tour" },
    { id: "transfer_type", label: "ประเภท Transfer" },
    { id: "place", label: "สถานที่" },
  ]);

  const [selectedCategory, setSelectedCategory] = useState("agent");
  const [informationData, setInformationData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    value: "",
    description: "",
    phone: "",
  });
  const [addingNew, setAddingNew] = useState(false);

  const supportsPhone = () => {
    return ["agent", "tour_recipient", "transfer_recipient", "place"].includes(
      selectedCategory
    );
  };

  useEffect(() => {
    loadInformationData();
  }, [selectedCategory]);

  const loadInformationData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await fetchInformationByCategory(
        selectedCategory
      );
      console.log(`🔍 Loaded ${selectedCategory} data:`, data);

      if (error) {
        console.error(`❌ Error loading ${selectedCategory} data:`, error);
        setError(error);
        showError(`ไม่สามารถโหลดข้อมูลได้: ${error}`);
      } else {
        setInformationData(data);
      }
    } catch (err) {
      console.error(`💥 Exception in loadInformationData:`, err);
      setError(err.message);
      showError(`เกิดข้อผิดพลาดในการโหลดข้อมูล: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setEditingItem(null);
    setAddingNew(false);
  };

  const handleEditItem = (item) => {
    setEditingItem({ ...item });
    setAddingNew(false);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const handleInputChange = (e, type) => {
    const { name, value } = e.target;

    if (type === "edit") {
      setEditingItem({ ...editingItem, [name]: value });
    } else {
      setNewItem({ ...newItem, [name]: value });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem.value.trim()) {
      showInfo("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const updateData = {
      value: editingItem.value,
      description: editingItem.description,
    };

    if (supportsPhone()) {
      updateData.phone = editingItem.phone || "";
    }

    try {
      const result = await updateInformation(editingItem.id, updateData);
      console.log(`🔍 Update result for ID ${editingItem.id}:`, result);

      if (result.success) {
        await loadInformationData();
        refreshInformation();
        setEditingItem(null);
        showSuccess("บันทึกการแก้ไขเรียบร้อย");
      } else {
        showError(`ไม่สามารถบันทึกข้อมูลได้: ${result.error}`);
      }
    } catch (err) {
      console.error(`💥 Exception in handleSaveEdit:`, err);
      showError(`เกิดข้อผิดพลาดในการบันทึก: ${err.message}`);
    }
  };

  const handleAddNew = () => {
    setAddingNew(true);
    setEditingItem(null);
    setNewItem({ value: "", description: "", phone: "" });
  };

  const handleCancelAdd = () => {
    setAddingNew(false);
  };

  const handleSaveNew = async () => {
    if (!newItem.value.trim()) {
      showInfo("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    const newData = {
      category: selectedCategory,
      value: newItem.value,
      description: newItem.description,
      active: true,
    };

    if (supportsPhone()) {
      newData.phone = newItem.phone || "";
    }

    try {
      const result = await addInformation(newData);
      console.log(`🔍 Add new result:`, result);

      if (result.data) {
        await loadInformationData(); // Reload data from database
        refreshInformation();
        setAddingNew(false);
        setNewItem({ value: "", description: "", phone: "" });
        showSuccess("เพิ่มข้อมูลใหม่เรียบร้อย");
      } else {
        showError(`ไม่สามารถเพิ่มข้อมูลได้: ${result.error}`);
      }
    } catch (err) {
      console.error(`💥 Exception in handleSaveNew:`, err);
      showError(`เกิดข้อผิดพลาดในการเพิ่มข้อมูล: ${err.message}`);
    }
  };

  const handleDeactivate = async (id) => {
    const confirmed = await showAlert({
      title: "ยืนยันการยกเลิกการใช้งาน",
      description: "คุณต้องการยกเลิกการใช้งานข้อมูลนี้ใช่หรือไม่?",
      confirmText: "ยืนยันการลบ",
      cancelText: "ยกเลิก",
      actionVariant: "destructive",
    });

    if (confirmed) {
      setLoading(true);

      try {
        const result = await deactivateInformation(id);
        console.log(`🔍 Deactivate result for ID ${id}:`, result);

        if (result.success) {
          showSuccess("ยกเลิกการใช้งานข้อมูลเรียบร้อย");
          await loadInformationData();
          refreshInformation();
        } else {
          showError(`ไม่สามารถยกเลิกการใช้งานข้อมูลได้: ${result.error}`);
        }
      } catch (err) {
        console.error(`💥 Exception in handleDeactivate:`, err);
        showError(`เกิดข้อผิดพลาดในการยกเลิก: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Information Management
        </h1>
        <p className="text-gray-600">จัดการข้อมูลที่ใช้ในระบบ</p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Sidebar Categories */}
          <div className="w-full md:w-1/4 bg-gray-50 p-4 border-r border-gray-200">
            <h2 className="text-lg font-semibold mb-4">ประเภทข้อมูล</h2>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-md transition-colors ${
                      selectedCategory === category.id
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-200"
                    }`}
                    onClick={() => handleCategoryChange(category.id)}
                  >
                    {category.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Content */}
          <div className="w-full md:w-3/4 p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {categories.find((cat) => cat.id === selectedCategory)?.label ||
                  selectedCategory}
              </h2>

              <button
                onClick={handleAddNew}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md flex items-center"
                disabled={addingNew}
              >
                <Plus size={18} className="mr-1" />
                เพิ่มข้อมูลใหม่
              </button>
            </div>

            {loading ? (
              <div className="text-center py-6">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
                <p className="mt-2 text-gray-600">กำลังโหลดข้อมูล...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            ) : (
              <>
                {/* Form for adding new item */}
                {addingNew && (
                  <div className="mb-6 bg-blue-50 p-4 rounded-md">
                    <h3 className="font-semibold mb-2">เพิ่มข้อมูลใหม่</h3>
                    <div
                      className={`grid grid-cols-1 ${
                        supportsPhone() ? "md:grid-cols-3" : "md:grid-cols-2"
                      } gap-4`}
                    >
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          ค่าข้อมูล <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="value"
                          value={newItem.value}
                          onChange={(e) => handleInputChange(e, "new")}
                          className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          รายละเอียด
                        </label>
                        <input
                          type="text"
                          name="description"
                          value={newItem.description}
                          onChange={(e) => handleInputChange(e, "new")}
                          className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
                        />
                      </div>
                      {supportsPhone() && (
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            เบอร์โทร
                          </label>
                          <input
                            type="text"
                            name="phone"
                            value={newItem.phone}
                            onChange={(e) => handleInputChange(e, "new")}
                            className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
                            placeholder="เช่น 081-234-5678"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end mt-3 space-x-2">
                      <button
                        onClick={handleCancelAdd}
                        className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={handleSaveNew}
                        className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                      >
                        บันทึก
                      </button>
                    </div>
                  </div>
                )}

                {/* Information list */}
                <div className="border border-gray-400 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ค่าข้อมูล
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          รายละเอียด
                        </th>
                        {supportsPhone() && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            เบอร์โทร
                          </th>
                        )}
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          จัดการ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {informationData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={supportsPhone() ? "4" : "3"}
                            className="px-6 py-4 text-center text-gray-500"
                          >
                            ไม่พบข้อมูล
                          </td>
                        </tr>
                      ) : (
                        informationData.map((item) => (
                          <tr key={item.id}>
                            {editingItem && editingItem.id === item.id ? (
                              <>
                                <td className="px-6 py-4">
                                  <input
                                    type="text"
                                    name="value"
                                    value={editingItem.value}
                                    onChange={(e) =>
                                      handleInputChange(e, "edit")
                                    }
                                    className="w-full border border-gray-300 rounded-md p-1 focus:ring focus:ring-blue-200 focus:border-blue-500"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <input
                                    type="text"
                                    name="description"
                                    value={editingItem.description || ""}
                                    onChange={(e) =>
                                      handleInputChange(e, "edit")
                                    }
                                    className="w-full border border-gray-300 rounded-md p-1 focus:ring focus:ring-blue-200 focus:border-blue-500"
                                  />
                                </td>
                                {supportsPhone() && (
                                  <td className="px-6 py-4">
                                    <input
                                      type="text"
                                      name="phone"
                                      value={editingItem.phone || ""}
                                      onChange={(e) =>
                                        handleInputChange(e, "edit")
                                      }
                                      className="w-full border border-gray-300 rounded-md p-1 focus:ring focus:ring-blue-200 focus:border-blue-500"
                                      placeholder="เช่น 081-234-5678"
                                    />
                                  </td>
                                )}
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={handleCancelEdit}
                                    className="text-gray-500 hover:text-gray-700 mr-2"
                                  >
                                    <X size={18} />
                                  </button>
                                  <button
                                    onClick={handleSaveEdit}
                                    className="text-green-500 hover:text-green-700"
                                  >
                                    <Save size={18} />
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-6 py-4">{item.value}</td>
                                <td className="px-6 py-4">
                                  {item.description || "-"}
                                </td>
                                {supportsPhone() && (
                                  <td className="px-6 py-4">
                                    {item.phone || "-"}
                                  </td>
                                )}
                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => handleEditItem(item)}
                                    className="text-blue-500 hover:text-blue-700 mr-3"
                                  >
                                    <Edit size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleDeactivate(item.id)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <Trash size={18} />
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Information;
