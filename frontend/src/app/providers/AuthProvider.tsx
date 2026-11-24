import { useAuth } from "@clerk/react";
import { useEffect, useState } from "react";
import { axiosInstance } from "@shared/api/axios";
import { Loader } from "lucide-react";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Свежий токен получаем на каждый запрос: токен Clerk живёт ~60 секунд,
    // поэтому разово проставленный заголовок быстро устаревает.
    const requestInterceptor = axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      }
    );

    return () => {
      axiosInstance.interceptors.request.eject(requestInterceptor);
    };
  }, [getToken]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await getToken();
      } catch (error) {
        console.log("Error in auth provider", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [getToken]);

  if (loading)
    return (
      <div className="w-full flex items-center justify-center h-screen">
        <Loader className="size-8 text-primary animate-spin" />
      </div>
    );

  return <>{children}</>;
};

export default AuthProvider;
