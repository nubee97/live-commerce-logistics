export default function DashboardImportInputs({ fileRefXlsx, fileRefJson, onExcelImport, onJsonImport }) {
  return (
    <>
      <input
        ref={fileRefXlsx}
        type="file"
        accept=".xlsx"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) {
            await onExcelImport(file);
          }
          event.target.value = "";
        }}
      />

      <input
        ref={fileRefJson}
        type="file"
        accept=".json"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) {
            await onJsonImport(file);
          }
          event.target.value = "";
        }}
      />
    </>
  );
}
