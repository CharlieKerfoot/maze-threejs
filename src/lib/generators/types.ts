import type { Cell } from '$lib/Cell';
import type { Wall } from '$lib/Wall';
import type * as THREE from 'three';

export interface MazeGenerator {
	init(maze_grid: (Cell | Wall)[][], walls: Wall[], mazeMesh: THREE.Mesh): void;
	step(): boolean; // returns false when complete
}
