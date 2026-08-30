import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AuthGate } from "./components/layout/AuthGate";
import { ComposePage } from "./pages/ComposePage";
import { EmailDetailPage } from "./pages/EmailDetailPage";
import { InboxPage } from "./pages/InboxPage";
import { LoginPage } from "./pages/LoginPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route element={<AppShell />}>
          <Route path="/inbox" element={<InboxPage folder="scheduled" />} />
          <Route path="/inbox/sent" element={<InboxPage folder="sent" />} />
        </Route>
        <Route element={<AuthGate />}>
          <Route path="/inbox/:id" element={<EmailDetailPage />} />
          <Route path="/compose" element={<ComposePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
