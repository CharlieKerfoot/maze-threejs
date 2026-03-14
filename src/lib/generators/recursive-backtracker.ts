import type { MazeGenerator } from './types';
import { Cell } from '$lib/Cell';
import type { Wall } from '$lib/Wall';
import type * as THREE from 'three';
import { getNeighborCells, removeWall } from '$lib/MazeGrid';

export class RecursiveBacktrackerGenerator implements MazeGenerator {
	private maze_grid: (Cell | Wall)[][] = [];
	private mazeMesh!: THREE.Mesh;
	private visited = new Set<Cell>();
	private stack: Cell[] = [];

	init(maze_grid: (Cell | Wall)[][], _walls: Wall[], mazeMesh: THREE.Mesh): void {
		this.maze_grid = maze_grid;
		this.mazeMesh = mazeMesh;
		this.visited = new Set();
		this.stack = [];

		const start = maze_grid[1][1];
		if (start instanceof Cell) {
			this.visited.add(start);
			this.stack.push(start);
		}
	}

	step(): boolean {
		if (this.stack.length === 0) return false;

		const current = this.stack[this.stack.length - 1];
		const neighbors = getNeighborCells(current.x, current.y, this.maze_grid).filter(
			(n) => !this.visited.has(n.cell)
		);

		if (neighbors.length === 0) {
			this.stack.pop();
			return this.stack.length > 0;
		}

		const { cell, wallX, wallY } = neighbors[Math.floor(Math.random() * neighbors.length)];
		const wall = this.maze_grid[wallX][wallY];
		if (wall && !(wall instanceof Cell)) {
			removeWall(wall, this.mazeMesh);
		}

		this.visited.add(cell);
		this.stack.push(cell);
		return true;
	}
}
