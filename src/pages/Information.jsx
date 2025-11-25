import React, { useState, useEffect } from "react";
import {
  searchInformationByCategory,
  addInformation,
  updateInformation,
  deactivateInformation,
} from "../services/informationService";
import { Plus, Edit, Trash, Save, X, Shuffle } from "lucide-react";
import { useInformation } from "../contexts/InformationContext";
import { useNotification } from "../hooks/useNotification";
import { useAlertDialogContext } from "../contexts/AlertDialogContext";
import SearchBar from "../components/information/SearchBar";
import PaginationControls from "../components/information/PaginationControls";
import MigrationModal from "../components/information/MigrationModal";

const Information = () => {
  const showAlert = useAlertDialogContext();
  const { showSuccess, showError, showInfo } = useNotification();
  const { refreshInformation } = useInformation();

  const [categories, setCategories] = useState([
    { id: "agent", label: "Agent" },
    { id: "tour_recipient", label: "Tour Recipient" },
    { id: "transfer_recipient", label: "Transfer Recipient" },
    { id: "tour_type", label: "Tour Type" },
    { id: "transfer_type", label: "Transfer Type" },
    { id: "place", label: "Place" },
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

  // Pagination & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 10;

  // Migration states
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);

  const supportsPhone = () => {
    return ["agent", "tour_recipient", "transfer_recipient", "place"].includes(
      selectedCategory
    );
  };

  useEffect(() => {
    // Reset page และ search เฉพาะเมื่อเปลี่ยน category
    setCurrentPage(1);
    setSearchQuery("");
    setEditingItem(null);
    setAddingNew(false);
  }, [selectedCategory]);

  useEffect(() => {
    loadInformationData();
  }, [selectedCategory, searchQuery]);

  const loadInformationData = async (page = currentPage) => {
    setLoading(true);
    setError(null);

    try {
      const {
        data,
        total,
        totalPages: pages,
        error,
      } = await searchInformationByCategory(
        selectedCategory,
        searchQuery,
        page,
        itemsPerPage
      );

      if (error) {
        console.error(`❌ Error loading ${selectedCategory} data:`, error);
        setError(error);
        showError(`Cannot load data: ${error}`);
      } else {
        setInformationData(data);
        setTotalItems(total);
        setTotalPages(pages);
      }
    } catch (err) {
      console.error(`💥 Exception in loadInformationData:`, err);
      setError(err.message);
      showError(`Error loading data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (categoryId) => {
    if (categoryId !== selectedCategory) {
      setSelectedCategory(categoryId);
      // การ reset อื่นๆ จะทำใน useEffect
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query !== searchQuery) {
      setCurrentPage(1);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadInformationData(page);
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
      showInfo("Please fill in all required fields");
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

      if (result.success) {
        await loadInformationData();
        refreshInformation();
        setEditingItem(null);
        showSuccess("Changes saved successfully");
      } else {
        showError(`Cannot save data: ${result.error}`);
      }
    } catch (err) {
      showError(`Error saving: ${err.message}`);
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
      showInfo("Please fill in all required fields");
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

      if (result.data) {
        await loadInformationData();
        refreshInformation();
        setAddingNew(false);
        setNewItem({ value: "", description: "", phone: "" });
        showSuccess("New data added successfully");
      } else {
        showError(`Cannot add data: ${result.error}`);
      }
    } catch (err) {
      showError(`Error adding data: ${err.message}`);
    }
  };

  const handleDeactivate = async (id) => {
    const confirmed = await showAlert({
      title: "Confirm Deactivation",
      description: "Are you sure you want to deactivate this data?",
      confirmText: "Confirm Delete",
      cancelText: "Cancel",
      actionVariant: "destructive",
    });

    if (confirmed) {
      setLoading(true);

      try {
        const result = await deactivateInformation(id);

        if (result.success) {
          showSuccess("Data deactivated successfully");
          await loadInformationData();
          refreshInformation();
        } else {
          showError(`Cannot deactivate data: ${result.error}`);
        }
      } catch (err) {
        showError(`Error deactivating: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMigrationComplete = () => {
    showSuccess("Data merged successfully");
    loadInformationData();
    refreshInformation();
  };

  const handleOpenMigration = () => {
    if (totalItems < 2) {
      showInfo("At least 2 records are required for migration");
      return;
    }
    setIsMigrationOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-6 bg-gray-50">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Information Management
        </h1>
        <p className="text-gray-600">Manage system data</p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Sidebar Categories */}
          <div className="w-full md:w-1/4 bg-gray-50 p-4 border-r border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Data Type</h2>
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-3 sm:space-y-0">
              <h2 className="text-xl font-semibold">
                {categories.find((cat) => cat.id === selectedCategory)?.label ||
                  selectedCategory}
              </h2>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <button
                  onClick={handleOpenMigration}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-md flex items-center"
                  disabled={loading}
                >
                  <Shuffle size={18} className="mr-1" />
                  Migration
                </button>

                <button
                  onClick={handleAddNew}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md flex items-center"
                  disabled={addingNew}
                >
                  <Plus size={18} className="mr-1" />
                  Add New
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <SearchBar
              onSearch={handleSearch}
              placeholder={`Search ${
                categories.find((cat) => cat.id === selectedCategory)?.label
              }...`}
              className="mb-4"
            />

            {loading ? (
              <div className="text-center py-6">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent"></div>
                <p className="mt-2 text-gray-600">Loading data...</p>
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
                    <h3 className="font-semibold mb-2">Add New Data</h3>
                    <div
                      className={`grid grid-cols-1 ${
                        supportsPhone() ? "md:grid-cols-3" : "md:grid-cols-2"
                      } gap-4`}
                    >
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Value <span className="text-red-500">*</span>
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
                          Description
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
                            Phone
                          </label>
                          <input
                            type="text"
                            name="phone"
                            value={newItem.phone}
                            onChange={(e) => handleInputChange(e, "new")}
                            className="w-full border border-gray-300 rounded-md p-2 focus:ring focus:ring-blue-200 focus:border-blue-500"
                            placeholder="e.g. 081-234-5678"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end mt-3 space-x-2">
                      <button
                        onClick={handleCancelAdd}
                        className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNew}
                        className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                      >
                        Save
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
                          Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        {supportsPhone() && (
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Phone
                          </th>
                        )}
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
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
                            {searchQuery
                              ? "No data found"
                              : "No data"}
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
                                      placeholder="e.g. 081-234-5678"
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

                {/* Pagination */}
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  className="mt-4"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Migration Modal */}
      <MigrationModal
        isOpen={isMigrationOpen}
        onClose={() => setIsMigrationOpen(false)}
        category={selectedCategory}
        onMigrationComplete={handleMigrationComplete}
      />
    </div>
  );
};

export default Information;
