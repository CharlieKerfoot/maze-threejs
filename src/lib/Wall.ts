import { Cell } from './Cell';
import { Mesh } from 'three';

export class Wall {
	a: Cell;
	b: Cell;
	orientation: -1 | 0 | 1; // -1 = removed | 0 = horizontal | 1 = vertical
	mesh: Mesh;

	constructor(a: Cell, b: Cell, orientation: -1 | 0 | 1, mesh: Mesh) {
		this.a = a;
		this.b = b;
		this.orientation = orientation;
		this.mesh = mesh;
	}
}
