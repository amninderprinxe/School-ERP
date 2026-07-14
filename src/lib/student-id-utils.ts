function cleanCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function formatClassCode(className: string) {
  const classNumber = className.match(/\d+/)?.[0];

  if (!classNumber) {
    throw new Error("Invalid class name.");
  }

  return classNumber.padStart(2, "0");
}

function formatRollNumber(rollNumber: string | number) {
  const value = String(rollNumber).trim();

  /*
   * Examples:
   * "15"       → "015"
   * "015"      → "015"
   * "10A-015"  → "015"
   * "11A-15"   → "015"
   *
   * Last numeric group nu roll number mannia jaavega.
   */
  const numericGroups = value.match(/\d+/g);

  if (!numericGroups?.length) {
    throw new Error("Invalid roll number.");
  }

  const lastNumber = numericGroups[numericGroups.length - 1];
  const numericRoll = Number(lastNumber);

  if (!Number.isInteger(numericRoll) || numericRoll <= 0) {
    throw new Error("Invalid roll number.");
  }

  return String(numericRoll).padStart(3, "0");
}

export function generateStudentLoginId({
  schoolCode,
  className,
  sectionName,
  rollNumber,
}: {
  schoolCode: string;
  className: string;
  sectionName: string;
  rollNumber: string | number;
}) {
  const school = cleanCode(schoolCode);
  const classCode = formatClassCode(className);
  const section = cleanCode(sectionName);
  const rollCode = formatRollNumber(rollNumber);

  if (!school) {
    throw new Error("Invalid school code.");
  }

  if (!section) {
    throw new Error("Invalid section name.");
  }

  return `${school}-${classCode}${section}-${rollCode}`;
}