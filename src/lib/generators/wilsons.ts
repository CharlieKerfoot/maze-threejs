import type { MazeGenerator } from './types';
import { Cell } from '$lib/Cell';
import type { Wall } from '$lib/Wall';
import type * as THREE from 'three';
import { getNeighborCells, removeWall } from '$lib/MazeGrid';

export class WilsonsGenerator implements MazeGenerator {
	private maze_grid: (Cell | Wall)[][] = [];
	private mazeMesh!: THREE.Mesh;
	private inMaze = new Set<Cell>();
	private allCells: Cell[] = [];
	private unvisitedIdx = 0;
	private carveQueue: { wallX: number; wallY: number }[] = [];

	init(maze_grid: (Cell | Wall)[][], _walls: Wall[], mazeMesh: THREE.Mesh): void {
		this.maze_grid = maze_grid;
		this.mazeMesh = mazeMesh;
		this.inMaze = new Set();
		this.allCells = [];
		this.carveQueue = [];
		this.unvisitedIdx = 0;

		for (let j = 1; j < maze_grid.length; j += 2) {
			for (let i = 1; i < (maze_grid[j]?.length ?? 0); i += 2) {
				const tile = maze_grid[j][i];
				if (tile instanceof Cell) this.allCells.push(tile);
			}
		}

		// Shuffle so the initial maze cell and walk order are random
		for (let i = this.allCells.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.allCells[i], this.allCells[j]] = [this.allCells[j], this.allCells[i]];
		}

		if (this.allCells.length > 0) {
			this.inMaze.add(this.allCells[0]);
			this.unvisitedIdx = 1;
		}
	}

	step(): boolean {
		// If we have walls queued to carve, carve one per step (animated)
		if (this.carveQueue.length > 0) {
			const { wallX, wallY } = this.carveQueue.shift()!;
			const wall = this.maze_grid[wallX][wallY];
			if (wall && !(wall instanceof Cell)) {
				removeWall(wall, this.mazeMesh);
			}
			return true;
		}

		// Find next unvisited cell
		while (this.unvisitedIdx < this.allCells.length) {
			if (!this.inMaze.has(this.allCells[this.unvisitedIdx])) break;
			this.unvisitedIdx++;
		}
		if (this.unvisitedIdx >= this.allCells.length) return false;

		// Do the entire loop-erased random walk synchronously (walks aren't visually interesting)
		const start = this.allCells[this.unvisitedIdx];
		const path = this.loopErasedWalk(start);

		// Queue up the walls to carve (these get animated one per step)
		for (let i = 0; i < path.length - 1; i++) {
			const a = path[i];
			const b = path[i + 1];
			this.carveQueue.push({ wallX: (a.x + b.x) / 2, wallY: (a.y + b.y) / 2 });
			this.inMaze.add(a);
		}

		return this.carveQueue.length > 0 || this.unvisitedIdx < this.allCells.length;
	}

	private loopErasedWalk(start: Cell): Cell[] {
		// Walk randomly until we hit a cell in the maze, erasing loops as we go
		// Use a map from cell -> next cell in the walk direction for efficient loop erasure
		const next = new Map<Cell, Cell>();
		let current = start;

		while (!this.inMaze.has(current)) {
			const neighbors = getNeighborCells(current.x, current.y, this.maze_grid);
			const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
			next.set(current, neighbor.cell);
			current = neighbor.cell;
		}

		// Reconstruct the loop-erased path by following the `next` pointers from start
		const path: Cell[] = [];
		let c: Cell = start;
		while (!this.inMaze.has(c)) {
			path.push(c);
			c = next.get(c)!;
		}
		path.push(c); // the maze cell we connected to

		return path;
	}
}
