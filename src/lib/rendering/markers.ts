import * as THREE from 'three';

export function createMarkers(
	scene: THREE.Scene,
	startWorldX: number,
	startWorldY: number,
	goalWorldX: number,
	goalWorldY: number,
	markerRadius: number,
	z: number
): THREE.Group {
	const group = new THREE.Group();

	// Start marker (green)
	const startGeo = new THREE.CircleGeometry(markerRadius, 32);
	const startMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
	const startMesh = new THREE.Mesh(startGeo, startMat);
	startMesh.position.set(startWorldX, startWorldY, z);
	group.add(startMesh);

	// Goal marker (red)
	const goalGeo = new THREE.CircleGeometry(markerRadius, 32);
	const goalMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
	const goalMesh = new THREE.Mesh(goalGeo, goalMat);
	goalMesh.position.set(goalWorldX, goalWorldY, z);
	group.add(goalMesh);

	scene.add(group);
	return group;
}
