<script lang="ts">
  import { OrbitControls } from "three/addons/controls/OrbitControls.js";
  import * as THREE from "three";
  import { Cell } from "$lib/Cell";
  import { Wall } from "$lib/Wall";
  import { onMount } from "svelte";

  let canvas: HTMLDivElement;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let agent: THREE.Mesh;
  let targetPosition: THREE.Vector3;
  let wall_width: number;
  let wall_height: number;
  const keys: Record<string, boolean> = {};
  let isMoving = false;
  let animation = true;
  let maze_grid: (Cell | Wall)[][] = [];

  onMount(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.z = 100;

    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
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
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  const animate = () => {
    handleMovement();
    if (agent) {
      agent.position.lerp(targetPosition, 0.35);

      if (agent.position.distanceTo(targetPosition) < 0.01) {
        isMoving = false;
        agent.position.copy(targetPosition);
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

  let pos_x = 1;
  let pos_y = 1;

  const handleMovement = () => {
    if (!agent || isMoving) return;

    const isPassable = (tile: Cell | Wall | undefined): boolean => {
      if (!tile) return false;
      if (tile instanceof Cell) return true;
      if (tile instanceof Wall && tile.orientation === -1) return true;
      return false;
    };

    if (keys["w"] && isPassable(maze_grid[pos_x]?.[pos_y - 1])) {
      targetPosition.y += wall_height;
      isMoving = true;
      pos_y--;
    }

    if (keys["s"] && isPassable(maze_grid[pos_x]?.[pos_y + 1])) {
      targetPosition.y -= wall_height;
      isMoving = true;
      pos_y++;
    }

    if (keys["a"] && isPassable(maze_grid[pos_x - 1]?.[pos_y])) {
      targetPosition.x -= wall_width;
      isMoving = true;
      pos_x--;
    }

    if (keys["d"] && isPassable(maze_grid[pos_x + 1]?.[pos_y])) {
      targetPosition.x += wall_width;
      isMoving = true;
      pos_x++;
    }
  };

  const clearScene = () => {
    maze_grid = [];
    pos_x = 1;
    pos_y = 1;

    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });
    scene.clear();
  };

  const createMaze = (
    width: number,
    height: number,
    depth: number,
    animation_speed: number,
  ) => {
    clearScene();

    const bg_width = 128;
    const bg_height = 128;

    const light = new THREE.DirectionalLight(0xffffff, 4);
    light.position.set(75, 75, 250);
    light.target.position.set(bg_width / 2, bg_height / 2, 0);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.left = -bg_width;
    light.shadow.camera.bottom = -bg_height;
    scene.add(light);
    scene.add(light.target);

    wall_width = bg_width / width;
    wall_height = bg_height / height;

    const maze_geometry = new THREE.BoxGeometry(bg_width, bg_height, 1);
    const maze_material = new THREE.MeshStandardMaterial({
      color: "rgb(0,150,155)",
    });
    const maze = new THREE.Mesh(maze_geometry, maze_material);
    maze.receiveShadow = true;
    scene.add(maze);

    const wall_geo = new THREE.BoxGeometry(wall_width, wall_height, depth);
    wall_geo.translate(
      (bg_width - wall_width) / -2,
      (bg_height - wall_height) / -2,
      1,
    );
    const wall_mat = new THREE.MeshStandardMaterial({
      color: "black",
    });

    let walls: Wall[] = [];

    for (let j = 0; j < width; j++) {
      maze_grid[j] = new Array(height);
    }

    for (let i = 1; i < height; i += 2) {
      for (let j = 1; j < width; j += 2) {
        const mesh = new THREE.Mesh(wall_geo, wall_mat);
        mesh.position.x = j * wall_width;
        mesh.position.y = (height - 1 - i) * wall_height;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        maze.add(mesh);

        const cell = new Cell(j, i, mesh);
        maze_grid[j][i] = cell;
      }
    }

    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        if (i % 2 == 1 && j % 2 == 1) {
          continue;
        }
        const mesh = new THREE.Mesh(wall_geo, wall_mat);
        mesh.position.x = j * wall_width;
        mesh.position.y = (height - 1 - i) * wall_height;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        maze.add(mesh);

        if (i == 0 || j == 0 || i == height - 1 || j == width - 1) {
          continue;
        }

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

    //fisher-yates shuffle
    for (let i = walls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [walls[i], walls[j]] = [walls[j], walls[i]];
    }

    const kruskal = (walls: Wall[]) => {
      const step = () => {
        if (walls.length === 0) return;

        const w = walls.pop();
        if (!w) return;

        if (Cell.find(w.a) === Cell.find(w.b)) {
          step();
          return;
        }

        w.orientation = -1;
        maze.remove(w.mesh);
        maze.remove(w.a.mesh);
        maze.remove(w.b.mesh);
        Cell.union(w.a, w.b);

        if (animation) setTimeout(step, animation_speed);
        else step();
      };

      step();
    };

    kruskal(walls);

    const agent_geometry = new THREE.SphereGeometry(wall_width / 3, 32, 32);
    agent_geometry.translate(
      -(Math.floor(width / 2) - 1) * wall_width,
      (Math.floor(height / 2) - 1) * wall_height,
      1,
    );
    const agent_material = new THREE.MeshStandardMaterial({
      color: "gold",
    });
    agent = new THREE.Mesh(agent_geometry, agent_material);
    agent.castShadow = true;
    agent.receiveShadow = true;
    if (depth == 10) agent.position.z++;
    targetPosition = agent.position.clone();
    scene.add(agent);
  };
</script>

<div class="nav">
  <h1 style="text-wrap: nowrap">Visualizing Kruskal's Algorithm</h1>

  <p>(use WASD to move)</p>

  <div class="maze-btns">
    <button onclick={() => createMaze(23, 23, 10, 20)}>SMALL</button>
    <button onclick={() => createMaze(63, 63, 3, 0)}>MEDIUM</button>
    <button onclick={() => createMaze(101, 101, 1, 0)}>LARGE</button>
  </div>

  <button
    class="ani-btn"
    onclick={() => {
      animation = !animation;
    }}
  >
    Animation: {animation ? "on" : "off"}</button
  >
</div>

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
</style>
