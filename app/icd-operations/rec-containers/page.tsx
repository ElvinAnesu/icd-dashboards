import FilteredRecordTablePage from "../components/FilteredRecordTablePage";

export default function ReceivedContainersPage() {
  return (
    <FilteredRecordTablePage
      title="Received containers"
      description="Containers carried in"
      apiPath="/api/containers/received"
    />
  );
}
