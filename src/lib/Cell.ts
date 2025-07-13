// implementation of a disjoint set
import { Mesh } from 'three';
export class Cell {
	x: number;
	y: number;
	rank: number;
	parent: Cell | null;
	mesh: Mesh;

	constructor(x: number, y: number, mesh: Mesh) {
		this.x = x;
		this.y = y;
		this.rank = 0;
		this.parent = null;
		this.mesh = mesh;
	}

	static find(c: Cell): Cell {
		if (!c.parent) return c;
		c.parent = Cell.find(c.parent);
		return c.parent;
	}

	static union(a: Cell, b: Cell) {
		a = Cell.find(a);
		b = Cell.find(b);

		if (a === b) return;

		if (a.rank < b.rank) {
			const temp = a
			a = b
			b = temp
		}

		b.parent = a;
		if (b.rank === a.rank) {
			a.rank++;
		}
	}
}
