import { ReportHeader } from "../report-header";
import { useState } from "react";

export default function ReportHeaderExample() {
  const [year, setYear] = useState("2024");

  return (
    <div className="p-6">
      <ReportHeader
        title="Annual Financial Report"
        subtitle="Comprehensive overview of yearly performance"
        filterLabel="Year"
        filterValue={year}
        filterOptions={[
          { value: "2024", label: "2024" },
          { value: "2023", label: "2023" },
          { value: "2022", label: "2022" },
        ]}
        onFilterChange={setYear}
        onExportPDF={() => console.log("Export PDF")}
        onExportExcel={() => console.log("Export Excel")}
        onPrint={() => console.log("Print")}
      />
    </div>
  );
}
