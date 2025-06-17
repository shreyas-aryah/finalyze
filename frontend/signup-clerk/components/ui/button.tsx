
export function Button({ children, variant = "default", className = "", ...props }) {
  let base = "px-4 py-2 rounded font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  let color = "";
  if (variant === "default") {
    color = "text-white";
    base += " bg-[color:var(--primary-color,#2563eb)] hover:bg-[color:var(--primary-color,#1d4ed8)]";
  } else if (variant === "outline") {
    color = "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50";
  } else if (variant === "danger") {
    color = "bg-red-600 text-white hover:bg-red-700";
  }
  return (
    <button className={`${base} ${color} ${className}`} {...props}>
      {children}
    </button>
  );
}