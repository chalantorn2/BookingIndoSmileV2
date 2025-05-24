import React, { createContext, useState, useEffect, useContext } from "react";
import {
  fetchInformationByCategory,
  addInformation,
} from "../services/informationService";

const InformationContext = createContext({
  tourTypes: [],
  tourRecipients: [],
  transferTypes: [],
  transferRecipients: [],
  places: [],
  agents: [],
  loading: true,
  addNewInformation: () => {},
  refreshInformation: () => {},
});

export const useInformation = () => {
  return useContext(InformationContext);
};

export const InformationProvider = ({ children }) => {
  const [tourTypes, setTourTypes] = useState([]);
  const [tourRecipients, setTourRecipients] = useState([]);
  const [transferTypes, setTransferTypes] = useState([]);
  const [transferRecipients, setTransferRecipients] = useState([]);
  const [places, setPlaces] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllInformation();
  }, []);

  const loadAllInformation = async () => {
    setLoading(true);
    try {
      console.log("🔍 Loading all information...");
      const categories = [
        { category: "agent", setter: setAgents },
        { category: "tour_type", setter: setTourTypes },
        { category: "tour_recipient", setter: setTourRecipients },
        { category: "transfer_type", setter: setTransferTypes },
        { category: "transfer_recipient", setter: setTransferRecipients },
        { category: "place", setter: setPlaces },
      ];

      const results = await Promise.all(
        categories.map(async ({ category, setter }) => {
          const { data, error } = await fetchInformationByCategory(category);
          console.log(`🔍 Loaded ${category} data:`, data);

          // เพิ่ม debug สำหรับ places โดยเฉพาะ
          if (category === "place") {
            console.log("🔍 Places data details:", data);
            console.log(
              "🔍 Places with phone:",
              data.filter((item) => item.phone)
            );
          }

          if (error) {
            console.error(`❌ Error loading ${category}:`, error);
            return { category, data: [], error };
          }
          setter(data);
          return { category, data, error: null };
        })
      );

      // เพิ่มตรงนี้
      console.log("🔍 Final places state after loading:", places);

      // Log any errors from Promise.all
      results.forEach(({ category, error }) => {
        if (error) {
          console.error(`💥 Failed to load ${category}:`, error);
        }
      });
    } catch (error) {
      console.error("💥 Exception in loadAllInformation:", error);
    } finally {
      setLoading(false);
      console.log("✅ Finished loading all information");
    }
  };

  const addNewInformation = async (
    category,
    value,
    description = "",
    phone = ""
  ) => {
    try {
      console.log(`🔍 Adding new information for ${category}:`, {
        value,
        description,
        phone,
      });

      const actualCategory =
        category === "hotel" ||
        category === "pickup_location" ||
        category === "drop_location"
          ? "place"
          : category;

      const newData = {
        category: actualCategory,
        value: value.trim(),
        description: description.trim(),
        phone: phone.trim(),
        active: true,
      };

      const { data, error } = await addInformation(newData);
      console.log(`🔍 Add result for ${actualCategory}:`, { data, error });

      if (error) {
        throw new Error(
          `Failed to add ${actualCategory} information: ${error}`
        );
      }

      if (!data) {
        throw new Error("No data returned from database after insert");
      }

      // Update state based on category
      switch (actualCategory) {
        case "agent":
          setAgents((prev) => [...prev, data]);
          break;
        case "tour_type":
          setTourTypes((prev) => [...prev, data]);
          break;
        case "tour_recipient":
          setTourRecipients((prev) => [...prev, data]);
          break;
        case "transfer_type":
          setTransferTypes((prev) => [...prev, data]);
          break;
        case "transfer_recipient":
          setTransferRecipients((prev) => [...prev, data]);
          break;
        case "place":
          setPlaces((prev) => [...prev, data]);
          break;
        default:
          break;
      }

      return data;
    } catch (error) {
      console.error(
        `💥 Exception in addNewInformation for ${category}:`,
        error
      );
      return null;
    }
  };

  const formatOptions = (items) => {
    if (!Array.isArray(items)) return [];

    return items.map((item) => ({
      id: item.id,
      value: item.value || "",
      description: item.description || "",
      phone: item.phone || "",
    }));
  };

  const value = {
    tourTypes: formatOptions(tourTypes),
    tourRecipients: formatOptions(tourRecipients),
    transferTypes: formatOptions(transferTypes),
    transferRecipients: formatOptions(transferRecipients),
    places: formatOptions(places),
    agents: formatOptions(agents),
    loading,
    addNewInformation,
    refreshInformation: loadAllInformation,
  };

  return (
    <InformationContext.Provider value={value}>
      {children}
    </InformationContext.Provider>
  );
};

export default InformationContext;
