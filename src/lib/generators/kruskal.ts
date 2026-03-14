import type { MazeGenerator } from './types';
import type { Cell } from '$lib/Cell';
import { Cell as CellClass } from '$lib/Cell';
import type { Wall } from '$lib/Wall';
import type * as THREE from 'three';

export class KruskalGenerator implements MazeGenerator {
	private walls: Wall[] = [];
	private mazeMesh!: THREE.Mesh;

	init(maze_grid: (Cell | Wall)[][], walls: Wall[], mazeMesh: THREE.Mesh): void {
		// Fisher-Yates shuffle
		for (let i = walls.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[walls[i], walls[j]] = [walls[j], walls[i]];
		}
		this.walls = walls;
		this.mazeMesh = mazeMesh;
	}

	step(): boolean {
		while (this.walls.length > 0) {
			const w = this.walls.pop()!;
			if (CellClass.find(w.a) === CellClass.find(w.b)) continue;

			w.orientation = -1;
			this.mazeMesh.remove(w.mesh);
			this.mazeMesh.remove(w.a.mesh);
			this.mazeMesh.remove(w.b.mesh);
			CellClass.union(w.a, w.b);
			return true;
		}
		return false;
	}
}
