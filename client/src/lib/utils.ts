import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number to remove trailing .00
 * @param value - The number to format
 * @param decimals - Maximum number of decimal places (default: 2)
 * @returns Formatted number string without trailing zeros
 */
export function formatNumber(value: number | string, decimals: number = 2): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  
  // Format with specified decimals, then remove trailing zeros
  return num.toFixed(decimals).replace(/\.?0+$/, "");
}

/**
 * Format currency without trailing .00 (no $ sign)
 * @param amount - The amount to format
 * @returns Formatted currency string without $ sign
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0";
  
  const formatted = formatNumber(num, 2);
  return formatted;
}
