import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navigation.css';

export default function Navigation() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Sticky header with slide animation on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.pageYOffset;
      const isScrolledDown = currentScrollPos > 80;
      
      setIsScrolled(isScrolledDown);
      setVisible(prevScrollPos > currentScrollPos || currentScrollPos < 10);
      setPrevScrollPos(currentScrollPos);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.user-menu') && !e.target.closest('.mobile-menu')) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserDropdownOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleUserDropdown = (e) => {
    e.stopPropagation();
    setUserDropdownOpen(!userDropdownOpen);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <nav className={`navigation ${
        isScrolled ? 'scrolled' : ''
      } ${visible ? '' : 'hidden'}`}>
        <div className="nav-container">
          {/* Logo */}
          <Link to="/" className="nav-logo">
            <span className="logo-icon">🗺️</span>
            <span className="logo-text">EventMap</span>
          </Link>
          
          {/* Desktop Menu */}
          <ul className="nav-menu desktop-menu">
            <li className="nav-item">
              <Link 
                to="/" 
                className={`nav-link ${isActive('/') ? 'active' : ''}`}
              >
                <span className="nav-icon">🗺️</span>
                Map
              </Link>
            </li>
            
            {currentUser ? (
              <>
                {(currentUser.role === 'organizer' || currentUser.role === 'admin') && (
                  <li className="nav-item">
                    <Link 
                      to="/create-event" 
                      className={`nav-link ${isActive('/create-event') ? 'active' : ''}`}
                    >
                      <span className="nav-icon">➕</span>
                      Create Event
                    </Link>
                  </li>
                )}
                
                {/* User Menu */}
                <li className="nav-item user-menu">
                  <button 
                    className="user-menu-button"
                    onClick={toggleUserDropdown}
                  >
                    <div className="user-avatar">
                      {getUserInitials(currentUser.name)}
                    </div>
                    <span className="user-name">{currentUser.name}</span>
                    <span className={`dropdown-arrow ${userDropdownOpen ? 'open' : ''}`}>▼</span>
                  </button>
                  
                  {/* User Dropdown */}
                  <div className={`user-dropdown ${userDropdownOpen ? 'open' : ''}`}>
                    <div className="dropdown-header">
                      <div className="user-avatar large">
                        {getUserInitials(currentUser.name)}
                      </div>
                      <div className="user-info">
                        <div className="user-name">{currentUser.name}</div>
                        <div className="user-email">{currentUser.email}</div>
                        <div className="user-role">{currentUser.role}</div>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <Link to="/profile" className="dropdown-item">
                      <span className="dropdown-icon">👤</span>
                      My Profile
                    </Link>
                    {currentUser.role === 'organizer' && (
                      <Link to="/profile?tab=organized" className="dropdown-item">
                        <span className="dropdown-icon">📅</span>
                        My Events
                      </Link>
                    )}
                    {currentUser.role === 'admin' && (
                      <Link to="/admin" className="dropdown-item">
                        <span className="dropdown-icon">⚙️</span>
                        Admin Panel
                      </Link>
                    )}
                    <div className="dropdown-divider"></div>
                    <button onClick={handleLogout} className="dropdown-item logout">
                      <span className="dropdown-icon">🚪</span>
                      Logout
                    </button>
                  </div>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link 
                    to="/login" 
                    className={`nav-link ${isActive('/login') ? 'active' : ''}`}
                  >
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link 
                    to="/register" 
                    className="nav-link btn-primary"
                  >
                    Get Started
                  </Link>
                </li>
              </>
            )}
          </ul>

          {/* Mobile Hamburger Button */}
          <button 
            className={`mobile-menu-button ${mobileMenuOpen ? 'open' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={toggleMobileMenu}></div>
      
      {/* Mobile Menu */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <span className="mobile-menu-title">Menu</span>
          <button className="mobile-menu-close" onClick={toggleMobileMenu}>×</button>
        </div>
        
        <ul className="mobile-menu-list">
          <li>
            <Link to="/" className={`mobile-menu-item ${isActive('/') ? 'active' : ''}`}>
              <span className="mobile-menu-icon">🗺️</span>
              Map
            </Link>
          </li>
          
          {currentUser ? (
            <>
              <li>
                <Link to="/profile" className={`mobile-menu-item ${isActive('/profile') ? 'active' : ''}`}>
                  <span className="mobile-menu-icon">👤</span>
                  Profile
                </Link>
              </li>
              
              {(currentUser.role === 'organizer' || currentUser.role === 'admin') && (
                <li>
                  <Link to="/create-event" className={`mobile-menu-item ${isActive('/create-event') ? 'active' : ''}`}>
                    <span className="mobile-menu-icon">➕</span>
                    Create Event
                  </Link>
                </li>
              )}
              
              {currentUser.role === 'admin' && (
                <li>
                  <Link to="/admin" className="mobile-menu-item">
                    <span className="mobile-menu-icon">⚙️</span>
                    Admin Panel
                  </Link>
                </li>
              )}
              
              <li className="mobile-menu-divider"></li>
              
              <li>
                <button onClick={handleLogout} className="mobile-menu-item logout">
                  <span className="mobile-menu-icon">🚪</span>
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/login" className={`mobile-menu-item ${isActive('/login') ? 'active' : ''}`}>
                  <span className="mobile-menu-icon">🔐</span>
                  Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="mobile-menu-item primary">
                  <span className="mobile-menu-icon">✨</span>
                  Get Started
                </Link>
              </li>
            </>
          )}
        </ul>
        
        {currentUser && (
          <div className="mobile-user-info">
            <div className="user-avatar">{getUserInitials(currentUser.name)}</div>
            <div>
              <div className="user-name">{currentUser.name}</div>
              <div className="user-role">{currentUser.role}</div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button for Create Event (Organizers only, mobile) */}
      {currentUser && (currentUser.role === 'organizer' || currentUser.role === 'admin') && (
        <Link to="/create-event" className="fab-button" aria-label="Create Event">
          <span className="fab-icon">+</span>
          <span className="fab-tooltip">Create Event</span>
        </Link>
      )}
    </>
  );
}