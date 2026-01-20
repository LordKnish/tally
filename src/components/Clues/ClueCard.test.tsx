import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ClueCard } from './ClueCard';

describe('ClueCard', () => {
  it('renders the title', () => {
    render(
      <ClueCard title="Test Title" variant="specs" revealed={false}>
        Content
      </ClueCard>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('shows placeholder when not revealed', () => {
    render(
      <ClueCard title="Test" variant="specs" revealed={false}>
        Hidden content
      </ClueCard>
    );
    expect(screen.getByText('?')).toBeInTheDocument();
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
  });

  it('shows content when revealed', () => {
    render(
      <ClueCard title="Test" variant="specs" revealed={true}>
        Revealed content
      </ClueCard>
    );
    expect(screen.getByText('Revealed content')).toBeInTheDocument();
    expect(screen.queryByText('?')).not.toBeInTheDocument();
  });

  it('applies specs variant class when revealed', () => {
    const { container } = render(
      <ClueCard title="Test" variant="specs" revealed={true}>
        Content
      </ClueCard>
    );
    expect(container.querySelector('.clue-card--specs')).toBeInTheDocument();
    expect(container.querySelector('.clue-card--revealed')).toBeInTheDocument();
  });

  it('applies context variant class when revealed', () => {
    const { container } = render(
      <ClueCard title="Test" variant="context" revealed={true}>
        Content
      </ClueCard>
    );
    expect(container.querySelector('.clue-card--context')).toBeInTheDocument();
  });

  it('applies trivia variant class when revealed', () => {
    const { container } = render(
      <ClueCard title="Test" variant="trivia" revealed={true}>
        Content
      </ClueCard>
    );
    expect(container.querySelector('.clue-card--trivia')).toBeInTheDocument();
  });

  it('applies photo variant class when revealed', () => {
    const { container } = render(
      <ClueCard title="Test" variant="photo" revealed={true}>
        Content
      </ClueCard>
    );
    expect(container.querySelector('.clue-card--photo')).toBeInTheDocument();
  });

  it('does not apply revealed class when not revealed', () => {
    const { container } = render(
      <ClueCard title="Test" variant="specs" revealed={false}>
        Content
      </ClueCard>
    );
    expect(
      container.querySelector('.clue-card--revealed')
    ).not.toBeInTheDocument();
  });

  it('has accessible region role with title as label', () => {
    render(
      <ClueCard title="My Clue" variant="specs" revealed={true}>
        Content
      </ClueCard>
    );
    expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'My Clue');
  });

  it('accepts additional className', () => {
    const { container } = render(
      <ClueCard
        title="Test"
        variant="specs"
        revealed={true}
        className="custom-class"
      >
        Content
      </ClueCard>
    );
    expect(
      container.querySelector('.clue-card.custom-class')
    ).toBeInTheDocument();
  });
});
