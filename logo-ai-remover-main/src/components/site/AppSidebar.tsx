import { Link, useRouterState } from "@tanstack/react-router";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  Home,
  Scissors,
  Sparkles,
  FileText,
  ScanLine,
  LayoutGrid,
  Clock,
  Mail,
  PlusCircle,
  PanelLeftClose,
  PanelLeft,
  X,
  Menu,
  ShieldCheck,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import { useUserStore } from "@/lib/userStore";

/* -------------------------------------------------------------------------- */
/* SIDEBAR CONTEXT FOR COLLAPSED & MOBILE DRAWER STATE                       */
/* -------------------------------------------------------------------------- */
interface SidebarContextType {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  toggleCollapse: () => {},
  isMobileOpen: false,
  setMobileOpen: () => {},
  closeMobile: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bellix_sidebar_collapsed") === "true";
    }
    return false;
  });
  const [isMobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("bellix_sidebar_collapsed", String(next));
      return next;
    });
  };

  const closeMobile = () => setMobileOpen(false);

  // Close mobile drawer on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        toggleCollapse,
        isMobileOpen,
        setMobileOpen,
        closeMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* NAVIGATION ITEMS CONFIGURATION (MATCHES USER SCREENSHOT 2)                */
/* -------------------------------------------------------------------------- */
export const SIDEBAR_NAV_ITEMS = [
  {
    name: "Home",
    path: "/",
    icon: Home,
    exact: true,
  },
  {
    name: "Background remover",
    path: "/background-remover",
    icon: Scissors,
  },
  {
    name: "PDF cleaner",
    path: "/pdf-watermark-remover",
    icon: FileText,
  },
  {
    name: "Video cleaner",
    path: "/gemini-video-watermark-remover",
    icon: ScanLine,
  },
  {
    name: "All tools",
    path: "/tools",
    icon: LayoutGrid,
  },
  {
    name: "History",
    path: "/history",
    icon: Clock,
  },
  {
    name: "Contact",
    path: "/contact",
    icon: Mail,
  },
];

/* -------------------------------------------------------------------------- */
/* MAIN APPSIDEBAR COMPONENT                                                  */
/* -------------------------------------------------------------------------- */
export function AppSidebar() {
  const { isCollapsed, toggleCollapse, isMobileOpen, closeMobile } = useSidebar();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useUserStore();

  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) return currentPath === path;
    return currentPath === path || currentPath.startsWith(path + "/");
  };

  return (
    <>
      {/* ─── MOBILE BACKDROP OVERLAY ─── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs lg:hidden transition-opacity duration-300"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* ─── SIDEBAR CONTAINER (DESKTOP FIXED + MOBILE SLIDE-OVER) ─── */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white text-gray-900 border-r border-gray-200 shadow-xs transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-[72px]" : "w-64"
        } ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="Sidebar navigation"
      >
        {/* ─── 1. TOP BRAND HEADER ─── */}
        <div
          className={`flex items-center h-16 px-4 border-b border-gray-100 select-none ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {/* Logo & Brand Name */}
          <Link
            to="/"
            onClick={closeMobile}
            className="flex items-center gap-2.5 min-w-0 group cursor-pointer"
            title="Bellix.us Home"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-50 border border-gray-200 shadow-xs group-hover:border-rose-400 transition-colors">
              <img
                src="/creative-suite/bellix_mark.png"
                alt="Bellix Labs"
                className="size-6 object-contain drop-shadow-[0_2px_8px_rgba(225,29,72,0.3)]"
              />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-baseline leading-none">
                  <span className="text-[15px] font-black tracking-tight text-gray-950 font-sans">
                    Bellix
                  </span>
                  <span className="text-[15px] font-black text-[#E11D48] tracking-tight ml-0.5">
                    Labs
                  </span>
                </div>
                <span className="text-[9px] font-bold tracking-[0.18em] text-gray-400 uppercase mt-0.5 truncate">
                  AI Studio
                </span>
              </div>
            )}
          </Link>

          {/* Collapse Toggle Button (Desktop) & Close Button (Mobile) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleCollapse}
              className="hidden lg:flex size-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            </button>

            <button
              type="button"
              onClick={closeMobile}
              className="flex lg:hidden size-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ─── 2. PRIMARY ACTION CTA BUTTON (Pure White Background per User Request) ─── */}
        <div className="p-3">
          <Link
            to="/tools"
            onClick={closeMobile}
            className={`group relative flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 cursor-pointer ${
              isCollapsed
                ? "size-10 mx-auto bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 text-gray-900 shadow-xs"
                : "w-full py-2.5 px-3.5 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 text-gray-900 text-xs sm:text-[13px] shadow-xs"
            }`}
            title="Create with AI Tools"
          >
            <PlusCircle
              size={isCollapsed ? 18 : 16}
              className="shrink-0 text-[#E11D48] group-hover:scale-110 transition-transform"
            />
            {!isCollapsed && <span className="truncate">Create with AI</span>}
          </Link>
        </div>

        {/* ─── DIVIDER ─── */}
        <div className="px-3">
          <div className="h-px w-full bg-gray-100" />
        </div>

        {/* ─── 3. NAVIGATION MENU LIST (Zero scrollbars) ─── */}
        <nav
          className="flex-1 overflow-y-auto no-scrollbar px-2.5 py-3 space-y-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {SIDEBAR_NAV_ITEMS.map((item) => {
            const active = isItemActive(item.path, item.exact);
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={closeMobile}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs sm:text-[13px] transition-all duration-180 cursor-pointer ${
                  isCollapsed ? "justify-center px-0 size-10 mx-auto" : "w-full"
                } ${
                  active
                    ? "bg-gray-100 text-gray-950 font-semibold shadow-xs border border-gray-200/80"
                    : "text-gray-600 hover:text-gray-950 hover:bg-gray-50"
                }`}
                title={item.name}
              >
                <item.icon
                  size={17}
                  className={`shrink-0 transition-colors ${
                    active
                      ? "text-[#E11D48]"
                      : "text-gray-400 group-hover:text-gray-800"
                  }`}
                />
                {!isCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* TOP HEADER BAR (CLEAN SLIM SOLID WHITE HEADER)                              */
/* -------------------------------------------------------------------------- */
export function TopHeader() {
  const { setMobileOpen, toggleCollapse, isCollapsed } = useSidebar();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  // Get current page title for breadcrumb
  const currentItem = SIDEBAR_NAV_ITEMS.find((item) =>
    item.exact ? currentPath === item.path : currentPath.startsWith(item.path)
  );

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between px-4 sm:px-6 bg-white border-b border-gray-200 select-none shadow-2xs">
      {/* Left: Mobile Menu Toggle & Desktop Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex lg:hidden size-9 items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-800 hover:bg-gray-100 hover:text-[#E11D48] transition-colors shadow-2xs cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu size={18} />
        </button>

        {/* Desktop Sidebar Toggle Shortcut */}
        <button
          type="button"
          onClick={toggleCollapse}
          className="hidden lg:flex size-8 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-950 hover:bg-gray-50 transition-colors cursor-pointer"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
        </button>

        {/* Breadcrumb / Page Title */}
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
          <Link to="/" className="hover:text-gray-900 transition-colors">
            Bellix
          </Link>
          <span>/</span>
          <span className="font-semibold text-gray-900 truncate">
            {currentItem?.name || "Workspace"}
          </span>
        </div>
      </div>

      {/* Right: Quick Action Buttons */}
      <div className="flex items-center gap-2.5">
        <Link
          to="/background-remover"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-[#E11D48] to-[#FF4FA3] shadow-sm hover:opacity-95 transition-opacity"
        >
          <Scissors size={13} />
          <span className="hidden sm:inline">Try Background Remover</span>
          <span className="sm:hidden">Remove BG</span>
        </Link>
      </div>
    </header>
  );
}
