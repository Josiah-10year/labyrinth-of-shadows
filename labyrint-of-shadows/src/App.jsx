import { useState, useRef, useEffect, useMemo } from "react";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import {
  Box,
  Plane,
  PointerLockControls,
  KeyboardControls,
  useKeyboardControls,
  Environment,
  PerspectiveCamera,
  useGLTF,
  OrbitControls,
  useAnimations,
} from "@react-three/drei";
import { Physics, usePlane, useBox, useSphere } from "@react-three/cannon";
import * as THREE from "three";
import { gsap } from "gsap";
import { Howl } from "howler";

const CELL_SIZE = 2;
const HEDGE_HEIGHT = 3 * 1.75;
const HEDGE_THICKNESS = 0.3;
const PLAYER_HEIGHT = 1.7;
const MOVEMENT_SPEED = 5;
const PLAYER_RADIUS = 0.3;
const AI_SPEED = 3;
const CHASE_DISTANCE = 1000;

const mazes = [
  // Overgrown Hollow (1 enemy)
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
    [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],
  // Thorned Labyrinth (3 enemies) - More complex layout
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],
  // Heart of the Void (5 enemies) - Most complex layout
  [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1],
    [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ],
];

// Materials (keep your existing ones but adapt for mazes)
function HedgeMaterial() {
  const [colorMap, normalMap, roughnessMap, aoMap] = useLoader(THREE.TextureLoader, [
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Moss002_1K-JPG_Color-kfFgCRlBHy0CoS5TfgzMVaOT0u8OI4.jpg",
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Moss002_1K-JPG_NormalGL-UqPfFqqaKR3Fz3QVRE0A3c4JJk0tnM.jpg",
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Moss002_1K-JPG_Roughness-V6uedmVezVYGOMdoNYrRTuhiJgQ6DH.jpg",
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Moss002_1K-JPG_AmbientOcclusion-NFblk4lk0n9L4RrLyQ5ERjvoZDEjiw.jpg",
  ]);

  const textures = [colorMap, normalMap, roughnessMap, aoMap];
  textures.forEach((texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, HEDGE_HEIGHT / 2);
  });

  return (
    <meshStandardMaterial
      map={colorMap}
      normalMap={normalMap}
      roughnessMap={roughnessMap}
      aoMap={aoMap}
      metalness={0.1}
      roughness={0.8}
    />
  );
}

function ThornedMaterial() {
  const [colorMap, normalMap, roughnessMap, aoMap] = useLoader(THREE.TextureLoader, [
    "https://example.com/thorn_texture_color.jpg", // Replace with actual thorn texture URL
    "https://example.com/thorn_texture_normal.jpg",
    "https://example.com/thorn_texture_roughness.jpg",
    "https://example.com/thorn_texture_ao.jpg",
  ]);

  const textures = [colorMap, normalMap, roughnessMap, aoMap];
  textures.forEach((texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, HEDGE_HEIGHT / 2);
  });

  return (
    <meshStandardMaterial
      map={colorMap}
      normalMap={normalMap}
      roughnessMap={roughnessMap}
      aoMap={aoMap}
      metalness={0.2}
      roughness={0.7}
    />
  );
}

function VoidMaterial() {
  return (
    <meshStandardMaterial
      color={0x00008b} // Dark blue for void
      emissive={0x00ff00} // Glowing green runes
      emissiveIntensity={0.5}
      metalness={0.1}
      roughness={0.8}
    />
  );
}

function GroundMaterial() {
  const [colorMap, roughnessMap, normalMap, aoMap] = useLoader(THREE.TextureLoader, [
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Snow009A_1K-JPG_Color-ftnbZHGFOk6O5BGZf8eTBe2MczgDO5.jpg",
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Snow009A_1K-JPG_Roughness-hHoq0f4iMMKc7q8RMaePPRaQfN3nZg.jpg",
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Snow009A_1K-JPG_NormalGL-sxJSJh3TGj64frb00VuUjcswlH46vj.jpg",
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Snow009A_1K-JPG_AmbientOcclusion-zRyLk8QnKFVb3vQLJby98I88nw1Cm9.jpg",
  ]);

  const textures = [colorMap, roughnessMap, normalMap, aoMap];
  textures.forEach((texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(21, 15);
  });

  return (
    <meshStandardMaterial
      map={colorMap}
      roughnessMap={roughnessMap}
      normalMap={normalMap}
      aoMap={aoMap}
      metalness={0.1}
      roughness={0.8}
    />
  );
}

// Maze Component (dynamic based on current maze)
function PhysicalMaze({ mazeIndex = 0 }) {
  const maze = mazes[mazeIndex];

  return (
    <group>
      {maze.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          if (cell === 1) {
            const x = colIndex * CELL_SIZE - maze[0].length * CELL_SIZE / 2;
            const z = rowIndex * CELL_SIZE - maze.length * CELL_SIZE / 2;

            // Choose material based on maze
            let material = <HedgeMaterial />;
            if (mazeIndex === 1) material = <ThornedMaterial />;
            if (mazeIndex === 2) material = <VoidMaterial />;

            return (
              <Wall
                key={`${colIndex}-${rowIndex}`}
                position={[x + CELL_SIZE / 2, HEDGE_HEIGHT / 2, z + CELL_SIZE / 2]}
                size={[CELL_SIZE, HEDGE_HEIGHT, CELL_SIZE]}
                material={material}
              />
            );
          }
          return null;
        })
      )}
      <Ground />
    </group>
  );
}

function Wall({ position, size, material }) {
  const [ref] = useBox(() => ({
    type: "Static",
    position,
    args: size,
  }));

  return (
    <Box ref={ref} args={size} position={position}>
      {material}
    </Box>
  );
}

function Ground() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
  }));

  return (
    <Plane ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} args={[100, 100]}>
      <GroundMaterial />
    </Plane>
  );
}

// Player (Detective Elias Kane)
function Player({ isGameOver, setPlayerPosition, onWin, hasLost, initialPosition, mazeIndex }) {
  const { camera } = useThree();
  const [ref, api] = useSphere(() => ({
    mass: 1,
    type: "Dynamic",
    position: initialPosition,
    args: [PLAYER_RADIUS],
  }));

  const [, get] = useKeyboardControls();

  useFrame(() => {
    if (!isGameOver) {
      const { forward, backward, left, right } = get();
      const direction = new THREE.Vector3();

      const frontVector = new THREE.Vector3(0, 0, Number(backward) - Number(forward));
      const sideVector = new THREE.Vector3(Number(left) - Number(right), 0, 0);
      direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(MOVEMENT_SPEED).applyEuler(camera.rotation);

      api.velocity.set(direction.x, 0, direction.z);

      const position = ref.current.getWorldPosition(new THREE.Vector3());
      const mazeWidth = mazes[mazeIndex][0].length * CELL_SIZE;
      const mazeHeight = mazes[mazeIndex].length * CELL_SIZE;

      // Check if player escapes (reaches maze edge)
      if (
        Math.abs(position.x) > mazeWidth / 2 ||
        Math.abs(position.z) > mazeHeight / 2
      ) {
        onWin();
      }
    } else {
      api.velocity.set(0, 0, 0);
    }

    ref.current.getWorldPosition(camera.position);
    camera.position.y = PLAYER_HEIGHT;
    setPlayerPosition(camera.position.toArray());
  });

  useEffect(() => {
    if (ref.current) {
      ref.current.position.set(...initialPosition);
      camera.position.set(...initialPosition);
      camera.position.y = PLAYER_HEIGHT;
    }
  }, [initialPosition, camera]);

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[PLAYER_RADIUS, 32, 32]} />
      <meshStandardMaterial color={0x444444} /> {/* Gray for Detective Elias Kane */}
    </mesh>
  );
}

// Enemy Types (simplified as boxes for now, can use models later)
function Enemy({ position, playerPosition, onCatchPlayer, isGameOver, mazeIndex, type }) {
  const [ref] = useSphere(() => ({
    mass: 1,
    type: "Dynamic",
    position,
    args: [0.5], // Slightly larger than player for visibility
  }));

  useFrame((state, delta) => {
    if (!isGameOver) {
      const currentPosition = ref.current.position;
      const path = findPath([currentPosition.x, 0, currentPosition.z], playerPosition);
      if (path && path.length > 0) {
        const targetPosition = new THREE.Vector3(...path[0]);
        const direction = new THREE.Vector3()
          .subVectors(targetPosition, currentPosition)
          .normalize()
          .multiplyScalar(AI_SPEED * delta);
        ref.current.position.add(direction);

        // Check if enemy catches player
        const distance = currentPosition.distanceTo(new THREE.Vector3(...playerPosition));
        if (distance < 1) {
          onCatchPlayer();
        }
      }
    }
  });

  // Color based on enemy type
  let color = 0xff0000; // Default red for cultists
  if (type === "shotgun") color = 0xff4500; // Orange for shotgun
  if (type === "knife") color = 0xffa500; // Gold for knives
  if (type === "rifle") color = 0x0000ff; // Blue for rifles
  if (type === "highPriest") color = 0x800080; // Purple for high priest

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// Pathfinding (keep your existing `findPath`, `heuristic`, `isWall`)
function findPath(start, end) {
  const startNode = {
    x: Math.round(start[0] / CELL_SIZE),
    z: Math.round(start[2] / CELL_SIZE),
  };
  const endNode = {
    x: Math.round(end[0] / CELL_SIZE),
    z: Math.round(end[2] / CELL_SIZE),
  };

  const openSet = [startNode];
  const closedSet = [];
  const cameFrom = {};
  const gScore = { [`${startNode.x},${startNode.z}`]: 0 };
  const fScore = { [`${startNode.x},${startNode.z}`]: heuristic(startNode, endNode) };

  while (openSet.length > 0) {
    let current = openSet.reduce(
      (a, b) => (fScore[`${a.x},${a.z}`] < fScore[`${b.x},${b.z}`] ? a : b)
    );

    if (current.x === endNode.x && current.z === endNode.z) {
      let path = [];
      while (current) {
        path.push([current.x * CELL_SIZE, 0, current.z * CELL_SIZE]);
        current = cameFrom[`${current.x},${current.z}`];
      }
      return path.reverse();
    }

    openSet.splice(openSet.indexOf(current), 1);
    closedSet.push(current);

    const neighbors = [
      { x: current.x + 1, z: current.z },
      { x: current.x - 1, z: current.z },
      { x: current.x, z: current.z + 1 },
      { x: current.x, z: current.z - 1 },
    ];

    for (let neighbor of neighbors) {
      if (closedSet.some((node) => node.x === neighbor.x && node.z === neighbor.z)) continue;
      if (isWall(neighbor.x * CELL_SIZE, neighbor.z * CELL_SIZE, mazes[0])) continue;

      const tentativeGScore = gScore[`${current.x},${current.z}`] + 1;

      if (!openSet.some((node) => node.x === neighbor.x && node.z === neighbor.z)) {
        openSet.push(neighbor);
      } else if (tentativeGScore >= gScore[`${neighbor.x},${neighbor.z}`]) {
        continue;
      }

      cameFrom[`${neighbor.x},${neighbor.z}`] = current;
      gScore[`${neighbor.x},${neighbor.z}`] = tentativeGScore;
      fScore[`${neighbor.x},${neighbor.z}`] = gScore[`${neighbor.x},${neighbor.z}`] + heuristic(neighbor, endNode);
    }
  }

  return null;
}

function heuristic(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

function isWall(x, z, maze = mazes[0]) {
  const mazeX = Math.floor((x + maze[0].length * CELL_SIZE / 2) / CELL_SIZE);
  const mazeZ = Math.floor((z + maze.length * CELL_SIZE / 2) / CELL_SIZE);
  return maze[mazeZ] && maze[mazeZ][mazeX] === 1;
}

// Utility to get random empty position (updated for multiple mazes)
function getRandomEmptyPosition(mazeIndex) {
  const maze = mazes[mazeIndex];
  let x, z;
  do {
    x = Math.floor(Math.random() * (maze[0].length - 2)) + 1;
    z = Math.floor(Math.random() * (maze.length - 2)) + 1;
  } while (maze[z][x] !== 0 || (Math.abs(x) < 2 && Math.abs(z) < 2));

  return [(x - maze[0].length / 2) * CELL_SIZE, 0, (z - maze.length / 2) * CELL_SIZE];
}

// Shooting Mechanic (simple raycast for now)
function Shooting({ playerPosition, setEnemies, enemies, mazeIndex }) {
  const { raycaster, camera } = useThree();
  const [isShooting, setIsShooting] = useState(false);

  useEffect(() => {
    const handleClick = () => {
      if (!isShooting) {
        setIsShooting(true);
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        raycaster.set(new THREE.Vector3(...playerPosition), direction);

        const intersects = raycaster.intersectObjects(enemies.map((e) => e.ref.current));
        if (intersects.length > 0) {
          const hitEnemy = enemies.find((e) => e.ref.current === intersects[0].object);
          if (hitEnemy) {
            hitEnemy.health -= 50; // Reduce enemy health
            if (hitEnemy.health <= 0) {
              setEnemies(enemies.filter((e) => e !== hitEnemy));
            }
          }
        }
        setTimeout(() => setIsShooting(false), 500); // Cooldown
      }
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [playerPosition, enemies, setEnemies, raycaster, camera]);

  return null;
}

function App() {
  const [currentMaze, setCurrentMaze] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerPosition, setPlayerPosition] = useState([0, PLAYER_HEIGHT, 0]);
  const [enemies, setEnemies] = useState([]);
  const [hasWon, setHasWon] = useState(false);
  const [hasLost, setHasLost] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds per maze
  const [isPaused, setIsPaused] = useState(false); // Add pause state

  useEffect(() => {
    if (gameStarted && !isGameOver && !isPaused && currentMaze < mazes.length) {
      const enemyCount = mazes[currentMaze].enemies || 1; // Default to 1 enemy for Overgrown Hollow
      const newEnemies = Array.from({ length: enemyCount }, () =>
        getRandomEmptyPosition(currentMaze)
      ).map((pos, i) => ({
        position: pos,
        health: 100,
        type: getEnemyType(currentMaze, i),
        ref: useRef(),
      }));
      setEnemies(newEnemies);
    }
  }, [gameStarted, currentMaze, isGameOver, isPaused]);

  const getEnemyType = (mazeIndex, index) => {
    if (mazeIndex === 0) return "pistol"; // Overgrown Hollow: 1 pistol-wielding cultist
    if (mazeIndex === 1) {
      // Thorned Labyrinth: 2 knives, 1 shotgun
      return index < 2 ? "knife" : "shotgun";
    }
    if (mazeIndex === 2) {
      // Heart of the Void: 2 pistols, 2 rifles, 1 high priest
      if (index < 2) return "pistol";
      if (index < 4) return "rifle";
      return "highPriest";
    }
  };

  const handleGameOver = () => {
    setIsGameOver(true);
    setHasLost(true);
    setGameStarted(false); // Reset game state
  };

  const handleRestart = () => {
    setIsGameOver(false);
    setHasWon(false);
    setHasLost(false);
    setPlayerPosition([0, PLAYER_HEIGHT, 0]);
    setEnemies([]);
    setCurrentMaze(0);
    setTimeLeft(60);
    setGameStarted(false);
    setIsPaused(false);
  };

  const handleWin = () => {
    if (currentMaze < mazes.length - 1) {
      setCurrentMaze(currentMaze + 1);
      setPlayerPosition([0, PLAYER_HEIGHT, 0]);
      setEnemies([]);
      setTimeLeft(60); // Reset timer for next maze
    } else {
      setHasWon(true);
      setIsGameOver(true);
      saveScore(); // Save time to leaderboard
    }
  };

  const saveScore = () => {
    const playerName = prompt("Enter your name for the leaderboard:") || "Detective";
    const timeTaken = 60 * (mazes.length - currentMaze) - timeLeft; // Total time across mazes
    let scores = JSON.parse(localStorage.getItem("labyrinthScores") || "[]");
    scores.push({ name: playerName, time: timeTaken });
    scores.sort((a, b) => a.time - b.time);
    scores = scores.slice(0, 10); // Top 10 scores
    localStorage.setItem("labyrinthScores", JSON.stringify(scores));
  };

  useEffect(() => {
    if (gameStarted && !isGameOver && !isPaused) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleGameOver();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameStarted, isGameOver, isPaused]);

  // Handle pause
  const handlePause = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      // Resume game (unpause)
      document.exitPointerLock(); // Exit pointer lock if paused
    } else {
      // Pause game
      document.body.requestPointerLock(); // Re-enter pointer lock when resuming
    }
  };

  return (
    <>
      <style jsx global>{`
        @font-face {
          font-family: "NightAOE";
          src: url("https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/fonts/HEROLD-dOWX54P8Kr6yxIgAmVurlcwj9htIxJ.otf") format("truetype");
        }
        @keyframes roll-credits {
          0% {
            transform: translate(0, calc(100dvh));
          }
          100% {
            transform: translate(0, -100dvh);
          }
        }
        .animate-credits {
          animation: roll-credits 15s linear forwards;
        }
        @keyframes snowfall {
          0% {
            transform: translateY(-10vh) translateX(0);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) translateX(20px);
            opacity: 0;
          }
        }
        .snow-flake {
          position: absolute;
          width: 5px;
          height: 5px;
          background: white;
          border-radius: 50%;
          opacity: 0.8;
          animation: snowfall linear infinite;
        }
      `}</style>
      <div className="w-full h-screen cursor-none" style={{ margin: 0, padding: 0, overflow: "hidden" }}>
        {!gameStarted && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[256px] font-[NightAOE] pointer-events-none text-red-600 text-shadow-lg z-[1000]">
            237
          </div>
        )}
        <KeyboardControls
          map={[
            { name: "forward", keys: ["ArrowUp", "w", "W"] },
            { name: "backward", keys: ["ArrowDown", "s", "S"] },
            { name: "left", keys: ["ArrowLeft", "a", "A"] },
            { name: "right", keys: ["ArrowRight", "d", "D"] },
            { name: "shoot", keys: [" "] }, // Spacebar to shoot
            { name: "pause", keys: ["p", "P"] }, // 'P' to pause
          ]}
        >
          <Canvas camera={{ fov: 75, near: 0.1, far: 1000, position: [0, PLAYER_HEIGHT, 0] }}
  style={{ width: "100%", height: "100%" }}>
            {!gameStarted ? (
              <TitleScreen
                onStart={() => {
                  setGameStarted(true);
                  document.body.requestPointerLock(); // Lock pointer when starting
                }}
              />
            ) : (
              <Physics gravity={[0, -9.81, 0]}>
                <Environment
                  files="/path/to/local/night4.jpg" background
                  blur={0.5}
                />
                <ambientLight intensity={0.1} />
                <pointLight position={[0, HEDGE_HEIGHT * 2, 0]} intensity={0.3} />
                <PhysicalMaze mazeIndex={currentMaze} />
                <Player
                  isGameOver={isGameOver || isPaused}
                  setPlayerPosition={setPlayerPosition}
                  onWin={handleWin}
                  hasLost={hasLost}
                  initialPosition={playerPosition}
                  mazeIndex={currentMaze}
                />
                {enemies.map((enemy, i) => (
                  <Enemy
                    key={i}
                    position={enemy.position}
                    playerPosition={playerPosition}
                    onCatchPlayer={handleGameOver}
                    isGameOver={isGameOver || isPaused}
                    mazeIndex={currentMaze}
                    type={enemy.type}
                    ref={enemy.ref}
                  />
                ))}
                <Shooting
                  playerPosition={playerPosition}
                  setEnemies={setEnemies}
                  enemies={enemies}
                  mazeIndex={currentMaze}
                />
                <Hotel />
                <Mountain />
                <Snow />
                {!isGameOver && !isPaused && <PointerLockControls />}
                {isGameOver && <FadeEffect isGameOver={isGameOver} />}
              </Physics>
            )}
          </Canvas>
        </KeyboardControls>
        {!gameStarted && (
          <div className="absolute inset-x-0 bottom-10 flex justify-center pointer-events-none uppercase">
            <p className="text-white text-lg animate-pulse">Press Spacebar</p>
          </div>
        )}
        <BackgroundMusic gameStarted={gameStarted} isGameOver={isGameOver || isPaused} />
        {gameStarted && !isGameOver && !isPaused && (
          <Timer onGameOver={handleGameOver} timeLeft={timeLeft} />
        )}
        {isGameOver && (
          <>
            {!hasWon && <GameOver onRestart={handleRestart} />}
            {hasWon && (
              <>
                <YouSurvived />
                <Credits />
                <Scoreboard scores={JSON.parse(localStorage.getItem("labyrinthScores") || "[]")} />
              </>
            )}
            <PhantomChaseMusic isGameOver={isGameOver} />
          </>
        )}
        {gameStarted && !isGameOver && !isPaused && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 text-[48px] font-[NightAOE] text-red-600 text-shadow-lg z-[1000]">
            {timeLeft}
          </div>
        )}
        {gameStarted && !isGameOver && (
          <div className="absolute top-10 right-10 text-white text-lg z-[1000]">
            Press 'P' to {isPaused ? "Resume" : "Pause"}
          </div>
        )}
      </div>
    </>
  );
}

// Timer Component (updated to show remaining time)
function Timer({ onGameOver, timeLeft }) {
  useEffect(() => {
    if (timeLeft <= 0) {
      onGameOver();
    }
  }, [timeLeft, onGameOver]);

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 text-[48px] font-[NightAOE] text-red-600 text-shadow-lg z-[1000]">
      {timeLeft}
    </div>
  );
}

// Scoreboard Component
function Scoreboard({ scores }) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 p-6 rounded-lg text-white z-[1000]">
      <h2 className="text-3xl font-bold mb-4">Leaderboard</h2>
      <ul className="list-none">
        {scores.map((score, index) => (
          <li key={index} className="mb-2">
            {index + 1}. {score.name} - {score.time}s
          </li>
        ))}
      </ul>
    </div>
  );
}

// Background Music, Phantom Chase Music, Title Screen Music, Snow, FadeEffect, YouSurvived, GameOver, Credits (keep as is or enhance for mazes)

function BackgroundMusic({ gameStarted, isGameOver }) {
  const [audio] = useState(() => new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled-ooMw6BygICWxfHAwu8ZiR6liNWt0mQ.mp3"));

  useEffect(() => {
    if (gameStarted && !isGameOver) {
      audio.loop = true;
      audio.volume = 0.5;
      audio.play();
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audio, gameStarted, isGameOver]);

  return null;
}

function PhantomChaseMusic({ isGameOver }) {
  const [audio] = useState(() => new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Phantom%20Chase-NnoKn8Jdxb7NZ5TTrJuA6nYSlxSiGu.mp3"));

  useEffect(() => {
    if (isGameOver) {
      audio.loop = true;
      audio.volume = 0.5;
      audio.play();
    }
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audio, isGameOver]);

  return null;
}

function TitleScreenMusic() {
  const [audio] = useState(() => new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20(1)-WBaaqUWM8OrFK7H8xr5UBLzBHG7ibZ.mp3"));

  useEffect(() => {
    audio.loop = true;
    audio.volume = 0.5;
    audio.play();
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audio]);

  return null;
}

function Snow() {
  const count = 500000;
  const [positions, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      sizes[i] = Math.random() * 0.1 + 0.05;
    }

    return [positions, sizes];
  }, [count]);

  const particlesRef = useRef();

  useFrame(() => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] -= 0.1;
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 50;
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        args={[
          {
            uniforms: {
              color: { value: new THREE.Color("white") },
              opacity: { value: 0.8 },
            },
            vertexShader: `
              attribute float size;
              varying vec3 vColor;
              void main() {
                vColor = vec3(1.0);
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
              }
            `,
            fragmentShader: `
              uniform vec3 color;
              uniform float opacity;
              varying vec3 vColor;
              void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                gl_FragColor = vec4(color * vColor, opacity);
              }
            `,
            transparent: true,
            depthWrite: false,
          },
        ]}
      />
    </points>
  );
}

function FadeEffect({ isGameOver }) {
  const { scene } = useThree();
  const fadeRef = useRef();
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (isGameOver && fadeRef.current && fadeRef.current.material) {
      gsap.to(fadeRef.current.material.uniforms.opacity, {
        value: 1,
        duration: 2,
        ease: "power2.inOut",
      });
    }
  }, [isGameOver]);

  return (
    <mesh position={[0, 0, -1]} renderOrder={999}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={fadeRef}
        transparent
        depthTest={false}
        uniforms={{
          opacity: { value: 0 },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float opacity;
          varying vec2 vUv;
          void main() {
            gl_FragColor = vec4(0.0, 0.0, 0.0, opacity);
          }
        `}
      />
    </mesh>
  );
}

function YouSurvived() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[72px] font-[NightAOE] text-green-500 text-shadow-lg z-[1000] transition-opacity duration-500 opacity-100">
      You Survived
    </div>
  );
}

function GameOver({ onRestart }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === "Space") {
        onRestart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRestart]);

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[72px] font-[NightAOE] text-red-600 text-shadow-lg z-[1000] flex flex-col items-center gap-8">
      <div>GAME OVER</div>
      <div className="text-2xl animate-pulse">Press Spacebar to Try Again</div>
    </div>
  );
}

function Credits() {
  return (
    <div className="absolute inset-0 overflow-hidden z-[1001]">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full max-w-4xl text-white font-sans text-center animate-credits">
          <h2 className="text-6xl font-bold mb-8">Credits</h2>
          <div className="grid grid-cols-2 gap-8 text-3xl">
            <div className="font-bold text-right">
              <p className="mb-4">Created by</p>
              <p className="mb-4">Developed by</p>
              <p className="mb-4">Music by</p>
              <p className="mb-4">Sound effects by</p>
              <p className="mb-4">Skybox by</p>
              <p className="mb-4">Textures by</p>
              <p className="mb-4">Character model by</p>
              <p className="mb-8">Hotel model by</p>
            </div>
            <div className="text-left">
              <p className="mb-4">Chris Tate</p>
              <p className="mb-4">v0</p>
              <p className="mb-4">Suno</p>
              <p className="mb-4">Eleven Labs</p>
              <p className="mb-4">Blockade Labs</p>
              <p className="mb-4">ambientCG</p>
              <p className="mb-4">Mixamo</p>
              <p className="mb-4">@A9908244 Sketchfab<br />@DJohnson1 DeviantArt</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TitleScreen({ onStart }) {
  const { scene } = useThree();
  const { scene: hotelScene } = useGLTF(
    "https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/models/hotel.glb"
  );
  const { scene: mountainsScene } = useGLTF(
    "https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/rocky_mountains.glb"
  );
  const hotelRef = useRef();
  const mountainsRef = useRef();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === "Space") {
        onStart();
        document.body.requestPointerLock(); // Ensure pointer lock on start
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onStart]);

  return (
    <>
      <Environment files="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/night4-5uEo5n1aEFtW5SYwlMTy9bglR0dq6O.jpg" background blur={0.5} />
      <PerspectiveCamera makeDefault position={[0, 2, 8]} />
      <OrbitControls enableZoom enablePan={false} autoRotate autoRotateSpeed={0.5} />
      <group ref={mountainsRef}>
        <primitive object={mountainsScene} scale={100} position={[-500, 469, -500]} />
      </group>
      <group ref={hotelRef}>
        <primitive object={hotelScene} scale={0.2} position={[0, -1.6, 0]} />
      </group>
      <TitleScreenMusic />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Snow />
    </>
  );
}

function Hotel() {
  const { scene } = useGLTF(
    "https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/models/hotel.glb"
  );
  return <primitive object={scene} scale={1} rotation={[0, Math.PI / 1.5, 0]} position={[-50, 0, 0]} />;
}

function Mountain() {
  const { scene: mountainsScene } = useGLTF(
    "https://43fzijkfwg2zmvr5.public.blob.vercel-storage.com/rocky_mountains.glb"
  );
  return <primitive object={mountainsScene} scale={100} position={[-500, 469, -500]} />;
}

export default App;