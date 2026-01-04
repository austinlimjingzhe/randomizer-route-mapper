# Randomizer Race Route Mapper

A ReactFlow + Vite + Typescript project to create a canvas tool for taking better notetaking of Randomizer races.

# Introduction

Pokemon has been thought of as too easy as a game and so many content creators have been finding different ways to make the gameplay harder. Some ways to include Nuzlocke Runs, Speedruns and even Romhacks. One of the types of Romhacks that have caught on for a short while were Randomizer races; where every teleport tile in the game is randomized to another in the game.

<iframe width="560" height="315" src="https://www.youtube.com/embed/58rSKVOxvDg?si=iruoZNd4jktQOBMI" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

Many content creators played in a way that showcased their personality - some would YOLO, others would systematically do a depth-first search or breadth-first search approach to the race but clearly, having an efficient notetaking system would be super helpful to have. This inspired me to create a web application that helps for this SUPER, SUPER niche purpose.

Essentially, each map can be viewed as a node and each teleport tile an edge, and so I was inspired by apps such as draw.io where there is an infinite canvas that users can freely add nodes and edges. But such apps aren't that easy to use for this once again SUPER, SUPER niche purpose, so I thought I would try my hand at creating a clone app for this idea.

I had this idea at the peak of this trend but had not started at all and sadly, the trend is pretty much dead, making the way for other trends like Escape Rooms hacks or timeless challenges like Nuzlockes. With the rise in GenAI and vibe coding, I thought I would resolve myself to at least try.

# Tools
1. ReactFlow - A package that allows you to create interactive flowgraphs using node js.

# Data
1. Thank you to the veekun database of locations found at <a href="https://github.com/veekun/pokedex/blob/master/pokedex/data/csv/locations.csv">Veekun's Github</a>

# Features:
1. Select the game you are playing to filter the maps in the nodes dropdown
2. Rename the node and edges to note down the exact map and teleport tile
3. Mark a node as Softlocked in grey or as a Gym/E4 in green
4. Save your flowgraph as an image (png/jpeg)
5. Import/Export the flowgraph as a json