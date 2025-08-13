import React from 'react';
import ClickableElement from './ClickableElement';

const ClickableTableRow = ({ 
  href, 
  onClick, 
  className = '', 
  children,
  handleNav,
  navPath,
  ...props 
}) => {
  return (
    <ClickableElement
      as="tr"
      href={href}
      onClick={onClick}
      handleNav={handleNav}
      navPath={navPath}
      className={className}
      {...props}
    >
      {children}
    </ClickableElement>
  );
};

export default ClickableTableRow;