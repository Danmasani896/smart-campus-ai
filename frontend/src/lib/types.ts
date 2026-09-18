export type Campus = "all" | "new" | "old";
export type ContentKind =
  | "knowledge"
  | "faq"
  | "location"
  | "event"
  | "announcement"
  | "emergency"
  | "guide"
  | "faculty"
  | "department"
  | "campus";
export interface CampusContent {
  id: string;
  kind: ContentKind;
  title: string;
  body: string;
  campus: Campus;
  category: string;
  status: "draft" | "published" | "archived";
  verified: boolean;
  sourceUrl: string | null;
  sourceLabel: string | null;
  verifiedAt: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  startsAt: string | null;
  venue: string | null;
  updatedAt: string;
}
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}
export interface ChatAnswer {
  answer: string;
  mode: string;
  notice?: string;
  sources: {
    id: string;
    title: string;
    url?: string;
    updatedAt?: string;
    kind?: string;
  }[];
  actions?: { label: string; href: string }[];
}
export interface PersonalDocument {
  id: string;
  name: string;
  createdAt: string;
  expiresAt: string;
  text?: string;
}
export const campusName = (campus: string) =>
  campus === "new"
    ? "New Campus"
    : campus === "old"
      ? "Old Campus"
      : "Both campuses";
export const contentHref = (item: CampusContent) =>
  `/${item.kind === "location" ? "map" : item.kind === "event" ? "events" : item.kind === "emergency" ? "emergency" : item.kind === "guide" ? "guide" : item.kind === "faq" ? "faq" : "search"}?id=${item.id}`;
