import { Link } from "react-router-dom";
import { LayoutDashboardIcon, ShieldHalfIcon } from "lucide-react";
import { Show, SignOutButton } from "@clerk/react";
import { Button } from "./button";

const TopBar = () => {
  const isAdmin = false;

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/70 px-6 py-4 backdrop-blur-md">
      <Link to="/" className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
          <ShieldHalfIcon className="size-5" />
        </span>
        <span className="text-lg font-bold uppercase tracking-[0.25em]">
          Real<span className="text-primary">Quiz</span>
        </span>
      </Link>

      <nav className="flex items-center gap-4">
        {isAdmin && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <LayoutDashboardIcon className="size-4" />
            Панель администратора
          </Link>
        )}
        <Show when="signed-in">
          <SignOutButton>
            <Button variant="outline" size="sm">
              Выйти
            </Button>
          </SignOutButton>
        </Show>
      </nav>
    </header>
  );
};

export default TopBar;
