export interface StudentProfileData {
  user: {
    id:        string;
    name:      string;
    email:     string;
    phone:     string | null;
    gender:    string | null;
    avatarUrl: string | null;
    isActive:  boolean;
    createdAt: string;
  };
  profile: {
    id:          string;
    rollNumber:  string | null;
    admissionNo: string | null;
    dateOfBirth: string | null;
    bloodGroup:  string | null;
    address:     string | null;
  };
  section: {
    id:    string;
    name:  string;
    class: { id: string; name: string };
  } | null;
  attendance: {
    date:    string;
    status:  string;
    remarks: string | null;
  }[];
  results: {
    id:            string;
    marksObtained: number;
    maxMarks:      number;
    grade:         string | null;
    createdAt:     string;
    exam: {
      id:        string;
      name:      string;
      examType:  string;
      startDate: string | null;
    };
    subject: {
      id:   string;
      name: string;
      code: string | null;
    };
  }[];
  feePayments: {
    id:             string;
    status:         string;
    amountPaid:     number;
    waivedAmount:   number;
    paymentDate:    string | null;
    paymentMode:    string;
    transactionRef: string | null;
    remarks:        string | null;
    createdAt:      string;
    feeStructure: {
      id:          string;
      amount:      number;
      academicYear: string;
      description: string | null;
      feeCategory: { id: string; name: string };
    };
  }[];
  periods: {
    id:            string;
    dayOfWeek:     string;
    periodNumber:  number;
    startTime:     string | null;
    endTime:       string | null;
    subject:       { name: string; code: string | null } | null;
    teacherProfile: { user: { name: string } } | null;
  }[];
  school: { name: string } | null;
}