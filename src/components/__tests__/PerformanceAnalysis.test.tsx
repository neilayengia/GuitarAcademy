import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PerformanceAnalysis from '../PerformanceAnalysis';
import { useAppStore } from '../../store/useAppStore';

describe('PerformanceAnalysis Component', () => {
    beforeEach(() => {
        // Reset the Zustand store before each test
        useAppStore.getState().resetProgress();
    });

    it('renders the header correctly', () => {
        render(
            <MemoryRouter>
                <PerformanceAnalysis />
            </MemoryRouter>
        );
        expect(screen.getByText('Performance Analysis')).toBeInTheDocument();
        expect(screen.getByText('Track your progress and identify areas for improvement.')).toBeInTheDocument();
    });

    it('displays zero states when no practice sessions exist', () => {
        render(
            <MemoryRouter>
                <PerformanceAnalysis />
            </MemoryRouter>
        );

        // Modules Unlocked (default is 2)
        expect(screen.getByText('Modules Unlocked')).toBeInTheDocument();

        // Empty state message
        expect(screen.getByText('No practice sessions yet. Start practicing to see your history here.')).toBeInTheDocument();
    });

    it('displays recent sessions from the store', () => {
        // Arrange: populate store with a fake session
        useAppStore.getState().recordPracticeSession({
            durationMinutes: 45,
            accuracy: 94,
            chordsPracticed: ['Cmaj7', 'Dm7', 'G7'],
            bpm: 100
        });

        render(
            <MemoryRouter>
                <PerformanceAnalysis />
            </MemoryRouter>
        );

        // Assert: the session topic should be visible
        expect(screen.getByText('Practiced: Cmaj7, Dm7, G7')).toBeInTheDocument();
        expect(screen.getByText('94%')).toBeInTheDocument();
    });
});
