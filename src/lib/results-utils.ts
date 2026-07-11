// Shared client + server safe utilities

export function calcGrade(marksObtained: number, maxMarks: number): string {
  if (maxMarks === 0) return "";
  const pct = (marksObtained / maxMarks) * 100;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 40) return "D";
  return "F";
}

export function calcPercentage(marks: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((marks / max) * 1000) / 10; // 1 decimal place
}

export function gradeStyle(grade: string): string {
  switch (grade) {
    case "A+": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "A":  return "bg-green-50 text-green-700 border border-green-200";
    case "B+": return "bg-blue-50 text-blue-700 border border-blue-200";
    case "B":  return "bg-indigo-50 text-indigo-700 border border-indigo-200";
    case "C":  return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    case "D":  return "bg-orange-50 text-orange-700 border border-orange-200";
    case "F":  return "bg-red-50 text-red-700 border border-red-200";
    default:   return "bg-gray-100 text-gray-500 border border-gray-200";
  }
}

export function pctTextStyle(pct: number): string {
  if (pct >= 75) return "text-emerald-600 font-semibold";
  if (pct >= 50) return "text-amber-600 font-semibold";
  return "text-red-600 font-semibold";
}