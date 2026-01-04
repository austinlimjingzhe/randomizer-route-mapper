import { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from "reactflow";

import * as htmlToImage from "html-to-image";
import "reactflow/dist/style.css";

import pokeball from "./assets/pokeball.svg";

type MapItem = {
  id: string;
  identifier: string;
  generation: number;
  regionId: number;
};

const GENERATIONS = [
  "Gen 1 — Kanto",
  "Gen 2 — Johto",
  "Gen 3 — Hoenn",
  "Gen 4 — Sinnoh",
  "Gen 5 — Unova",
  "Gen 6 — Kalos",
  "Gen 7 — Alola",
  "Gen 8 — Galar",
  "Gen 9 — Paldea",
];

export default function App() {
  const [generation, setGeneration] = useState("Gen 1 — Kanto");

  // Parse "Gen 1 — Kanto" -> 1
  const selectedGenNumber = Number(generation.match(/\d+/)?.[0] ?? "1");

  // Load generation locations into dropdown list
  const [mapList, setMapList] = useState<MapItem[]>([]);

  // Keep localStorage per generation so graphs don't overwrite each other
  const STORAGE_KEY = `pokemon-map-graph-gen${selectedGenNumber}`;

  // ---------- Load graph from localStorage (per-gen) ----------
  const loadGraph = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  };

  const stored = loadGraph();

  const initialNodes: Node[] =
    stored?.nodes ?? [
      {
        id: "1",
        position: { x: 0, y: 0 },
        data: { label: "Start Map" },
      },
    ];

  const initialEdges: Edge[] = stored?.edges ?? [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const flowRef = useRef<HTMLDivElement | null>(null);

  // ---------- Export graph as JSON ----------
  const exportJSON = () => {
    const payload = {
     version: 1,
     generation, // the display string e.g. "Gen 1 — Kanto"
     exportedAt: new Date().toISOString(),
     nodes,
     edges,
   };

   const blob = new Blob([JSON.stringify(payload, null, 2)], {
     type: "application/json",
   });

   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");

   const safeGen = selectedGenNumber;
   a.href = url;
   a.download = `pokemon-route-gen${safeGen}.json`;
   a.click();

   URL.revokeObjectURL(url);
  };

  // ---------- Import graph from JSON ----------
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const openImportDialog = () => {
    importInputRef.current?.click();
  };

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      // Basic shape checks
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON");
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        throw new Error("JSON must contain 'nodes' and 'edges' arrays");
      }

      // Optional: restore generation if present
      if (typeof parsed.generation === "string" && parsed.generation.includes("Gen")) {
        setGeneration(parsed.generation);
        // nodes/edges will be set below; generation change will also update STORAGE_KEY,
        // but we want the imported graph to win, so we set after generation change settles.
        // We'll just set immediately too (works fine in practice).
      }

      setNodes(parsed.nodes);
      setEdges(parsed.edges);
    } catch (e) {
      console.error(e);
      alert("Import failed: invalid file format.");
    }
  };

  // ---------- Load selected generation JSON ----------
  useEffect(() => {
    const load = async () => {
      try {
        // Put your generated JSON files in: public/data/gen1.json ... gen9.json
        const res = await fetch(`/data/gen${selectedGenNumber}.json`);
        if (!res.ok) throw new Error(`Failed to load gen${selectedGenNumber}: ${res.status}`);
        const data = (await res.json()) as MapItem[];
        setMapList(data);
      } catch (e) {
        console.error(e);
        setMapList([]);
      }
    };

    load();
  }, [selectedGenNumber]);

  // ---------- Delete selected node and its connected edges ----------
  const deleteSelectedNode = () => {
    const selectedNode = nodes.find((n) => n.selected);
    if (!selectedNode) return;

    const nodeId = selectedNode.id;

    // Remove the node
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));

    // Remove connected edges
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      )
    );
  };

  // ---------- When generation changes, load that generation's graph ----------
  useEffect(() => {
    const next = loadGraph();

    if (next?.nodes && next?.edges) {
      setNodes(next.nodes);
      setEdges(next.edges);
    } else {
      // reset to a default graph for this gen
      setNodes([
        {
          id: "1",
          position: { x: 0, y: 0 },
          data: { label: "Start Map" },
        },
      ]);
      setEdges([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [STORAGE_KEY]);

  // ---------- Rename NODE ----------
  const renameNode = (id: string) => {
    const newName = prompt("Enter map name:");
    if (!newName) return;

    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: newName } } : n))
    );
  };

  // ---------- Dropdown update ----------
  const setMapFromDropdown = (id: string, map: string) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: map } } : n))
    );
  };

  // ---------- Add new node ----------
  const addNode = () => {
    setNodes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        position: { x: Math.random() * 300, y: Math.random() * 300 },
        data: { label: "New Map" },
      },
    ]);
  };
  
  // ---------- Toggle softlock on selected nodes ----------
  const toggleSoftlockOnSelected = () => {
    setNodes((nds) =>
      nds.map((n) => {
        if (!n.selected) return n;

        return {
          ...n,
          data: {
            ...n.data,
            softlock: !n.data?.softlock,
          },
        };
      })
    );
  };

  // ---------- Toggle gym on selected nodes ----------
  const toggleGymOnSelected = () => {
    setNodes((nds) =>
      nds.map((n) => {
        if (!n.selected) return n;

        return {
          ...n,
          data: {
            ...n.data,
            gym: !n.data?.gym,
          },
        };
      })
    );
  };

  // ---------- Rename EDGE ----------
  const renameEdge = (id: string) => {
    const newLabel = prompt("Enter edge name:");
    if (!newLabel) return;

    setEdges((eds) => eds.map((e) => (e.id === id ? { ...e, label: newLabel } : e)));
  };

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => renameEdge(edge.id), []);

  // ---------- Add edge w/ default label ----------
  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            label: "Route",
          },
          eds
        )
      ),
    [setEdges]
  );

  // ---------- Auto-save (per-gen) ----------
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  }, [nodes, edges, STORAGE_KEY]);

  // ---------- Export as Image ----------
  const exportPNG = async () => {
    if (!flowRef.current) return;
    const dataUrl = await htmlToImage.toPng(flowRef.current);
    downloadImage(dataUrl, "pokemon-route.png");
  };

  const exportJPEG = async () => {
    if (!flowRef.current) return;
    const dataUrl = await htmlToImage.toJpeg(flowRef.current, { quality: 0.95 });
    downloadImage(dataUrl, "pokemon-route.jpeg");
  };

  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {/* ====== TOP BANNER ====== */}
      <header
        style={{
          width: "100%",
          height: 70,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          gap: 16,
          background: "#1b263b",
          color: "white",
          boxShadow: "0 2px 6px rgba(0,0,0,.25)",
        }}
      >
        {/* Logo + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src={pokeball}
            alt="Logo"
            style={{ width: 42, height: 42, borderRadius: 8 }}
          />

          <h2 style={{ margin: 0 }}>Randomizer Route Mapper</h2>
        </div>

        {/* Generation Selector */}
        <div>
          <label style={{ marginRight: 8 }}>Game Generation:</label>

          <select
            value={generation}
            onChange={(e) => setGeneration(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              marginRight: "30px",
            }}
          >
            {GENERATIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* ===== Floating control buttons ===== */}
      <div
        style={{
          position: "absolute",
          zIndex: 10,
          top: 90,
          left: 10,
          display: "flex",
          gap: 8,
        }}
      >
        <button onClick={addNode}>Add Node (➕)</button>
        <button onClick={deleteSelectedNode}>Delete Node (❌)</button>
        <button onClick={toggleSoftlockOnSelected}>Softlock (🔒)</button>
        <button onClick={toggleGymOnSelected}>Gym (💪)</button>
        <button onClick={exportPNG}>Export PNG</button>
        <button onClick={exportJPEG}>Export JPEG</button>
        <button onClick={exportJSON}>Export JSON</button>
        <button onClick={openImportDialog}>Import JSON</button>
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
        
          onImportFile(file);
        
          // Allow importing the same file twice in a row
          e.currentTarget.value = "";
        }}
      />

      {/* ===== React Flow Canvas ===== */}
      <div ref={flowRef} style={{ width: "100%", height: "100%" }}>
        <ReactFlow
          nodes={nodes.map((node) => ({
            ...node,
            style: {
              width: 260,
              padding: 8,

              background: node.data?.gym
                ? "#b7e4c7"        // green
                : node.data?.softlock
                ? "#b0b0b0"        // grey
                : "white",

              border: node.data?.gym
                ? "2px solid #2d6a4f"
                : node.data?.softlock
                ? "2px dashed #666"
                : "1px solid #999",

              opacity: node.data?.softlock ? 0.85 : 1,
            },
            data: {
              ...node.data,
              label: (
                <div>
                  <strong
                    onClick={() => renameNode(node.id)}
                    style={{ cursor: "pointer", display: "block", marginBottom: 6 }}
                  >
                    {node.data.label}
                  </strong>

                  <div>
                    {/*
                      datalist id must be unique per node
                      (otherwise multiple nodes clash)
                    */}
                    <input
                      style={{ width: "90%" }}
                      list={`maps-gen${selectedGenNumber}-node-${node.id}`}
                      placeholder="Search map..."
                      value={String(node.data.label ?? "")}
                      onChange={(e) => setMapFromDropdown(node.id, e.target.value)}
                    />

                    <datalist id={`maps-gen${selectedGenNumber}-node-${node.id}`}>
                      {mapList.map((m) => (
                        <option key={m.id} value={m.identifier} />
                      ))}
                    </datalist>
                  </div>
                </div>
              ),
            },
          }))}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeClick={onEdgeClick}
          onConnect={onConnect}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}
