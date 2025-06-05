import React from "react";

export function Button({ children, variant = "default", className = "", ...props }) {
  const base = "px-4 py-2 rounded text-sm font-medium";
  const styles = {
    default: "bg-black text-white hover:bg-gray-800",
    secondary: "bg-gray-100 text-black hover:bg-gray-200",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}