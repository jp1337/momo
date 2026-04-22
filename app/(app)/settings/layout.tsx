import { SettingsNav } from "@/components/settings/settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-5xl mx-auto">
      <SettingsNav />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
