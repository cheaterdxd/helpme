import { Menu } from "lucide-react";
import { routeMeta, type Route } from "../navigation";

type TopBarProps = {
  activeRoute: Route;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onRouteChange: (route: Route) => void;
};

export function TopBar({ activeRoute, menuOpen, onMenuToggle, onRouteChange }: TopBarProps) {
  return (
    <header className="top-bar" aria-label="Global controls">
      <div className="menu-wrap">
        <button
          className="icon-button"
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          aria-controls="menuDropdown"
          onClick={onMenuToggle}
        >
          <Menu aria-hidden="true" size={20} />
        </button>

        <nav className="menu-dropdown" id="menuDropdown" aria-label="Collapsed navigation" data-open={menuOpen}>
          {(Object.keys(routeMeta) as Route[]).map((route) => (
            <button
              className="menu-item"
              type="button"
              key={route}
              data-active={activeRoute === route}
              onClick={() => onRouteChange(route)}
            >
              <span>{routeMeta[route].label}</span>
              <small>{routeMeta[route].hint}</small>
            </button>
          ))}
        </nav>
      </div>

      <div className="status-pill" aria-label="AI status">
        <span className="orb-core" aria-hidden="true" />
        <span>HelpMe planner is watching</span>
      </div>
    </header>
  );
}
