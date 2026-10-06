import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { CartProvider } from "./contexts/CartContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { AuthProvider } from "./contexts/AuthContext";
import { RequireOnboarding } from "./components/auth/RequireOnboarding";
import { GuidedTourProvider } from "./components/tour/GuidedTourProvider";
import { SwipeBackGesture } from "./components/navigation/SwipeBackGesture";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UserPage = lazy(() => import("./pages/UserPage"));
const FriendProfilePage = lazy(() => import("./pages/FriendProfilePage"));
const FollowListPage = lazy(() => import("./pages/FollowListPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const InvitePage = lazy(() => import("./pages/InvitePage"));
const SharedItineraryPage = lazy(() => import("./pages/SharedItineraryPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));

import { Loader2 } from "lucide-react";

const RouteFallback = () => (
  <div className="flex h-[100dvh] w-full items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground opacity-50" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <FavoritesProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SwipeBackGesture />
              <GuidedTourProvider>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/auth" element={<Navigate to="/login" replace />} />
                    <Route path="/onboarding" element={<OnboardingPage />} />
                    <Route path="/convite/:token" element={<InvitePage />} />
                    <Route path="/erro" element={<NotFound />} />
                    <Route path="/" element={<Navigate to="/home" replace />} />
                    <Route path="/home" element={<RequireOnboarding><Index /></RequireOnboarding>} />
                    <Route path="/user" element={<RequireOnboarding><UserPage /></RequireOnboarding>} />
                    <Route path="/profile" element={<RequireOnboarding><FriendProfilePage /></RequireOnboarding>} />
                    <Route path="/u/:username" element={<RequireOnboarding><FriendProfilePage /></RequireOnboarding>} />
                    <Route path="/u/:username/seguidores" element={<RequireOnboarding><FollowListPage initialTab="followers" /></RequireOnboarding>} />
                    <Route path="/u/:username/seguindo" element={<RequireOnboarding><FollowListPage initialTab="following" /></RequireOnboarding>} />
                    <Route path="/me/seguidores" element={<RequireOnboarding><FollowListPage initialTab="followers" /></RequireOnboarding>} />
                    <Route path="/me/seguindo" element={<RequireOnboarding><FollowListPage initialTab="following" /></RequireOnboarding>} />
                    <Route path="/r/:datasetId" element={<RequireOnboarding><SharedItineraryPage /></RequireOnboarding>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </GuidedTourProvider>
            </BrowserRouter>
          </TooltipProvider>
        </FavoritesProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
