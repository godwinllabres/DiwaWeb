import { describe, it, expect } from "vitest";
import { BookOpen, FileText, Calendar, GraduationCap, Users, MapPin } from "lucide-react";
import { ICON_MAP, pickIcon } from "@/lib/iconMap";

describe("ICON_MAP", () => {
  it("contains all expected category keys", () => {
    const required = ["admissions", "enrollment", "courses", "tuition", "contact", "facilities"];
    for (const key of required) {
      expect(ICON_MAP).toHaveProperty(key);
    }
  });
});

describe("pickIcon", () => {
  it("returns FileText for admissions-related tags", () => {
    expect(pickIcon("admissions_requirements")).toBe(FileText);
    expect(pickIcon("ADMISSIONS")).toBe(FileText);
  });

  it("returns Calendar for schedule/event tags", () => {
    expect(pickIcon("schedule")).toBe(Calendar);
    expect(pickIcon("upcoming_events")).toBe(Calendar);
  });

  it("returns GraduationCap for graduate/scholarship tags", () => {
    expect(pickIcon("graduate_program")).toBe(GraduationCap);
    expect(pickIcon("scholarship_info")).toBe(GraduationCap);
  });

  it("returns Users for support/contact tags", () => {
    expect(pickIcon("contact_info")).toBe(Users);
    expect(pickIcon("student_support")).toBe(Users);
  });

  it("returns MapPin for facilities/campus tags", () => {
    expect(pickIcon("facilities")).toBe(MapPin);
    expect(pickIcon("campus_location")).toBe(MapPin);
  });

  it("returns BookOpen as fallback for unknown tags", () => {
    expect(pickIcon("totally_unknown_tag")).toBe(BookOpen);
    expect(pickIcon("")).toBe(BookOpen);
  });

  it("is case-insensitive", () => {
    expect(pickIcon("CoNtAcT_form")).toBe(Users);
  });
});
