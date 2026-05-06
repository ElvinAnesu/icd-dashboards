import FilteredRecordTablePage from "../components/FilteredRecordTablePage";

export default function BookingsPage() {
  return (
    <FilteredRecordTablePage
      title="Bookings"
      description="Container bookings from [@BIS_CONT1], filtered by UB_Date."
      apiPath="/api/containers/bookings"
    />
  );
}
