import { WriterWorkspace } from "@/components/writer-workspace";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(254,243,199,0.92),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(191,219,254,0.68),_transparent_30%),linear-gradient(180deg,_#fffaf1_0%,_#fff7ed_48%,_#fffdf8_100%)] px-5 py-8 text-[var(--color-ink)] sm:px-8 lg:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(90deg,rgba(190,24,93,0.08),rgba(217,119,6,0.06),rgba(37,99,235,0.06))]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 pt-6 sm:pt-8">
        <WriterWorkspace />
      </div>
    </main>
  );
}
