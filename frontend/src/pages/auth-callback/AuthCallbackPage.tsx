import { Card, CardContent } from "../../components/ui/card";
import { Loader } from "lucide-react";
import { axiosInstance } from "../../lib/axios";
import { useUser } from "@clerk/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthCallbackPage = () => {
  const { isLoaded, user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const syncUser = async () => {
      try {
        await axiosInstance.post("/api/auth/callback", {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          imageUrl: user.imageUrl,
        });
      } catch (error) {
        console.log("Error in auth callback", error);
      } finally {
        navigate("/");
      }
    };

    syncUser();
  }, [isLoaded, user, navigate]);

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden">
      <div className="p3-grid pointer-events-none absolute inset-0 opacity-60" />
      <Card className="relative z-10 w-[90%] max-w-md border shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 px-6 py-8">
          <Loader className="size-7 animate-spin text-primary" />
          <h3 className="text-xl font-bold uppercase tracking-[0.2em] text-foreground">
            Выполняется вход
          </h3>
          <p className="text-sm text-muted-foreground">Синхронизация профиля…</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallbackPage;
