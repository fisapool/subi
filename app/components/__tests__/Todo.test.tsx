import React from 'react';
import { render, screen } from '@testing-library/react';
import Todo from '../Todo';

describe('Todo Component', () => {
  it('renders without crashing', () => {
    render(<Todo />);
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('displays the title', () => {
    render(<Todo />);
    expect(screen.getByText(/Todo List/i)).toBeInTheDocument();
  });
}); 