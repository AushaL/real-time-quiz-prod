import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/home/HomePage";
import QuizPage from "./pages/quiz/QuizPage";
import MainLayout from "./layout/MainLayout";
import AuthCallbackPage from "./pages/auth-callback/AuthCallbackPage";
import { AuthenticateWithRedirectCallback } from "@clerk/react";

function App() {
  return (
    <>
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
        </Route>
      </Routes>
    </>
  );
}

export default App;
