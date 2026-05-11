import {
  GraduationCap,
  BookOpen,
  Users,
  MapPin,
  FileText,
  Calendar,
  type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  admissions: FileText,
  enrollment: Calendar,
  courses: BookOpen,
  programs: BookOpen,
  graduate: GraduationCap,
  facilities: MapPin,
  campus: MapPin,
  library: BookOpen,
  support: Users,
  services: Users,
  schedule: Calendar,
  tuition: FileText,
  scholarship: GraduationCap,
  contact: Users,
  registrar: Users,
  academic: Calendar,
  events: Calendar,
  vision: GraduationCap,
  about: GraduationCap,
};

export function pickIcon(tag: string): LucideIcon {
  const lower = tag.toLowerCase();
  const key = Object.keys(ICON_MAP).find((candidate) => lower.includes(candidate));
  return key ? ICON_MAP[key] : BookOpen;
}
