import './Spinner.css';

export interface SpinnerProps {
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS class name */
  className?: string;
}

/**
 * Simple loading spinner component.
 * Displays an animated circular loader.
 */
export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`spinner spinner--${size} ${className}`.trim()}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
