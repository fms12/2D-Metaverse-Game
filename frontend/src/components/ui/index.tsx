// =============================================================================
// REUSABLE UI COMPONENTS (src/components/ui/)
// =============================================================================
// These are the building blocks of our UI — Button, Input, Modal.
//
// 🎓 WHY REUSABLE COMPONENTS?
// Instead of writing the same button styles 50 times, we create ONE Button component
// with all the variants (primary, danger, ghost) and reuse it everywhere.
// This is the "DRY" principle: Don't Repeat Yourself.
//
// 🎓 TYPESCRIPT INTERFACES FOR PROPS:
// React components receive data through "props" (properties).
// We define TypeScript interfaces for props to get:
//   - Type checking (can't pass a number where a string is expected)
//   - Autocomplete in the editor
//   - Self-documenting code
// =============================================================================

import {
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
} from "react";
import { clsx } from "clsx";

// =============================================================================
// BUTTON COMPONENT
// =============================================================================
// ButtonHTMLAttributes<HTMLButtonElement> means this component accepts ALL
// standard HTML button attributes (onClick, disabled, type, etc.) PLUS our extras.
// =============================================================================
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      // clsx: Combines class names conditionally.
      // Instead of: `"btn ${variant === 'primary' ? 'btn-primary' : ''} ${disabled ? 'opacity-50' : ''}`
      // We write: clsx({ "btn-primary": variant === "primary", "opacity-50": disabled })
      className={clsx(
        // Base styles always applied
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-metaverse-bg",

        // Size variants
        {
          "px-3 py-1.5 text-sm": size === "sm",
          "px-4 py-2 text-sm": size === "md",
          "px-6 py-3 text-base": size === "lg",
        },

        // Color/style variants
        {
          // Primary: Purple/accent fill
          "bg-metaverse-accent hover:bg-metaverse-accent-hover text-white focus:ring-metaverse-accent":
            variant === "primary",

          // Secondary: Outlined
          "border border-metaverse-border bg-transparent hover:bg-metaverse-surface text-white focus:ring-metaverse-border":
            variant === "secondary",

          // Danger: Red for destructive actions
          "bg-metaverse-danger hover:bg-red-600 text-white focus:ring-metaverse-danger":
            variant === "danger",

          // Ghost: No background, just text
          "bg-transparent hover:bg-metaverse-surface text-metaverse-muted hover:text-white":
            variant === "ghost",
        },

        // Disabled state
        {
          "opacity-50 cursor-not-allowed pointer-events-none":
            disabled || isLoading,
        },

        // Allow additional custom classes via className prop
        className,
      )}
      disabled={disabled || isLoading}
      {...rest}
    >
      {/* Loading spinner */}
      {isLoading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

// =============================================================================
// INPUT COMPONENT
// =============================================================================
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...rest }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {/* Label above the input */}
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-300">
          {label}
        </label>
      )}

      <input
        id={inputId}
        className={clsx(
          // Base input styles
          "w-full rounded-lg border px-4 py-2.5 text-sm text-white placeholder-metaverse-muted",
          "bg-metaverse-surface/60 backdrop-blur-sm",
          "transition-colors duration-200",
          "focus:outline-none focus:ring-2",

          // Error state vs normal state
          error
            ? "border-metaverse-danger focus:ring-metaverse-danger/50"
            : "border-metaverse-border focus:border-metaverse-accent focus:ring-metaverse-accent/30",

          className,
        )}
        {...rest}
      />

      {/* Error message below the input */}
      {error && <p className="text-xs text-metaverse-danger">{error}</p>}
    </div>
  );
}

// =============================================================================
// MODAL COMPONENT
// =============================================================================
// A modal is a dialog box that appears ON TOP of the page content.
// Clicking outside (the overlay) closes it.
// =============================================================================
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null; // Don't render if not open (performance optimization)

  return (
    // Overlay: Dark semi-transparent background that covers the whole screen
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose} // Click overlay → close
    >
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal box */}
      <div
        className="relative z-10 glass-card w-full max-w-md mx-4 p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()} // Don't close when clicking INSIDE the modal
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-metaverse-muted hover:text-white transition-colors p-1 rounded-md hover:bg-metaverse-surface"
          >
            ✕
          </button>
        </div>

        {/* Modal content */}
        {children}
      </div>
    </div>
  );
}
