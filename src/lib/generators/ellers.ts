import type { MazeGenerator } from './types';
import { Cell } from '$lib/Cell';
import type { Wall } from '$lib/Wall';
import type * as THREE from 'three';
import { removeWall } from '$lib/MazeGrid';

export class EllersGenerator implements MazeGenerator {
	private maze_grid: (Cell | Wall)[][] = [];
	private mazeMesh!: THREE.Mesh;
	private width = 0;
	private height = 0;
	private setId = new Map<Cell, number>();
	private nextSetId = 1;
	private row = 1; // current row (odd values)
	private phase: 'merge' | 'carve-down' | 'done' = 'merge';
	private col = 1; // current column for merge phase
	private setsToCarve: Map<number, Cell[]> = new Map();
	private carveQueue: { wallX: number; wallY: number }[] = [];

	init(maze_grid: (Cell | Wall)[][], _walls: Wall[], mazeMesh: THREE.Mesh): void {
		this.maze_grid = maze_grid;
		this.mazeMesh = mazeMesh;
		this.width = maze_grid.length;
		this.height = maze_grid[0]?.length ?? 0;
		this.setId = new Map();
		this.nextSetId = 1;
		this.row = 1;
		this.col = 1;
		this.phase = 'merge';
		this.setsToCarve = new Map();
		this.carveQueue = [];

		// Assign initial set IDs to first row
		for (let j = 1; j < this.width; j += 2) {
			const cell = maze_grid[j][1];
			if (cell instanceof Cell) {
				this.setId.set(cell, this.nextSetId++);
			}
		}
	}

	private getSet(cell: Cell): number {
		let id = this.setId.get(cell);
		if (id === undefined) {
			id = this.nextSetId++;
			this.setId.set(cell, id);
		}
		return id;
	}

	private mergeSet(oldId: number, newId: number) {
		for (const [cell, id] of this.setId) {
			if (id === oldId) this.setId.set(cell, newId);
		}
	}

	step(): boolean {
		if (this.phase === 'done') return false;

		const isLastRow = this.row + 2 >= this.height;

		if (this.phase === 'merge') {
			// Find next merge opportunity
			while (this.col + 2 < this.width) {
				const cellA = this.maze_grid[this.col][this.row];
				const cellB = this.maze_grid[this.col + 2][this.row];

				if (cellA instanceof Cell && cellB instanceof Cell) {
					const setA = this.getSet(cellA);
					const setB = this.getSet(cellB);

					// On last row, must merge different sets. Otherwise random.
					if (setA !== setB && (isLastRow || Math.random() < 0.5)) {
						const wall = this.maze_grid[this.col + 1][this.row];
						if (wall && !(wall instanceof Cell)) {
							removeWall(wall, this.mazeMesh);
						}
						this.mergeSet(setB, setA);
						this.col += 2;
						return true;
					}
				}
				this.col += 2;
			}

			// Done merging this row
			if (isLastRow) {
				this.phase = 'done';
				return false;
			}

			// Prepare carve-down phase: group cells by set
			this.setsToCarve = new Map();
			for (let j = 1; j < this.width; j += 2) {
				const cell = this.maze_grid[j][this.row];
				if (cell instanceof Cell) {
					const sid = this.getSet(cell);
					if (!this.setsToCarve.has(sid)) this.setsToCarve.set(sid, []);
					this.setsToCarve.get(sid)!.push(cell);
				}
			}

			// For each set, ensure at least one carves down
			this.carveQueue = [];
			for (const [sid, cells] of this.setsToCarve) {
				const shuffled = [...cells].sort(() => Math.random() - 0.5);
				const count = Math.max(1, Math.floor(Math.random() * shuffled.length) + 1);
				for (let i = 0; i < count; i++) {
					const cell = shuffled[i];
					const belowCell = this.maze_grid[cell.x]?.[this.row + 2];
					if (belowCell instanceof Cell) {
						this.setId.set(belowCell, sid);
						this.carveQueue.push({ wallX: cell.x, wallY: this.row + 1 });
					}
				}
			}

			this.phase = 'carve-down';
			return true;
		}

		if (this.phase === 'carve-down') {
			if (this.carveQueue.length > 0) {
				const { wallX, wallY } = this.carveQueue.pop()!;
				const wall = this.maze_grid[wallX][wallY];
				if (wall && !(wall instanceof Cell)) {
					removeWall(wall, this.mazeMesh);
				}
				return true;
			}

			// Move to next row
			this.row += 2;
			this.col = 1;

			// Assign new set IDs to unassigned cells in new row
			for (let j = 1; j < this.width; j += 2) {
				const cell = this.maze_grid[j][this.row];
				if (cell instanceof Cell && !this.setId.has(cell)) {
					this.setId.set(cell, this.nextSetId++);
				}
			}

			this.phase = 'merge';
			return true;
		}

		return false;
	}
}
