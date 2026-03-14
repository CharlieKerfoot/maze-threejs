<script lang="ts">
  import { OrbitControls } from "three/addons/controls/OrbitControls.js";
  import * as THREE from "three";
  import { Cell } from "$lib/Cell";
  import { Wall } from "$lib/Wall";
  import { onMount } from "svelte";
  import { buildGrid, isPassable } from "$lib/MazeGrid";
  import { KruskalGenerator } from "$lib/generators/kruskal";
  import { RecursiveBacktrackerGenerator } from "$lib/generators/recursive-backtracker";
  import { PrimsGenerator } from "$lib/generators/prims";
  import { EllersGenerator } from "$lib/generators/ellers";
  import { WilsonsGenerator } from "$lib/generators/wilsons";
  import type { MazeGenerator } from "$lib/generators/types";
  import { BFSSolver } from "$lib/solvers/bfs";
  import { AStarSolver } from "$lib/solvers/astar";
  import type { Solver } from "$lib/solvers/types";
  import { createMarkers } from "$lib/rendering/markers";

  const BG_SIZE = 128;

  let canvas: HTMLDivElement;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let playerMesh: THREE.Mesh;
  let targetPosition: THREE.Vector3;
  let wall_width: number;
  let wall_height: number;
  const keys: Record<string, boolean> = {};
  let isMoving = false;
  let animation = true;
  let animationSpeed = 20;
  let maze_grid: (Cell | Wall)[][] = [];
  let mazeReady = false;

  // Convert grid coordinates to world position
  function gridToWorld(j: number, i: number): { x: number; y: number } {
    return {
      x: j * wall_width - BG_SIZE / 2 + wall_width / 2,
      y: (currentHeight - 1 - i) * wall_height - BG_SIZE / 2 + wall_height / 2,
    };
  }

  // Algorithm selection
  let selectedAlgorithm = "kruskal";
  const algorithms: Record<string, () => MazeGenerator> = {
    kruskal: () => new KruskalGenerator(),
    "recursive-backtracker": () => new RecursiveBacktrackerGenerator(),
    prims: () => new PrimsGenerator(),
    ellers: () => new EllersGenerator(),
    wilsons: () => new WilsonsGenerator(),
  };

  // Maze dimensions
  let currentWidth = 0;
  let currentHeight = 0;
  let currentDepth = 0;
  let goalX = 0;
  let goalY = 0;

  // Solver state
  let solverMeshes: THREE.Mesh[] = [];
  let solverRunning = false;

  // Markers
  let markersGroup: THREE.Group | null = null;

  // Player win detection
  let playerWon = false;

  let pos_x = 1;
  let pos_y = 1;

  onMount(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.z = 100;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.rotateSpeed = 0.5;

    const angle = Math.PI / 30;
    controls.minPolarAngle = Math.PI / 2 - angle;
    controls.maxPolarAngle = Math.PI / 2 + angle;
    controls.minAzimuthAngle = 0 - angle;
    controls.maxAzimuthAngle = angle;

    canvas.appendChild(renderer.domElement);
    animate();

    const handleKeyDown = (e: KeyboardEvent) => (keys[e.key] = true);
    const handleKeyUp = (e: KeyboardEvent) => (keys[e.key] = false);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  });

  function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width = Math.floor(canvas.clientWidth * pixelRatio);
    const height = Math.floor(canvas.clientHeight * pixelRatio);
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) renderer.setSize(width, height, false);
    return needResize;
  }

  const animate = () => {
    handleMovement();

    if (playerMesh) {
      playerMesh.position.lerp(targetPosition, 0.35);
      if (playerMesh.position.distanceTo(targetPosition) < 0.01) {
        isMoving = false;
        playerMesh.position.copy(targetPosition);
      }
    }

    renderer.render(scene, camera);

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    requestAnimationFrame(animate);
  };

  const handleMovement = () => {
    if (!playerMesh || isMoving) return;

    if (keys["w"] && isPassable(maze_grid[pos_x]?.[pos_y - 1])) {
      targetPosition.y += wall_height;
      isMoving = true;
      pos_y--;
    } else if (keys["s"] && isPassable(maze_grid[pos_x]?.[pos_y + 1])) {
      targetPosition.y -= wall_height;
      isMoving = true;
      pos_y++;
    } else if (keys["a"] && isPassable(maze_grid[pos_x - 1]?.[pos_y])) {
      targetPosition.x -= wall_width;
      isMoving = true;
      pos_x--;
    } else if (keys["d"] && isPassable(maze_grid[pos_x + 1]?.[pos_y])) {
      targetPosition.x += wall_width;
      isMoving = true;
      pos_x++;
    }

    // Goal detection
    if (pos_x === goalX && pos_y === goalY && mazeReady && !playerWon) {
      playerWon = true;
    }
  };

  const clearScene = () => {
    maze_grid = [];
    pos_x = 1;
    pos_y = 1;
    mazeReady = false;
    playerWon = false;
    clearSolver();

    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (Array.isArray(obj.material))
          obj.material.forEach((m) => m.dispose());
        else if (obj.material) obj.material.dispose();
      }
    });
    scene.clear();
    markersGroup = null;
  };

  const createMaze = (width: number, height: number, depth: number) => {
    clearScene();
    currentWidth = width;
    currentHeight = height;
    currentDepth = depth;
    goalX = width - 2;
    goalY = height - 2;

    const grid = buildGrid(width, height, depth, scene);
    maze_grid = grid.maze_grid;
    wall_width = grid.wall_width;
    wall_height = grid.wall_height;

    const generator = algorithms[selectedAlgorithm]();
    generator.init(maze_grid, grid.walls, grid.mazeMesh);

    const runGenerator = () => {
      const hasMore = generator.step();
      if (hasMore) {
        if (animation) setTimeout(runGenerator, animationSpeed);
        else runGenerator();
      } else {
        onMazeComplete(depth, height);
      }
    };
    runGenerator();

    // Create player
    const agent_geometry = new THREE.SphereGeometry(wall_width / 3, 32, 32);
    agent_geometry.translate(
      -(Math.floor(width / 2) - 1) * wall_width,
      (Math.floor(height / 2) - 1) * wall_height,
      1,
    );
    const agent_material = new THREE.MeshStandardMaterial({ color: "gold" });
    playerMesh = new THREE.Mesh(agent_geometry, agent_material);
    playerMesh.castShadow = true;
    playerMesh.receiveShadow = true;
    if (depth == 10) playerMesh.position.z++;
    targetPosition = playerMesh.position.clone();
    scene.add(playerMesh);
  };

  const onMazeComplete = (depth: number, height: number) => {
    mazeReady = true;

    const startWorld = gridToWorld(1, 1);
    const goalWorld = gridToWorld(goalX, goalY);
    const markerRadius = Math.min(wall_width, wall_height) * 0.3;
    markersGroup = createMarkers(
      scene,
      startWorld.x,
      startWorld.y,
      goalWorld.x,
      goalWorld.y,
      markerRadius,
      0.6,
    );
  };

  // --- Solver ---
  const clearSolver = () => {
    for (const m of solverMeshes) {
      m.geometry.dispose();
      (m.material as THREE.MeshBasicMaterial).dispose();
      scene.remove(m);
    }
    solverMeshes = [];
    solverRunning = false;
  };

  const runSolver = (solver: Solver) => {
    if (!mazeReady || solverRunning) return;
    clearSolver();
    solverRunning = true;
    solver.init(maze_grid, 1, 1, goalX, goalY);

    const stepSolver = () => {
      const result = solver.step();
      if (!result) {
        solverRunning = false;
        return;
      }

      const color = result.type === "solution" ? 0xffff00 : 0x4444ff;
      const geo = new THREE.PlaneGeometry(wall_width * 0.6, wall_height * 0.6);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: result.type === "solution" ? 0.7 : 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const pos = gridToWorld(result.x, result.y);
      mesh.position.set(pos.x, pos.y, 0.6);
      scene.add(mesh);
      solverMeshes.push(mesh);

      setTimeout(stepSolver, 5);
    };
    stepSolver();
  };
</script>

<div class="nav">
  <h1 style="text-wrap: nowrap">Maze Algorithm Visualizer</h1>

  <p>(use WASD to move)</p>

  <select bind:value={selectedAlgorithm}>
    <option value="kruskal">Kruskal's</option>
    <option value="recursive-backtracker">Recursive Backtracker</option>
    <option value="prims">Prim's</option>
    <option value="ellers">Eller's</option>
    <option value="wilsons">Wilson's</option>
  </select>

  <div class="maze-btns">
    <button onclick={() => createMaze(23, 23, 10)}>SMALL</button>
    <button onclick={() => createMaze(63, 63, 3)}>MEDIUM</button>
    <button onclick={() => createMaze(101, 101, 1)}>LARGE</button>
  </div>

  <button
    class="ani-btn"
    onclick={() => {
      animation = !animation;
    }}
  >
    Animation: {animation ? "on" : "off"}
  </button>
</div>

<!-- Side Panel -->
<div class="side-panel">
  <div class="panel-section">
    <h3>Animation Speed</h3>
    <label class="speed-label">
      {animationSpeed}ms
      <input
        type="range"
        min="1"
        max="100"
        step="1"
        bind:value={animationSpeed}
      />
    </label>
  </div>

  <div class="panel-section">
    <h3>Solvers</h3>
    <button disabled={!mazeReady || solverRunning} onclick={() => runSolver(new BFSSolver())}>
      Solve: BFS
    </button>
    <button disabled={!mazeReady || solverRunning} onclick={() => runSolver(new AStarSolver())}>
      Solve: A*
    </button>
    <button disabled={solverMeshes.length === 0} onclick={clearSolver}>Clear Solution</button>
  </div>
</div>

{#if playerWon}
  <div class="overlay winner">
    <h1>You reached the goal!</h1>
    <button onclick={() => (playerWon = false)}>Dismiss</button>
  </div>
{/if}

<div bind:this={canvas} class="maze"></div>

<style>
  .maze-btns > button {
    border: none;
    border-radius: 1em;
    margin: 0 0.5em;
  }

  .ani-btn,
  .maze-btns > button {
    padding: 0.75em 1.5em;
    background-color: rgb(215, 215, 215);
    cursor: pointer;
    font-family: Tahoma;
  }

  .ani-btn {
    border: 1px rgb(15, 15, 15) solid;
    border-radius: 5px;
  }

  .ani-btn:hover,
  .maze-btns > button:hover {
    filter: brightness(92%);
    transition: filter 0.2s ease-in-out;
  }

  .nav {
    display: flex;
    align-items: center;
    justify-content: space-around;
  }

  .nav select {
    padding: 0.5em 1em;
    font-family: Tahoma;
    border-radius: 5px;
    border: 1px solid #333;
    background: rgb(215, 215, 215);
    cursor: pointer;
  }

  .side-panel {
    position: absolute;
    top: 80px;
    right: 10px;
    width: 220px;
    background: rgba(20, 20, 20, 0.85);
    color: white;
    border-radius: 8px;
    padding: 12px;
    font-family: Tahoma;
    font-size: 0.85em;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .panel-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .panel-section h3 {
    margin: 0;
    font-size: 1em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding-bottom: 4px;
  }

  .panel-section button {
    padding: 6px 10px;
    border: none;
    border-radius: 4px;
    background: rgb(60, 60, 60);
    color: white;
    cursor: pointer;
    font-family: Tahoma;
  }

  .panel-section button:hover:not(:disabled) {
    background: rgb(80, 80, 80);
  }

  .panel-section button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .speed-label {
    font-size: 0.85em;
  }

  .speed-label input {
    width: 100%;
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    z-index: 100;
  }

  .overlay h1 {
    color: white;
    font-family: Tahoma;
    font-size: 5em;
  }

  .overlay button {
    padding: 10px 20px;
    font-size: 1.2em;
    border: none;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-family: Tahoma;
  }
</style>
