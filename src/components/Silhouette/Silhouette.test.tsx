import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Silhouette } from './Silhouette';

const testBase64Image =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('Silhouette', () => {
  it('renders the silhouette image', () => {
    render(<Silhouette src={testBase64Image} />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', testBase64Image);
  });

  it('uses default alt text', () => {
    render(<Silhouette src={testBase64Image} />);
    expect(screen.getByAltText('Aircraft silhouette')).toBeInTheDocument();
  });

  it('accepts custom alt text', () => {
    render(<Silhouette src={testBase64Image} alt="Custom alt text" />);
    expect(screen.getByAltText('Custom alt text')).toBeInTheDocument();
  });

  it('applies the silhouette class', () => {
    const { container } = render(<Silhouette src={testBase64Image} />);
    expect(container.querySelector('.silhouette')).toBeInTheDocument();
  });

  it('accepts additional className', () => {
    const { container } = render(
      <Silhouette src={testBase64Image} className="custom-class" />
    );
    expect(container.querySelector('.silhouette.custom-class')).toBeInTheDocument();
  });

  it('sets draggable to false on the image', () => {
    render(<Silhouette src={testBase64Image} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('draggable', 'false');
  });
});
