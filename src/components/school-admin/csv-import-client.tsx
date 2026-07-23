"use client";

import {
  useState,
  useRef,
  useTransition,
  useCallback,
}                            from "react";
import {
  parseCSVText,
  buildHeaderMap,
  STUDENT_HEADERS,
  TEACHER_HEADERS,
  STUDENT_TEMPLATE_CSV,
  TEACHER_TEMPLATE_CSV,
  downloadCSV,
}                            from "@/lib/csv-utils";
import {
  validateStudentRow,
  validateTeacherRow,
  type ParsedRow,
  type StudentImportRow,
  type TeacherImportRow,
  type ImportResult,
}                            from "@/lib/validations/import";
import { importStudents, importTeachers } from "@/action/import.actions";
import {
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  XCircle,
  SkipForward,
  FileSpreadsheet,
  RefreshCw,
  Users,
  UserCheck,
}                            from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────

type ImportType  = "students" | "teachers";
type AppState    = "idle" | "preview" | "importing" | "results";

type AnyRow = StudentImportRow | TeacherImportRow;
type AnyParsedRow = ParsedRow<AnyRow>;

// ── Constants ────────────────────────────────────────────────────
const PREVIEW_LIMIT = 50;  // rows shown in preview table

// ── Parse CSV text into typed rows ────────────────────────────────

function parseFile(
  text:       string,
  importType: ImportType,
): { rows: AnyParsedRow[]; headerError: string | null } {

  const grid = parseCSVText(text);
  if (grid.length < 2)
    return { rows: [], headerError: "File must have a header row and at least one data row." };

  const headers  = grid[0]!;
  const expected = importType === "students" ? STUDENT_HEADERS : TEACHER_HEADERS;
  const hmap     = buildHeaderMap(headers, expected);

  // Require at minimum: name + email
  if (!hmap.has("name") || !hmap.has("email"))
    return {
      rows:        [],
      headerError: `Missing required columns. Expected headers include: ${expected.join(", ")}`,
    };

  const get = (row: string[], key: string) =>
    hmap.has(key) ? (row[hmap.get(key)!] ?? "").trim() : "";

  const rows: AnyParsedRow[] = [];

  for (let i = 1; i < grid.length; i++) {
    const row = grid[i]!;

    if (importType === "students") {
      const data: StudentImportRow = {
        name:        get(row, "name"),
        email:       get(row, "email"),
        gender:      get(row, "gender"),
        phone:       get(row, "phone"),
        rollNumber:  get(row, "rollNumber"),
        admissionNo: get(row, "admissionNo"),
        dateOfBirth: get(row, "dateOfBirth"),
        bloodGroup:  get(row, "bloodGroup"),
        className:   get(row, "className"),
        sectionName: get(row, "sectionName"),
      };
      rows.push(validateStudentRow(i, data));
    } else {
      const data: TeacherImportRow = {
        name:          get(row, "name"),
        email:         get(row, "email"),
        gender:        get(row, "gender"),
        phone:         get(row, "phone"),
        employeeCode:  get(row, "employeeCode"),
        qualification: get(row, "qualification"),
        joiningDate:   get(row, "joiningDate"),
      };
      rows.push(validateTeacherRow(i, data));
    }
  }

  return { rows, headerError: null };
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────

export function CsvImportClient() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [appState,    setAppState]    = useState<AppState>("idle");
  const [importType,  setImportType]  = useState<ImportType>("students");
  const [parsedRows,  setParsedRows]  = useState<AnyParsedRow[]>([]);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [fileName,    setFileName]    = useState<string>("");
  const [results,     setResults]     = useState<ImportResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isPending, startTransition]  = useTransition();
  const [isDragging, setIsDragging]   = useState(false);

  // ── Derived ────────────────────────────────────────────────────
  const validRows   = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);
  const previewRows = parsedRows.slice(0, PREVIEW_LIMIT);

  // ── File processing ───────────────────────────────────────────
  const processFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
        setHeaderError("Please upload a .csv file.");
        setAppState("preview");
        return;
      }

      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const text    = reader.result as string;
        const { rows, headerError: he } = parseFile(text, importType);
        setHeaderError(he);
        setParsedRows(rows);
        setResults(null);
        setActionError(null);
        setAppState("preview");
      };
      reader.readAsText(file);
    },
    [importType],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFile(e.target.files?.[0]);
    // Reset input so the same file can be re-uploaded
    e.target.value = "";
  };

  // ── Drag-and-drop ─────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  // ── Import ────────────────────────────────────────────────────
  const handleImport = () => {
    if (!validRows.length) return;
    setActionError(null);
    setAppState("importing");

    startTransition(async () => {
      const res =
        importType === "students"
          ? await importStudents(
              validRows.map((r) => r.data as StudentImportRow),
            )
          : await importTeachers(
              validRows.map((r) => r.data as TeacherImportRow),
            );

      if (res.success && res.data) {
        setResults(res.data);
        setAppState("results");
      } if ("error" in res) {
        setActionError(res.error);
        setAppState("preview");
      }
    });
  };

  // ── Reset ─────────────────────────────────────────────────────
  const handleReset = () => {
    setParsedRows([]);
    setResults(null);
    setActionError(null);
    setHeaderError(null);
    setFileName("");
    setAppState("idle");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleTypeChange = (type: ImportType) => {
    setImportType(type);
    handleReset();
  };

  // ── Template download ─────────────────────────────────────────
  const handleTemplateDownload = () => {
    if (importType === "students") {
      downloadCSV("students-import-template.csv", STUDENT_TEMPLATE_CSV);
    } else {
      downloadCSV("teachers-import-template.csv", TEACHER_TEMPLATE_CSV);
    }
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Import</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Import students or teachers from a CSV file — up to 500 rows at a
          time
        </p>
      </div>

      {/* ── Type tabs ────────────────────────────────────── */}
      <div className="flex gap-2">
        {(["students", "teachers"] as ImportType[]).map((type) => {
          const Icon    = type === "students" ? Users : UserCheck;
          const active  = importType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm
                font-semibold rounded-lg border transition-colors
                ${active
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}
            >
              <Icon className="w-4 h-4" />
              {type === "students" ? "Students" : "Teachers"}
            </button>
          );
        })}
      </div>

      {/* ── Step 1: Template + Upload ─────────────────────── */}
      {(appState === "idle" || appState === "preview") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Template download card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center
                justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Step 1 — Download Template
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Fill in the template, then upload it below
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Required columns
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(importType === "students"
                  ? STUDENT_HEADERS
                  : TEACHER_HEADERS
                ).map((h) => (
                  <span
                    key={h}
                    className={`px-2 py-0.5 text-xs font-mono rounded
                      ${["name", "email"].includes(h)
                        ? "bg-blue-100 text-blue-800 font-bold"
                        : "bg-gray-100 text-gray-600"}`}
                  >
                    {h}
                    {["name", "email"].includes(h) && " *"}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                * Required · All other columns optional ·
                Gender: MALE / FEMALE / OTHER ·
                Dates: YYYY-MM-DD
              </p>
            </div>

            <button
              type="button"
              onClick={handleTemplateDownload}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm
                font-semibold text-white bg-indigo-600 hover:bg-indigo-700
                rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Template
            </button>
          </div>

          {/* Upload card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center
                justify-center shrink-0">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Step 2 — Upload CSV
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Drag & drop or click to browse
                </p>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-3
                h-36 rounded-xl border-2 border-dashed cursor-pointer
                transition-colors select-none
                ${isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"}`}
            >
              <Upload
                className={`w-8 h-8 ${isDragging ? "text-blue-500" : "text-gray-300"}`}
              />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">
                  {fileName
                    ? `Re-upload: ${fileName}`
                    : "Drop CSV file here or click to browse"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  .csv files only · Max 500 rows
                </p>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
              aria-hidden
            />
          </div>
        </div>
      )}

      {/* ── Parse / header error ───────────────────────── */}
      {headerError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border
          border-red-200 rounded-xl">
          <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              Could not parse file
            </p>
            <p className="text-sm text-red-600 mt-0.5">{headerError}</p>
          </div>
        </div>
      )}

      {/* ── Step 3: Preview table ─────────────────────────── */}
      {appState === "preview" && !headerError && parsedRows.length > 0 && (
        <div className="space-y-4">

          {/* Summary bar */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs
              font-semibold bg-green-50 text-green-700 border border-green-200
              rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {validRows.length} valid
            </span>
            {invalidRows.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs
                font-semibold bg-red-50 text-red-600 border border-red-200
                rounded-full">
                <XCircle className="w-3.5 h-3.5" />
                {invalidRows.length} invalid (will be skipped)
              </span>
            )}
            <span className="text-xs text-gray-400">
              {parsedRows.length} total rows · {fileName}
            </span>
            {parsedRows.length > PREVIEW_LIMIT && (
              <span className="text-xs text-amber-600 font-medium">
                Showing first {PREVIEW_LIMIT} rows
              </span>
            )}
          </div>

          {/* Action error */}
          {actionError && (
            <div className="flex items-center gap-2.5 p-4 bg-red-50 border
              border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600 font-medium">{actionError}</p>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {[
                      "Row",
                      "Status",
                      "Name",
                      "Email",
                      importType === "students" ? "Class / Section" : "Employee Code",
                      "Notes",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold text-gray-500
                          uppercase tracking-wide text-left"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {previewRows.map((row) => {
                    const d = row.data as StudentImportRow & TeacherImportRow;
                    return (
                      <tr
                        key={row.rowIndex}
                        className={`transition-colors ${
                          row.isValid
                            ? "hover:bg-gray-50/50"
                            : "bg-red-50/30"
                        }`}
                      >
                        {/* Row # */}
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                          {row.rowIndex + 1}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1
                              text-xs font-semibold text-green-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1
                              text-xs font-semibold text-red-600">
                              <XCircle className="w-3.5 h-3.5" />
                              Error
                            </span>
                          )}
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3 font-medium text-gray-900
                          max-w-[160px] truncate">
                          {d.name || <span className="text-gray-300">—</span>}
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate">
                          {d.email || <span className="text-gray-300">—</span>}
                        </td>

                        {/* Class/Section or EmployeeCode */}
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {importType === "students" ? (
                            d.className
                              ? `${d.className}${d.sectionName ? ` / ${d.sectionName}` : ""}`
                              : <span className="text-gray-300">—</span>
                          ) : (
                            d.employeeCode || <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Errors or OK */}
                        <td className="px-4 py-3 text-xs max-w-[200px]">
                          {row.errors.length > 0 ? (
                            <ul className="space-y-0.5">
                              {row.errors.map((err, ei) => (
                                <li key={ei} className="text-red-600 truncate">
                                  {err}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import + Reset buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleImport}
              disabled={validRows.length === 0 || isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600
                hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed
                text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Importing…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import {validRows.length} Valid Row
                  {validRows.length !== 1 ? "s" : ""}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm
                font-medium text-gray-600 bg-gray-100 hover:bg-gray-200
                rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Re-upload
            </button>

            {validRows.length === 0 && !headerError && (
              <p className="text-sm text-red-600">
                No valid rows to import. Fix the errors above and re-upload.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Step 4: Results ──────────────────────────────── */}
      {appState === "results" && results && (
        <div className="space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "Imported",
                value: results.imported,
                icon:  CheckCircle2,
                color: "text-emerald-700",
                bg:    "bg-emerald-50",
                border:"border-emerald-200",
              },
              {
                label: "Skipped (duplicate email)",
                value: results.skipped,
                icon:  SkipForward,
                color: "text-amber-700",
                bg:    "bg-amber-50",
                border:"border-amber-200",
              },
              {
                label: "Failed",
                value: results.failed,
                icon:  XCircle,
                color: results.failed > 0 ? "text-red-600" : "text-gray-500",
                bg:    results.failed > 0 ? "bg-red-50"   : "bg-gray-50",
                border:results.failed > 0 ? "border-red-200" : "border-gray-100",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-4 px-5 py-4 rounded-xl
                  border ${item.bg} ${item.border}`}
              >
                <item.icon className={`w-8 h-8 shrink-0 ${item.color}`} />
                <div>
                  <p className={`text-3xl font-black ${item.color}`}>
                    {item.value}
                  </p>
                  <p className="text-xs font-medium text-gray-600 mt-0.5">
                    {item.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Default password notice */}
          {results.imported > 0 && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border
              border-blue-100 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                <span className="font-semibold">
                  {results.imported} {importType} imported!
                </span>{" "}
                All accounts have been created with the default password{" "}
                <span className="font-mono font-bold">Password@123</span>.
                Notify them to change it after their first login.
              </p>
            </div>
          )}

          {/* Error / skip log */}
          {results.errors.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">
                  Import Log — {results.errors.length} notice
                  {results.errors.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                {results.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <span className="text-xs font-mono text-gray-400 shrink-0 mt-0.5">
                      Row {err.row}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0">
                      {err.email}
                    </span>
                    <span
                      className={`text-xs ml-auto ${
                        err.reason.includes("skipped")
                          ? "text-amber-700"
                          : "text-red-600"
                      }`}
                    >
                      {err.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import more button */}
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm
              font-medium text-gray-700 bg-white border border-gray-300
              hover:bg-gray-50 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Import Another File
          </button>
        </div>
      )}

    </div>
  );
}
