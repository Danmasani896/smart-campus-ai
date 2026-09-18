import { notFound } from "next/navigation";
import { ChatScreen } from "@/components/features/chat-screen";
import { FaqScreen } from "@/components/features/faq-screen";
import { MapScreen } from "@/components/features/map-screen";
import {
  EventsScreen,
  EmergencyScreen,
  SearchScreen,
} from "@/components/features/content-screens";
import { GuideScreen } from "@/components/features/guide-screen";
import { DocumentsScreen } from "@/components/features/documents-screen";
import { ProfileScreen } from "@/components/features/profile-screen";
import { AdminScreen } from "@/components/features/admin-screen";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
const screens = {
  faq: FaqScreen,
  chat: ChatScreen,
  map: MapScreen,
  events: EventsScreen,
  emergency: EmergencyScreen,
  search: SearchScreen,
  guide: GuideScreen,
  documents: DocumentsScreen,
  profile: ProfileScreen,
  admin: AdminScreen,
};
export function generateStaticParams() {
  return Object.keys(screens).map((section) => ({ section }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const Screen = screens[section as keyof typeof screens];
  if (!Screen) notFound();
  return (
    <Suspense fallback={<Loading />}>
      <Screen />
    </Suspense>
  );
}
