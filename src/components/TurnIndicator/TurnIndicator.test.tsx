import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TurnIndicator } from './TurnIndicator';

describe('TurnIndicator', () => {
  it('renders 5 turn dots by default', () => {
    const { container } = render(<TurnIndicator currentTurn={1} />);
    const dots = container.querySelectorAll('.turn-indicator__dot');
    expect(dots).toHaveLength(5);
  });

  it('renders custom number of turns', () => {
    const { container } = render(<TurnIndicator currentTurn={1} totalTurns={3} />);
    const dots = container.querySelectorAll('.turn-indicator__dot');
    expect(dots).toHaveLength(3);
  });

  it('marks current turn with current state', () => {
    const { container } = render(<TurnIndicator currentTurn={3} />);
    const currentDot = container.querySelector('.turn-indicator__dot--current');
    expect(currentDot).toBeInTheDocument();
    // Should be the 3rd dot (index 2)
    const dots = container.querySelectorAll('.turn-indicator__dot');
    expect(dots[2]).toHaveClass('turn-indicator__dot--current');
  });

  it('marks past turns as wrong when no guessResults', () => {
    const { container } = render(<TurnIndicator currentTurn={3} />);
    const dots = container.querySelectorAll('.turn-indicator__dot');
    expect(dots[0]).toHaveClass('turn-indicator__dot--wrong');
    expect(dots[1]).toHaveClass('turn-indicator__dot--wrong');
  });

  it('marks past turns based on guessResults', () => {
    const { container } = render(
      <TurnIndicator
        currentTurn={4}
        guessResults={['wrong', 'correct', 'wrong']}
      />
    );
    const dots = container.querySelectorAll('.turn-indicator__dot');
    expect(dots[0]).toHaveClass('turn-indicator__dot--wrong');
    expect(dots[1]).toHaveClass('turn-indicator__dot--correct');
    expect(dots[2]).toHaveClass('turn-indicator__dot--wrong');
    expect(dots[3]).toHaveClass('turn-indicator__dot--current');
  });

  it('marks future turns as upcoming', () => {
    const { container } = render(<TurnIndicator currentTurn={2} />);
    const dots = container.querySelectorAll('.turn-indicator__dot');
    expect(dots[2]).toHaveClass('turn-indicator__dot--upcoming');
    expect(dots[3]).toHaveClass('turn-indicator__dot--upcoming');
    expect(dots[4]).toHaveClass('turn-indicator__dot--upcoming');
  });

  it('has accessible label with turn information', () => {
    render(<TurnIndicator currentTurn={3} totalTurns={5} />);
    expect(screen.getByRole('group')).toHaveAttribute(
      'aria-label',
      'Turn 3 of 5'
    );
  });

  it('accepts additional className', () => {
    const { container } = render(
      <TurnIndicator currentTurn={1} className="custom-class" />
    );
    expect(
      container.querySelector('.turn-indicator.custom-class')
    ).toBeInTheDocument();
  });
});
