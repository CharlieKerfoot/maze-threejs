# Kruskal's Algorithm for Maze Generation

A visualization of [Kruskal's Algorithm](https://en.wikipedia.org/wiki/Maze_generation_algorithm#Iterative_randomized_Kruskal's_algorithm_(with_sets)) using [three.js](https://threejs.org/) and [Svelte](https://svelte.dev/).

Kruskal's algorithm is a well-known graph algorithm that finds a minimum spanning forest out of an undirected edge-weighted graph. In our case, for maze generation, the graph is connected so the algorithm produces a minimum spanning tree. The minimum spanning tree is the created maze.

## Installation

After cloning the repo, run
``` 
npm i
```

and then
```
npm run dev
```
Open the webpage on the specified port (i.e. http://localhost:5173/)

## Extras

This is a continuation of a series of repo's on Kruskal's alogorithm and specifically its use in maze generation. The implementation in C can be found [here](https://github.com/CharlieKerfoot/maze-generation-c).

The use of Svelte is very much so overengineering for this small webpage, but the project was originally built for use in my portfolio site, which is built using Svelte and Sveltekit. This repo is simply a port from the implementation on my site.
