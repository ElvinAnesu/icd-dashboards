import FilteredRecordTablePage from "../components/FilteredRecordTablePage";

export default function ManifestsPage() {
  return (
    <FilteredRecordTablePage
      title="Manifests"
      description="Uploaded manifests."
      apiPath="/api/manifests"
    />
  );
}
