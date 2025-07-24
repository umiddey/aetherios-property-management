import React from 'react';
import { useNavigate } from 'react-router-dom';

const ClickableElement = ({ 
  href, 
  onClick, 
  className = '', 
  children,
  handleNav,
  navPath,
  as: Component = 'div',
  ...props 
}) => {
  const navigate = useNavigate();

  const getTargetUrl = () => {
    if (href) return href;
    if (navPath) return navPath.startsWith('/') ? navPath : `/${navPath}`;
    return null;
  };

  const targetUrl = getTargetUrl();

  // If we have a target URL, render as a link for proper browser behavior
  if (targetUrl && (Component === 'div' || Component === 'button' || Component === 'tr')) {
    return (
      <a
        href={targetUrl}
        className={`cursor-pointer ${className} block no-underline`}
        onClick={(e) => {
          // Prevent default link behavior for normal clicks
          if (!e.ctrlKey && !e.metaKey && e.button !== 1) {
            e.preventDefault();
            
            if (onClick) {
              onClick(e);
            } else if (handleNav && navPath) {
              handleNav(navPath);
            } else {
              navigate(targetUrl);
            }
          }
          // Let ctrl+click, cmd+click, middle-click work naturally
        }}
        style={{
          textDecoration: 'none',
          color: 'inherit'
        }}
        {...props}
      >
        <Component
          className="w-full h-full"
          style={{ 
            display: Component === 'tr' ? 'table-row' : 'block',
            pointerEvents: 'none' // Prevent double clicks
          }}
        >
          {children}
        </Component>
      </a>
    );
  }

  // Fallback for non-navigational elements
  return (
    <Component
      className={`cursor-pointer ${className}`}
      onClick={(e) => {
        if (onClick) {
          onClick(e);
        } else if (handleNav && navPath) {
          handleNav(navPath);
        } else if (href) {
          navigate(href);
        }
      }}
      {...props}
    >
      {children}
    </Component>
  );
};

export default ClickableElement;