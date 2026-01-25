
import { Customer, ReputationProfile } from "../../types";
import { getFallbackCustomer } from "./fallback";

export const generateCustomer = async (day: number, reputation: ReputationProfile): Promise<Customer> => {
  // AI Generation Disabled by User Request
  // Using offline fallback generator exclusively
  return Promise.resolve(getFallbackCustomer(day));
};
