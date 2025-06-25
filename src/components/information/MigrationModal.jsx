import React, { useState, useEffect } from "react";
import { X, ArrowRight, AlertTriangle, Shuffle } from "lucide-react";
import {
  getAllInformationByCategory,
  previewMergeImpact,
  mergeInformationRecords,
} from "../../services/migrationService";
import ConflictResolver from "./ConflictResolver";

const MigrationModal = ({ isOpen, onClose, category, onMigrationComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [allRecords, setAllRecords] = useState([]);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [selectedDuplicates, setSelectedDuplicates] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [conflicts, setConflicts] = useState({});
  const [resolvedConflicts, setResolvedConflicts] = useState({});

  useEffect(() => {
    if (isOpen && category) {
      loadAllRecords();
    }
  }, [isOpen, category]);

  const loadAllRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await getAllInformationByCategory(category);
      if (error) throw new Error(error);
      setAllRecords(data);
    } catch (error) {
      console.error("Error loading records:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMasterSelect = (record) => {
    setSelectedMaster(record);
    setSelectedDuplicates([]); // Clear duplicates when master changes
  };

  const handleDuplicateToggle = (record) => {
    if (record.id === selectedMaster?.id) return; // Can't select master as duplicate

    setSelectedDuplicates((prev) => {
      const isSelected = prev.some((r) => r.id === record.id);
      if (isSelected) {
        return prev.filter((r) => r.id !== record.id);
      } else {
        return [...prev, record];
      }
    });
  };

  const handlePreview = async () => {
    if (!selectedMaster || selectedDuplicates.length === 0) return;

    setLoading(true);
    try {
      const duplicateIds = selectedDuplicates.map((r) => r.id);
      const { success, impact, error } = await previewMergeImpact(
        selectedMaster.id,
        duplicateIds
      );

      if (!success) throw new Error(error);

      setPreviewData(impact);

      // Check for conflicts
      const conflicts = {};
      impact.duplicateRecords.forEach((duplicate) => {
        if (
          duplicate.description &&
          selectedMaster.description &&
          duplicate.description !== selectedMaster.description
        ) {
          conflicts.description = {
            master: selectedMaster.description,
            duplicates: impact.duplicateRecords
              .filter(
                (d) =>
                  d.description && d.description !== selectedMaster.description
              )
              .map((d) => ({
                id: d.id,
                value: d.value,
                description: d.description,
              })),
          };
        }

        if (
          duplicate.phone &&
          selectedMaster.phone &&
          duplicate.phone !== selectedMaster.phone
        ) {
          conflicts.phone = {
            master: selectedMaster.phone,
            duplicates: impact.duplicateRecords
              .filter((d) => d.phone && d.phone !== selectedMaster.phone)
              .map((d) => ({ id: d.id, value: d.value, phone: d.phone })),
          };
        }
      });

      setConflicts(conflicts);
      setStep(Object.keys(conflicts).length > 0 ? 3 : 4); // Skip conflict resolution if no conflicts
    } catch (error) {
      console.error("Error previewing merge:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!selectedMaster || selectedDuplicates.length === 0) return;

    setLoading(true);
    try {
      const duplicateIds = selectedDuplicates.map((r) => r.id);
      const { success, error } = await mergeInformationRecords(
        selectedMaster.id,
        duplicateIds,
        resolvedConflicts
      );

      if (!success) throw new Error(error);

      onMigrationComplete();
      handleClose();
    } catch (error) {
      console.error("Error merging records:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedMaster(null);
    setSelectedDuplicates([]);
    setPreviewData(null);
    setConflicts({});
    setResolvedConflicts({});
    onClose();
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3, 4].map((stepNum) => (
        <React.Fragment key={stepNum}>
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= stepNum
                ? "bg-blue-500 text-white"
                : "bg-gray-300 text-gray-600"
            }`}
          >
            {stepNum}
          </div>
          {stepNum < 4 && (
            <div
              className={`w-12 h-1 ${
                step > stepNum ? "bg-blue-500" : "bg-gray-300"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">
        Step 1: เลือก Master Record
      </h3>
      <p className="text-gray-600 mb-4">
        เลือกข้อมูลหลักที่จะเป็นตัวแทนหลังจากการรวม
      </p>

      <div className="max-h-60 overflow-y-auto border rounded-md">
        {allRecords.map((record) => (
          <div
            key={record.id}
            onClick={() => handleMasterSelect(record)}
            className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
              selectedMaster?.id === record.id
                ? "bg-blue-50 border-blue-300"
                : ""
            }`}
          >
            <div className="font-medium">{record.value}</div>
            {record.description && (
              <div className="text-sm text-gray-600">{record.description}</div>
            )}
            {record.phone && (
              <div className="text-sm text-gray-500">{record.phone}</div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={() => setStep(2)}
          disabled={!selectedMaster}
          className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          ถัดไป <ArrowRight size={16} className="ml-1" />
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">
        Step 2: เลือก Duplicate Records
      </h3>
      <div className="bg-blue-50 p-3 rounded-md mb-4">
        <div className="font-medium">Master Record:</div>
        <div className="text-blue-700">{selectedMaster?.value}</div>
      </div>

      <p className="text-gray-600 mb-4">
        เลือกข้อมูลที่ต้องการรวมเข้ากับ Master Record
      </p>

      <div className="max-h-60 overflow-y-auto border rounded-md">
        {allRecords
          .filter((r) => r.id !== selectedMaster?.id)
          .map((record) => (
            <div
              key={record.id}
              onClick={() => handleDuplicateToggle(record)}
              className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                selectedDuplicates.some((r) => r.id === record.id)
                  ? "bg-orange-50 border-orange-300"
                  : ""
              }`}
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedDuplicates.some((r) => r.id === record.id)}
                  onChange={() => {}}
                  className="mr-3"
                />
                <div className="flex-1">
                  <div className="font-medium">{record.value}</div>
                  {record.description && (
                    <div className="text-sm text-gray-600">
                      {record.description}
                    </div>
                  )}
                  {record.phone && (
                    <div className="text-sm text-gray-500">{record.phone}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>

      <div className="flex justify-between mt-4">
        <button
          onClick={() => setStep(1)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          ย้อนกลับ
        </button>
        <button
          onClick={handlePreview}
          disabled={selectedDuplicates.length === 0 || loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading ? "กำลังตรวจสอบ..." : "ตรวจสอบผลกระทบ"}{" "}
          <ArrowRight size={16} className="ml-1" />
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <ConflictResolver
      conflicts={conflicts}
      masterRecord={selectedMaster}
      onResolve={setResolvedConflicts}
      onNext={() => setStep(4)}
      onBack={() => setStep(2)}
    />
  );

  const renderStep4 = () => (
    <div>
      <h3 className="text-lg font-semibold mb-4">Step 4: ยืนยันการรวมข้อมูล</h3>

      {previewData && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
            <div className="flex items-center mb-2">
              <AlertTriangle className="text-yellow-600 mr-2" size={20} />
              <span className="font-medium">ผลกระทบจากการรวมข้อมูล</span>
            </div>
            <div className="text-sm text-yellow-800">
              จะมีการอัพเดทข้อมูลใน{" "}
              <strong>{previewData.totalAffectedRecords}</strong> รายการ
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-md p-3">
              <h4 className="font-medium text-green-700 mb-2">
                Master Record (จะเก็บไว้)
              </h4>
              <div className="text-sm">
                <div className="font-medium">
                  {previewData.masterRecord.value}
                </div>
                {previewData.masterRecord.description && (
                  <div className="text-gray-600">
                    {previewData.masterRecord.description}
                  </div>
                )}
                {previewData.masterRecord.phone && (
                  <div className="text-gray-500">
                    {previewData.masterRecord.phone}
                  </div>
                )}
              </div>
            </div>

            <div className="border rounded-md p-3">
              <h4 className="font-medium text-red-700 mb-2">
                Duplicate Records (จะถูกลบ)
              </h4>
              <div className="space-y-1">
                {previewData.duplicateRecords.map((record) => (
                  <div key={record.id} className="text-sm">
                    <div className="font-medium">{record.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {Object.keys(previewData.details).length > 0 && (
            <div className="border rounded-md p-3">
              <h4 className="font-medium mb-2">รายละเอียดการอัพเดท</h4>
              <div className="text-sm space-y-1">
                {Object.entries(previewData.details).map(
                  ([key, count]) =>
                    count > 0 && (
                      <div key={key}>
                        {key}: {count} รายการ
                      </div>
                    )
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button
          onClick={() => setStep(Object.keys(conflicts).length > 0 ? 3 : 2)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          ย้อนกลับ
        </button>
        <button
          onClick={handleMerge}
          disabled={loading}
          className="px-4 py-2 bg-red-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading ? "กำลังรวมข้อมูล..." : "ยืนยันการรวม"}{" "}
          <Shuffle size={16} className="ml-1" />
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-auto modal-backdrop flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 bg-orange-500 text-white rounded-t-lg flex justify-between items-center">
          <h3 className="text-xl font-semibold flex items-center">
            <Shuffle size={20} className="mr-2" />
            Data Migration - {category}
          </h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-orange-600 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {renderStepIndicator()}

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </div>
    </div>
  );
};

export default MigrationModal;
