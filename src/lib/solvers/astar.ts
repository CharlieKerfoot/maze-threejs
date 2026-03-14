import type { Solver, SolverStep } from './types';
import type { Cell } from '$lib/Cell';
import type { Wall } from '$lib/Wall';
import { isPassable } from '$lib/MazeGrid';

interface Node {
	x: number;
	y: number;
	g: number;
	f: number;
}

export class AStarSolver implements Solver {
	private maze_grid: (Cell | Wall)[][] = [];
	private goalX = 0;
	private goalY = 0;
	private open: Node[] = [];
	private closed = new Set<string>();
	private gScore = new Map<string, number>();
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
		this.closed = new Set();
		this.gScore = new Map([[`${startX},${startY}`, 0]]);
		this.parent = new Map();
		this.found = false;
		this.solutionPath = [];

		const h = Math.abs(startX - goalX) + Math.abs(startY - goalY);
		this.open = [{ x: startX, y: startY, g: 0, f: h }];
	}

	step(): SolverStep | null {
		if (this.solutionPath.length > 0) {
			const { x, y } = this.solutionPath.shift()!;
			return { type: 'solution', x, y };
		}

		if (this.found || this.open.length === 0) return null;

		// Find node with lowest f
		let bestIdx = 0;
		for (let i = 1; i < this.open.length; i++) {
			if (this.open[i].f < this.open[bestIdx].f) bestIdx = i;
		}
		const current = this.open.splice(bestIdx, 1)[0];
		const { x, y, g } = current;
		const key = `${x},${y}`;

		if (this.closed.has(key)) return this.step();
		this.closed.add(key);

		if (x === this.goalX && y === this.goalY) {
			this.found = true;
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
			const nkey = `${nx},${ny}`;

			if (this.closed.has(nkey) || !isPassable(this.maze_grid[nx]?.[ny])) continue;

			const ng = g + 1;
			const existing = this.gScore.get(nkey);
			if (existing !== undefined && ng >= existing) continue;

			this.gScore.set(nkey, ng);
			this.parent.set(nkey, { x, y });
			const h = Math.abs(nx - this.goalX) + Math.abs(ny - this.goalY);
			this.open.push({ x: nx, y: ny, g: ng, f: ng + h });
		}

		return { type: 'visit', x, y };
	}
}
