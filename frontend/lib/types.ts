export type Role = "admin" | "hr" | "manager" | "employee";

export type Me = {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  employee: { id: number; employee_code: string; designation: string | null; department: string | null } | null;
};

export type Employee = {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  designation: string | null;
  department: string | null;
  employment_type: string | null;
  date_of_joining: string | null;
  date_of_leaving: string | null;
  manager_id: number | null;
  manager_name: string | null;
  salary: number | null;
  skills: string | null;
  bio: string | null;
  status: string;
  profile_picture: string | null;
};

export type DocumentRow = {
  id: number;
  employee_id: number | null;
  document_name: string;
  document_type: string;
  file_url: string;
  file_size: number | null;
  is_policy: boolean;
  uploaded_at: string | null;
};

export type Job = {
  id: number;
  title: string;
  description: string;
  requirements: string | null;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  status: string;
  closing_date: string | null;
  created_at: string | null;
  candidate_count: number;
};

export type Candidate = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  stage: string;
  score: number | null;
  ai_summary: string | null;
  resume_url: string | null;
  applied_at: string | null;
};

export type JobDetail = Job & { candidates: Candidate[] };

export type Leave = {
  id: number;
  employee_id: number;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  comments: string | null;
  created_at: string | null;
};

export type LeaveBalance = { leave_type: string; total_days: number; used_days: number; remaining_days: number };

export type AttendanceRow = {
  id: number;
  employee_id: number;
  date: string;
  status: string;
  work_hours: number | null;
  notes: string | null;
  check_in: string | null;
  check_out: string | null;
};

export type Cycle = {
  id: number;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  review_count: number;
};

export type AiReviewSummary = { summary: string; flags: string[]; suggestions: string[] };

export type Review = {
  id: number;
  cycle_id: number;
  employee_id: number;
  employee_name: string;
  department: string;
  self_rating: number | null;
  self_comments: string | null;
  manager_rating: number | null;
  manager_comments: string | null;
  goals: string | null;
  achievements: string | null;
  areas_of_improvement: string | null;
  overall_rating: number | null;
  ai_summary: AiReviewSummary | null;
  status: string;
};

export type ChecklistItem = { title: string; description?: string; due_days?: number; assignee?: string };

export type Checklist = { id: number; title: string; description: string | null; department: string | null; items: string };

export type Progress = {
  id: number;
  checklist_id: number;
  title: string;
  items: string;
  completed_items: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
};

export type ChatHistory = { id: number; message: string; response: string; created_at: string | null };

export type Payroll = {
  id: number;
  employee_id: number;
  employee_name: string;
  month: number;
  year: number;
  basic_salary: number;
  hra: number;
  transport_allowance: number;
  other_allowances: number;
  gross_salary: number;
  tax_deduction: number;
  pf_deduction: number;
  other_deductions: number;
  net_salary: number;
  status: string;
};

export type Dashboard = {
  total_employees: number;
  departments: { name: string; count: number }[];
  pending_leaves: number;
  open_positions: number;
  total_candidates: number;
  present_today: number;
};

export type AppUser = {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  employee_id: number | null;
};
