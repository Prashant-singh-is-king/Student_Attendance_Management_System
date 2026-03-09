export interface User {
  id: number;
  username: string;
  role: 'admin' | 'teacher';
  name: string;
}

export interface Student {
  id: number;
  name: string;
  roll_number: string;
  email: string;
  photo_url?: string;
}

export interface Class {
  id: number;
  name: string;
  teacher_id: number;
  teacher_name?: string;
}

export interface AttendanceRecord {
  student_id: number;
  status: 'present' | 'absent';
}
