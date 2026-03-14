import type { Solver, SolverStep } from './types';
import type { Cell } from '$lib/Cell';
import type { Wall } from '$lib/Wall';
import { isPassable } from '$lib/MazeGrid';

export class BFSSolver implements Solver {
	private maze_grid: (Cell | Wall)[][] = [];
	private goalX = 0;
	private goalY = 0;
	private queue: { x: number; y: number }[] = [];
	private visited = new Set<string>();
	private parent = new Map<string, { x: number; y: number }>();
	private found = false;
	private solutionPath: { x: number; y: number }[] = [];

	init(
		maze_grid: (Cell | Wall)[][],
		startX: number,
		startY: number,
		goalX: number,
		goalY: number
	): void {
		this.maze_grid = maze_grid;
		this.goalX = goalX;
		this.goalY = goalY;
		this.queue = [{ x: startX, y: startY }];
		this.visited = new Set([`${startX},${startY}`]);
		this.parent = new Map();
		this.found = false;
		this.solutionPath = [];
	}

	step(): SolverStep | null {
		if (this.solutionPath.length > 0) {
			const { x, y } = this.solutionPath.shift()!;
			return { type: 'solution', x, y };
		}

		if (this.found || this.queue.length === 0) return null;

		const { x, y } = this.queue.shift()!;

		if (x === this.goalX && y === this.goalY) {
			this.found = true;
			// Backtrack
			let cur: { x: number; y: number } | undefined = { x, y };
			while (cur) {
				this.solutionPath.unshift(cur);
				cur = this.parent.get(`${cur.x},${cur.y}`);
			}
			const first = this.solutionPath.shift()!;
			return { type: 'solution', x: first.x, y: first.y };
		}

		const dirs = [
			{ dx: -1, dy: 0 },
			{ dx: 1, dy: 0 },
			{ dx: 0, dy: -1 },
			{ dx: 0, dy: 1 }
		];

		for (const { dx, dy } of dirs) {
			const nx = x + dx;
			const ny = y + dy;
			const key = `${nx},${ny}`;
			if (!this.visited.has(key) && isPassable(this.maze_grid[nx]?.[ny])) {
				this.visited.add(key);
				this.parent.set(key, { x, y });
				this.queue.push({ x: nx, y: ny });
			}
		}

		return { type: 'visit', x, y };
	}
}
