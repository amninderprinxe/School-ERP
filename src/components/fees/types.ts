export interface FeeKpis {
  [x: string]: any;
  totalFee:        number;
  collected:       number;
  outstanding:     number;
  overdue:         number;
  waived:          number;
  todayCollection: number;
  todayCount:      number;
  collectionRate:  number;
}

export interface MonthlyTrend {
  month:     string;
  collected: number;
  pending:   number;
}

export interface ModeData {
  mode:   string;
  amount: number;
}

export interface StudentFeePayment {
  id:            string;
  category:      string;
  amount:        number;
  paid:          number;
  waived:        number;
  outstanding:   number;
  status:        string;
  dueDate:       string | null;
  paymentDate:   string | null;
  paymentMode:   string;
  transactionRef: string | null;
}

export interface StudentFeeRecord {
  studentProfileId: string;
  name:             string;
  email:            string;
  avatarUrl:        string | null;
  rollNumber:       string | null;
  sectionLabel:     string;
  classId:          string;
  totalFee:         number;
  collected:        number;
  outstanding:      number;
  waived:           number;
  paidPct:          number;
  compositeStatus:  string;
  lastPaymentDate:  string | null;
  lastPaymentAmt:   number;
  nextDueDate:      string | null;
  payments:         StudentFeePayment[];
}

export interface RecentPayment {
  id:            string;
  studentName:   string;
  category:      string;
  amount:        number;
  paymentMode:   string;
  paymentDate:   string;
  status:        string;
  transactionRef: string | null;
}

export interface FeeDashboardData {
  kpis:           FeeKpis;
  monthlyTrend:   MonthlyTrend[];
  byMode:         ModeData[];
  students:       StudentFeeRecord[];
  recentPayments: RecentPayment[];
  classes:        { id: string; name: string }[];
  academicYears:  { id: string; name: string; isCurrent: boolean }[];
  total:          number;
}