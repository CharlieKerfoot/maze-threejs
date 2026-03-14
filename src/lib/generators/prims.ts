import type { MazeGenerator } from './types';
import { Cell } from '$lib/Cell';
import type { Wall } from '$lib/Wall';
import type * as THREE from 'three';
import { getNeighborCells, removeWall } from '$lib/MazeGrid';

export class PrimsGenerator implements MazeGenerator {
	private maze_grid: (Cell | Wall)[][] = [];
	private mazeMesh!: THREE.Mesh;
	private inMaze = new Set<Cell>();
	private frontier: { wallX: number; wallY: number; cell: Cell }[] = [];

	init(maze_grid: (Cell | Wall)[][], _walls: Wall[], mazeMesh: THREE.Mesh): void {
		this.maze_grid = maze_grid;
		this.mazeMesh = mazeMesh;
		this.inMaze = new Set();
		this.frontier = [];

		const start = maze_grid[1][1];
		if (start instanceof Cell) {
			this.inMaze.add(start);
			this.addFrontier(start);
		}
	}

	private addFrontier(cell: Cell) {
		for (const n of getNeighborCells(cell.x, cell.y, this.maze_grid)) {
			if (!this.inMaze.has(n.cell)) {
				this.frontier.push(n);
			}
		}
	}

	step(): boolean {
		while (this.frontier.length > 0) {
			const idx = Math.floor(Math.random() * this.frontier.length);
			const { wallX, wallY, cell } = this.frontier[idx];
			this.frontier.splice(idx, 1);

			if (this.inMaze.has(cell)) continue;

			const wall = this.maze_grid[wallX][wallY];
			if (wall && !(wall instanceof Cell)) {
				removeWall(wall, this.mazeMesh);
			}

			this.inMaze.add(cell);
			this.addFrontier(cell);
			return true;
		}
		return false;
	}
}
