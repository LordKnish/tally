import { Button } from '@/components/ui/button';

export interface SubmitButtonProps {
  /** Click handler */
  onClick: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
}

/**
 * Submit button for confirming an aircraft guess.
 * Uses shadcn Button with large touch target for accessibility.
 */
export function SubmitButton({ onClick, disabled = false }: SubmitButtonProps) {
  return (
    <Button
      type="button"
      size="lg"
      onClick={onClick}
      disabled={disabled}
      className="submit-button"
      aria-label="Submit guess"
    >
      Submit
    </Button>
  );
}
