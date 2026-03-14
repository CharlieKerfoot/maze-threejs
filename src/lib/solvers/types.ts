import type { Cell } from '$lib/Cell';
import type { Wall } from '$lib/Wall';

export interface SolverStep {
	type: 'visit' | 'solution';
	x: number;
	y: number;
}

export interface Solver {
	init(
		maze_grid: (Cell | Wall)[][],
		startX: number,
		startY: number,
		goalX: number,
		goalY: number
	): void;
	step(): SolverStep | null;
}
