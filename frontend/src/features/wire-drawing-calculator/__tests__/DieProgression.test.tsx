import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DieProgression from '../components/DieProgression';

describe('DieProgression Component', () => {
  it('renders nothing when dies array is empty', () => {
    const { container } = render(<DieProgression dies={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders schematic drafting pipeline with all pass cards and schedule badge', () => {
    const dies = [4.5, 3.8, 3.2, 2.7];
    render(<DieProgression dies={dies} />);

    expect(screen.getByText('Schematic Drafting Pipeline')).toBeInTheDocument();
    expect(screen.getByLabelText('4 pass schedule')).toHaveTextContent('4 PASS SCHEDULE');
    expect(screen.getByText(/Drag to sequence passes/i)).toBeInTheDocument();

    expect(screen.getByTestId('die-card-0')).toHaveAccessibleName('Pass 1, inlet, 4.500 millimeters');
    expect(screen.getByTestId('die-card-1')).toHaveAccessibleName('Pass 2, die station, 3.800 millimeters');
    expect(screen.getByTestId('die-card-2')).toHaveAccessibleName('Pass 3, die station, 3.200 millimeters');
    expect(screen.getByTestId('die-card-3')).toHaveAccessibleName('Pass 4, finish, 2.700 millimeters');

    expect(screen.getByText('Ø 4.500')).toBeInTheDocument();
    expect(screen.getByText('Ø 3.800')).toBeInTheDocument();
    expect(screen.getByText('Ø 3.200')).toBeInTheDocument();
    expect(screen.getByText('Ø 2.700')).toBeInTheDocument();
  });

  it('calculates and displays reduction and elongation percentages in connectors', () => {
    const dies = [4.0, 3.0];
    render(<DieProgression dies={dies} />);

    // Area reduction: ((16 - 9) / 16) * 100 = 43.75% -> -43.8%
    // Elongation: ((16 / 9) - 1) * 100 = 77.78% -> +77.8%
    expect(screen.getByText('-43.8%')).toBeInTheDocument();
    expect(screen.getByText('+77.8%')).toBeInTheDocument();
  });

  it('shows delete button on pass card hover and removes die on click', () => {
    const dies = [4.5, 3.8, 3.2];
    const onDiesChange = vi.fn();
    render(<DieProgression dies={dies} onDiesChange={onDiesChange} />);

    const pass2Card = screen.getByTestId('die-card-1');
    fireEvent.mouseEnter(pass2Card);

    const deleteBtn = screen.getByLabelText('Remove pass 2');
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    expect(onDiesChange).toHaveBeenCalledWith([4.5, 3.2]);
  });

  it('shows insert button on connector hover and inserts intermediate die on click', () => {
    const dies = [4.0, 3.0];
    const onDiesChange = vi.fn();
    render(<DieProgression dies={dies} onDiesChange={onDiesChange} />);

    const connector = screen.getByTestId('die-connector-0');
    expect(connector).toBeInTheDocument();

    fireEvent.mouseEnter(connector);

    const insertBtn = screen.getByTitle('Insert pass size between 4 and 3');
    expect(insertBtn).toBeInTheDocument();

    fireEvent.click(insertBtn);
    // Midpoint between 4.0 and 3.0 is 3.5
    expect(onDiesChange).toHaveBeenCalledWith([4.0, 3.5, 3.0]);
  });

  it('supports drag-and-drop reordering of passes', () => {
    const dies = [4.0, 3.0, 2.0];
    const onDiesChange = vi.fn();
    render(<DieProgression dies={dies} onDiesChange={onDiesChange} />);

    const pass1 = screen.getByTestId('die-card-0');
    const pass2 = screen.getByTestId('die-card-1');

    // Drag start on pass 1 (index 0)
    fireEvent.dragStart(pass1);

    // Drag enter on pass 2 (index 1)
    fireEvent.dragEnter(pass2);
    expect(onDiesChange).toHaveBeenCalledWith([3.0, 4.0, 2.0]);

    // Drag end
    fireEvent.dragEnd(pass1);
  });

  it('sorts passes in descending order when clicking Sort (Big ➔ Small) button', () => {
    const dies = [2.5, 4.0, 3.2];
    const onDiesChange = vi.fn();
    render(<DieProgression dies={dies} onDiesChange={onDiesChange} />);

    const sortBtn = screen.getByTestId('sort-descending-btn');
    expect(sortBtn).toBeInTheDocument();

    fireEvent.click(sortBtn);
    expect(onDiesChange).toHaveBeenCalledWith([4.0, 3.2, 2.5]);
  });

  it('displays inverted expansion percentage when passes are out of reduction order', () => {
    const dies = [2.0, 3.0];
    render(<DieProgression dies={dies} />);

    // When entry is 2.0 and exit is 3.0, reduction is negative: ((4 - 9) / 4) * 100 = -125.0%
    // Displays as +125.0%
    expect(screen.getByText('+125.0%')).toBeInTheDocument();
  });
});
