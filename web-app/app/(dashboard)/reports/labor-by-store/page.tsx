import { redirect } from "next/navigation";

export default function LaborByStoreReportPage() {
  redirect("/reports?focus=labor");
}
