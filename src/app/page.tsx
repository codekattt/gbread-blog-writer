import { WriterWorkspace } from "@/components/writer-workspace";

export default function Home() {
  return (
    <main
      className="relative min-h-screen overflow-hidden px-5 py-8 text-[var(--color-ink)] sm:px-8 lg:px-10"
      style={{ backgroundImage: "var(--color-app-background)" }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{ backgroundImage: "var(--color-app-overlay)" }}
      />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 pt-6 sm:pt-8">
        <WriterWorkspace />
      </div>
    </main>
  );
}
