import { requireRole }       from "@/lib/session";
import { CsvImportClient }   from "@/components/school-admin/csv-import-client";

export const metadata = { title: "Bulk Import" };

export default async function ImportPage() {
  await requireRole(["SCHOOL_ADMIN"]);

  return <CsvImportClient />;
}