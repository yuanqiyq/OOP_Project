import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/logo.svg";
import "./Navbar.css";

export default function Navbar({ currentPage = "dashboard" }) {
	const { userProfile, signOut } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [showUserMenu, setShowUserMenu] = useState(false);
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);

	const handleSignOut = async () => {
		await signOut();
		navigate("/auth");
	};

	useEffect(() => {
		const handleScroll = () => {
			const currentScrollY = window.scrollY;
			const scrollThreshold = 10;

			// Hide navbar when scrolling down
			if (currentScrollY > lastScrollY && currentScrollY > scrollThreshold) {
				setIsVisible(false);
			}
			// Show navbar when scrolling up or at top
			else if (currentScrollY < lastScrollY || currentScrollY <= scrollThreshold) {
				setIsVisible(true);
			}

			setLastScrollY(currentScrollY);
		};

		const handleMouseMove = (e) => {
			// Show navbar when mouse is near the top (within 100px)
			if (e.clientY < 100) {
				setIsVisible(true);
			}
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		window.addEventListener("mousemove", handleMouseMove, { passive: true });

		return () => {
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, [lastScrollY]);

	const role = userProfile?.role?.toUpperCase() || "USER";

	const getRoleBadgeColor = (role) => {
		switch (role?.toUpperCase()) {
			case "ADMIN":
				return "admin";
			case "STAFF":
				return "staff";
			case "PATIENT":
				return "patient";
			default:
				return "default";
		}
	};

	const handleUserBubbleClick = () => {
		// Toggle dropdown for all views
		setShowUserMenu(!showUserMenu);
	};

	const patientMenu = [
		{ id: "dashboard", label: "Home", icon: "📊", path: "/patient" },
		{
			id: "appointments",
			label: "Appointments",
			icon: "📅",
			path: "/patient/appointments",
		},
		{
			id: "medical-history",
			label: "Medical History",
			icon: "🏥",
			path: "/patient/medical-history",
		},
		{ id: "settings", label: "Settings", icon: "⚙️", path: "/patient/settings" },
	];

	const staffMenu = [
		{ id: "dashboard", label: "Queue", icon: "📊", path: "/staff" },
		{
			id: "appointments",
			label: "Appointments",
			icon: "📅",
			path: "/staff/appointments",
		},
		{ id: "doctors", label: "Doctors", icon: "👨‍⚕️", path: "/staff/doctors" },
		{ id: "reports", label: "Reports", icon: "📈", path: "/staff/reports" },
		{
			id: "display",
			label: "Display",
			icon: "🖥️",
			path: "/staff/display",
			openInNewTab: true,
		},
		{ id: "settings", label: "Settings", icon: "⚙️", path: "/staff/settings" },
	];

	const adminMenu = [
		{ id: "dashboard", label: "Dashboard", icon: "📊", path: "/admin" },
		{ id: "users", label: "Users", icon: "👥", path: "/admin/users" },
		{ id: "clinics", label: "Clinics", icon: "🏥", path: "/admin/clinics" },
		{ id: "doctors", label: "Doctors", icon: "👨‍⚕️", path: "/admin/doctors" },
		{ id: "reports", label: "Reports", icon: "📈", path: "/admin/reports" },
		{ id: "settings", label: "Settings", icon: "⚙️", path: "/admin/settings" },
	];

	const getMenu = () => {
		switch (role) {
			case "PATIENT":
				return patientMenu;
			case "STAFF":
				return staffMenu;
			case "ADMIN":
				return adminMenu;
			default:
				return [];
		}
	};

	const menu = getMenu();
	const currentPath = location.pathname;

	const handleNavigation = (item) => {
		if (item.openInNewTab) {
			window.open(item.path, "_blank");
		} else {
			navigate(item.path);
		}
	};

	const isActive = (item) => {
		if (item.openInNewTab) return false;
		return (
			currentPath === item.path ||
			(item.id === "dashboard" &&
				(currentPath === "/patient" ||
					currentPath === "/staff" ||
					currentPath === "/admin" ||
					(currentPath.startsWith("/patient/") &&
						!currentPath.includes("/appointments") &&
						!currentPath.includes("/settings") &&
						!currentPath.includes("/medical-history")) ||
					(currentPath.startsWith("/staff/") &&
						!currentPath.includes("/appointments") &&
						!currentPath.includes("/doctors") &&
						!currentPath.includes("/settings") &&
						!currentPath.includes("/display") &&
						!currentPath.includes("/reports")) ||
					(currentPath.startsWith("/admin/") &&
						!currentPath.includes("/users") &&
						!currentPath.includes("/clinics") &&
						!currentPath.includes("/doctors") &&
						!currentPath.includes("/reports") &&
						!currentPath.includes("/settings")))) ||
			(item.id === "appointments" &&
				(currentPath.startsWith("/patient/appointments") ||
					currentPath.startsWith("/patient/book"))) ||
			(item.id === "medical-history" &&
				currentPath.startsWith("/patient/medical-history")) ||
			(item.path !== "/patient" &&
				item.path !== "/staff" &&
				item.path !== "/admin" &&
				currentPath.startsWith(item.path))
		);
	};

	return (
		<nav
			className={`navbar ${isVisible ? "navbar-visible" : "navbar-hidden"}`}
			onMouseEnter={() => setIsVisible(true)}
		>
			<div className="navbar-container">
				<div className="navbar-brand">
					<img src={logo} alt="MediQ Logo" className="brand-icon" />
				</div>

				<div className="navbar-menu">
					{menu.map((item) => (
						<button
							key={item.id}
							onClick={() => handleNavigation(item)}
							className={`navbar-menu-item ${isActive(item) ? "active" : ""}`}
						>
							<span className="navbar-menu-icon">{item.icon}</span>
							<span className="navbar-menu-label">{item.label}</span>
						</button>
					))}
				</div>

				<div className="navbar-user-section">
					<div className="navbar-user" onClick={handleUserBubbleClick}>
						<div className="user-avatar">{userProfile?.fname?.[0] || "U"}</div>
						<div className="user-details">
							<span className="user-name">
								{userProfile?.fname} {userProfile?.lname}
							</span>
							<span className={`role-badge role-${getRoleBadgeColor(role)}`}>
								{role}
							</span>
						</div>
						<svg
							className="dropdown-icon"
							width="20"
							height="20"
							viewBox="0 0 20 20"
							fill="none"
						>
							<path
								d="M5 7.5L10 12.5L15 7.5"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>

					{/* Dropdown menu for all views */}
					{showUserMenu && (
						<div className="user-dropdown">
							<div className="dropdown-header">
								<div className="dropdown-label">Signed in as</div>
								<div className="dropdown-email">{userProfile?.email}</div>
							</div>
							<div className="dropdown-divider"></div>
							<button onClick={handleSignOut} className="dropdown-item">
								<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
									<path
										d="M12.75 6L15.75 9L12.75 12M15 9H6.75M11.25 4.5C11.25 4.30109 11.171 4.11032 11.0303 3.96967C10.8897 3.82902 10.6989 3.75 10.5 3.75H4.5C4.30109 3.75 4.11032 3.82902 3.96967 3.96967C3.82902 4.11032 3.75 4.30109 3.75 4.5V13.5C3.75 13.6989 3.82902 13.8897 3.96967 14.0303C4.11032 14.171 4.30109 14.25 4.5 14.25H10.5C10.6989 14.25 10.8897 14.171 11.0303 14.0303C11.171 13.8897 11.25 13.6989 11.25 13.5V4.5Z"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								<span>Sign Out</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</nav>
	);
}
