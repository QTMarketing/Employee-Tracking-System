import { redirect } from "next/navigation";

export default function HourMixReportPage() {
  redirect("/reports?focus=hour-mix");
}
