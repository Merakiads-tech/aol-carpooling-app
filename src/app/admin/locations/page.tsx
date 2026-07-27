import { getAllLocations } from "@/lib/admin";
import { LocationsManager } from "./locations-manager";

export default async function AdminLocationsPage() {
  const locations = await getAllLocations();
  return <LocationsManager locations={locations} />;
}
