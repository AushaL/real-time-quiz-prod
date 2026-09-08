import { Show } from "@clerk/react";
import { ZapIcon } from "lucide-react";
import SignInOAuthButtons from "../../components/ui/SignInOAuthButtons";
import TopBar from "../../components/ui/TopBar";
import HomeDashboard from "./HomeDashboard";

const HomePage = () => {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="p3-grid pointer-events-none absolute inset-0 opacity-60" />

      <TopBar />

      <Show when="signed-out">
        <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
          <div className="flex flex-col items-center gap-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              <ZapIcon className="size-3.5" />
              Викторина в реальном времени
            </span>

            <h1 className="p3-text-gradient text-6xl font-black uppercase leading-none tracking-tight sm:text-7xl md:text-8xl">
              Real&nbsp;Quiz
            </h1>

            <p className="max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              Выходи на арену и проверяй свои знания против других игроков в
              реальном времени. Быстро, соревновательно и бескомпромиссно.
            </p>
          </div>

          <div className="w-full max-w-sm">
            <SignInOAuthButtons />
          </div>
        </main>
      </Show>

      <Show when="signed-in">
        <HomeDashboard />
      </Show>
    </div>
  );
};

export default HomePage;
