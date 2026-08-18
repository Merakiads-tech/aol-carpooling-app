import { getAllRides } from "@/lib/admin";
import { RidesTable } from "./rides-table";

export const dynamic = "force-dynamic";

export default async function AdminRidesPage() {
  const rides = await getAllRides();
  return <RidesTable rides={rides} />;
}
