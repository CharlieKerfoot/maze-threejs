import * as THREE from 'three';
import { Cell } from './Cell';
import { Wall } from './Wall';

export interface GridResult {
	maze_grid: (Cell | Wall)[][];
	walls: Wall[];
	mazeMesh: THREE.Mesh;
	wall_width: number;
	wall_height: number;
}

export interface Neighbor {
	cell: Cell;
	wallX: number;
	wallY: number;
}

const BG_SIZE = 128;

export function buildGrid(
	width: number,
	height: number,
	depth: number,
	scene: THREE.Scene
): GridResult {
	const light = new THREE.DirectionalLight(0xffffff, 4);
	light.position.set(75, 75, 250);
	light.target.position.set(BG_SIZE / 2, BG_SIZE / 2, 0);
	light.castShadow = true;
	light.shadow.mapSize.width = 1024;
	light.shadow.mapSize.height = 1024;
	light.shadow.camera.left = -BG_SIZE;
	light.shadow.camera.bottom = -BG_SIZE;
	scene.add(light);
	scene.add(light.target);

	const wall_width = BG_SIZE / width;
	const wall_height = BG_SIZE / height;

	const maze_geometry = new THREE.BoxGeometry(BG_SIZE, BG_SIZE, 1);
	const maze_material = new THREE.MeshStandardMaterial({ color: 'rgb(0,150,155)' });
	const mazeMesh = new THREE.Mesh(maze_geometry, maze_material);
	mazeMesh.receiveShadow = true;
	scene.add(mazeMesh);

	const wall_geo = new THREE.BoxGeometry(wall_width, wall_height, depth);
	wall_geo.translate((BG_SIZE - wall_width) / -2, (BG_SIZE - wall_height) / -2, 1);
	const wall_mat = new THREE.MeshStandardMaterial({ color: 'black' });

	const maze_grid: (Cell | Wall)[][] = [];
	const walls: Wall[] = [];

	for (let j = 0; j < width; j++) {
		maze_grid[j] = new Array(height);
	}

	// Create cells at odd,odd positions
	for (let i = 1; i < height; i += 2) {
		for (let j = 1; j < width; j += 2) {
			const mesh = new THREE.Mesh(wall_geo, wall_mat);
			mesh.position.x = j * wall_width;
			mesh.position.y = (height - 1 - i) * wall_height;
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mazeMesh.add(mesh);

			const cell = new Cell(j, i, mesh);
			maze_grid[j][i] = cell;
		}
	}

	// Create walls
	for (let i = 0; i < height; i++) {
		for (let j = 0; j < width; j++) {
			if (i % 2 == 1 && j % 2 == 1) continue;

			const mesh = new THREE.Mesh(wall_geo, wall_mat);
			mesh.position.x = j * wall_width;
			mesh.position.y = (height - 1 - i) * wall_height;
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mazeMesh.add(mesh);

			if (i == 0 || j == 0 || i == height - 1 || j == width - 1) continue;

			if (i % 2 == 1) {
				const left = maze_grid[j - 1][i];
				const right = maze_grid[j + 1][i];
				if (left instanceof Cell && right instanceof Cell) {
					const wall = new Wall(left, right, 1, mesh);
					maze_grid[j][i] = wall;
					walls.push(wall);
				}
			}

			if (j % 2 == 1) {
				const up = maze_grid[j][i - 1];
				const down = maze_grid[j][i + 1];
				if (up instanceof Cell && down instanceof Cell) {
					const wall = new Wall(up, down, 0, mesh);
					maze_grid[j][i] = wall;
					walls.push(wall);
				}
			}
		}
	}

	return { maze_grid, walls, mazeMesh, wall_width, wall_height };
}

export function getNeighborCells(
	x: number,
	y: number,
	maze_grid: (Cell | Wall)[][]
): Neighbor[] {
	const neighbors: Neighbor[] = [];
	const directions = [
		{ dx: -2, dy: 0, wx: -1, wy: 0 },
		{ dx: 2, dy: 0, wx: 1, wy: 0 },
		{ dx: 0, dy: -2, wx: 0, wy: -1 },
		{ dx: 0, dy: 2, wx: 0, wy: 1 }
	];

	for (const { dx, dy, wx, wy } of directions) {
		const nx = x + dx;
		const ny = y + dy;
		const tile = maze_grid[nx]?.[ny];
		if (tile instanceof Cell) {
			neighbors.push({ cell: tile, wallX: x + wx, wallY: y + wy });
		}
	}

	return neighbors;
}

export function removeWall(wall: Wall, mazeMesh: THREE.Mesh) {
	wall.orientation = -1;
	mazeMesh.remove(wall.mesh);
	mazeMesh.remove(wall.a.mesh);
	mazeMesh.remove(wall.b.mesh);
}

export function isPassable(tile: Cell | Wall | undefined): boolean {
	if (!tile) return false;
	if (tile instanceof Cell) return true;
	if (tile instanceof Wall && tile.orientation === -1) return true;
	return false;
}
