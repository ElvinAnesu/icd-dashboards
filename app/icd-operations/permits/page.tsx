import FilteredRecordTablePage from "../components/FilteredRecordTablePage";

export default function ExitedPermitsPage() {
  return (
    <FilteredRecordTablePage
      title="Exited permits"
      description="Loading permits with gate-out on OIGE, filtered by gate-out date (same data as the dashboard stat)."
      apiPath="/api/permits/exited"
    />
  );
}
