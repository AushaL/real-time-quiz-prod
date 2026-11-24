import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Loader } from "lucide-react";
import HomePage from "@pages/home/HomePage";
import MainLayout from "./layouts/MainLayout";
import { AuthenticateWithRedirectCallback } from "@clerk/react";

// HomePage stays eagerly imported: it is the landing route, so loading it
// lazily would add a round trip before the first paint. Every other route is
// split into its own chunk — multiplayer (socket.io), the admin editor and the
// offline host used to inflate the entry bundle for all visitors.
const QuizPage = lazy(() => import("@pages/quiz/QuizPage"));
const MultiplayerPage = lazy(() => import("@pages/quiz/MultiplayerPage"));
const JoinRoomPage = lazy(() => import("@pages/join/JoinRoomPage"));
const AuthCallbackPage = lazy(() => import("@pages/auth-callback/AuthCallbackPage"));
const AdminPage = lazy(() => import("@pages/admin/AdminPage"));
const OfflineHostPage = lazy(() => import("@pages/admin/OfflineHostPage"));

const RouteFallback = () => (
  <div className="flex min-h-screen w-full items-center justify-center">
    <Loader className="size-8 animate-spin text-primary" />
  </div>
);

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route
          path="/sso-callback"
          element={
            <AuthenticateWithRedirectCallback
              signInForceRedirectUrl={"/auth-callback"}
              signUpForceRedirectUrl={"/auth-callback"}
            />
          }
        />
        <Route path="/auth-callback" element={<AuthCallbackPage />} />

        <Route path="/" element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/quizzes/:quizId" element={<QuizPage />} />
          <Route path="/quizzes/:quizId/multiplayer" element={<MultiplayerPage />} />
          <Route path="/join/:code" element={<JoinRoomPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/offline/:quizId" element={<OfflineHostPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
