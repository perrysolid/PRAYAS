import { WhatsApp } from "./pages/WhatsApp";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Intro } from "./components/Intro";
import { Layout } from "./components/Layout";
import { A11yProvider } from "./context/A11yContext";
import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./context/I18nContext";
import { MetaProvider } from "./context/MetaContext";
import { ComplaintDetail } from "./pages/ComplaintDetail";
import { Dashboard } from "./pages/Dashboard";
import { Departments } from "./pages/Departments";
import { Home } from "./pages/Home";
import { About, Accessibility, Contact, Cpgrams, Credits, Help, NotFound, Privacy, Sitemap, Terms } from "./pages/Info";
import { Login } from "./pages/Login";
import { MyComplaints } from "./pages/MyComplaints";
import { Officer } from "./pages/Officer";
import { Orders } from "./pages/Orders";
import { Proposal } from "./pages/Proposal";
import { Receipt } from "./pages/Receipt";
import { Register } from "./pages/Register";
import { Track } from "./pages/Track";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/register", element: <Register /> },
      { path: "/track", element: <Track /> },
      { path: "/my-complaints", element: <MyComplaints /> },
      { path: "/my-complaints/:id", element: <ComplaintDetail /> },
      { path: "/my-complaints/:id/receipt", element: <Receipt /> },
      { path: "/login", element: <Login /> },
      { path: "/officer", element: <Officer /> },
      { path: "/whatsapp", element: <WhatsApp /> },
      { path: "/departments", element: <Departments /> },
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/orders", element: <Orders /> },
      { path: "/help", element: <Help /> },
      { path: "/contact", element: <Contact /> },
      { path: "/about", element: <About /> },
      { path: "/accessibility", element: <Accessibility /> },
      { path: "/privacy", element: <Privacy /> },
      { path: "/terms", element: <Terms /> },
      { path: "/cpgrams", element: <Cpgrams /> },
      { path: "/sitemap", element: <Sitemap /> },
      { path: "/credits", element: <Credits /> },
      { path: "/proposal", element: <Proposal /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export function App() {
  return (
    <I18nProvider>
      <A11yProvider>
        <AuthProvider>
          <MetaProvider>
            <RouterProvider router={router} />
            <Intro />
          </MetaProvider>
        </AuthProvider>
      </A11yProvider>
    </I18nProvider>
  );
}
