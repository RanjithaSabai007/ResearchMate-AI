import json
import re
import ollama

def generate_diagram_graph(thesis_title: str, text_content: str, diagram_type: str) -> dict:
    """
    Query the local Ollama model (phi3:mini) to extract system components, processing stages,
    or database entities from the thesis draft text, and structure them as a diagram representation.
    """
    prompt = f"""You are an expert technical diagram designer and academic system modeler.
Your task is to analyze the student's thesis draft excerpt and represent it as a structured diagram description.

Thesis Title: {thesis_title}
Diagram Type to Generate: {diagram_type}
Thesis / Excerpt Content:
{text_content}

Strict Instructions:
1. Identify all system components, data inputs/outputs, processing stages, entities, or steps described in the text.
2. Group related items, detect execution/data flow order, and determine how they connect.
3. You MUST only use components, stages, and connections explicitly mentioned in the text. Do NOT invent or add external components.
4. Set relative layout coordinates (x and y) for each node so that the diagram is clean, balanced, and readable (x range: 100 to 900, y range: 100 to 500).
5. For node colors, suggest a clean Tailwind/HEX hex-code matching an academic light theme (e.g., "#6366f1" for indigo accents, "#ec4899" for pink inputs, "#10b981" for emerald outputs).

You MUST respond with a single, valid JSON object matching this structure EXACTLY:
{{
  "nodes": [
    {{
      "id": "node_id_1",
      "label": "Input Image",
      "type": "input",
      "x": 150,
      "y": 250,
      "color": "#ec4899"
    }},
    {{
      "id": "node_id_2",
      "label": "Preprocessing",
      "type": "process",
      "x": 350,
      "y": 250,
      "color": "#6366f1"
    }}
  ],
  "edges": [
    {{
      "id": "edge_1",
      "source": "node_id_1",
      "target": "node_id_2",
      "label": "Raw pixel data"
    }}
  ]
}}

Constraints:
- Output ONLY a valid raw JSON object.
- Do NOT wrap your output in markdown code blocks like ```json or ```.
- Do NOT include any introductory or concluding comments, notes, or explanations.
"""

    try:
        print(f"[INFO] Contacting local Ollama model (phi3:mini) for diagram: {diagram_type}...")
        response = ollama.chat(
            model="phi3:mini",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
        content = response["message"]["content"].strip()
        
        # Clean markdown code blocks if Ollama included them anyway
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\n", "", content)
            content = re.sub(r"\n```$", "", content)
            content = content.strip()
            
        graph = json.loads(content)
        if isinstance(graph, dict) and "nodes" in graph:
            # Post-process: ensure layout exists
            nodes = graph.get("nodes", [])
            edges = graph.get("edges", [])
            auto_layout_nodes(nodes, edges, diagram_type)
            # Ensure edges have unique IDs
            for idx, edge in enumerate(edges):
                if not edge.get("id"):
                    edge["id"] = f"edge_{idx+1}"
            print(f"[INFO] Successfully generated diagram graph with {len(nodes)} nodes and {len(edges)} edges.")
            return {"nodes": nodes, "edges": edges}
        else:
            raise ValueError("Ollama diagram output is not structured correctly.")
            
    except Exception as e:
        print(f"[WARNING] Ollama diagram generation failed: {e}. Running fallback regex generator.")
        return fallback_diagram_generator(text_content, diagram_type)


def fallback_diagram_generator(content: str, diagram_type: str) -> dict:
    """
    Regex sequential fallback parser.
    Splits text into sentences, identifies step progression, and builds a linear flowchart pipeline.
    """
    # Clean HTML tags
    clean_text = re.sub(r'<[^>]*>', ' ', content)
    
    # Split by periods/semicolons/colons to get sentence segments
    segments = [s.strip() for s in re.split(r'[\.\;\|]+', clean_text) if len(s.strip()) > 15]
    
    nodes = []
    edges = []
    
    # Filter segments that contain transition terms or actions
    transition_keywords = [
        "preprocess", "load", "input", "output", "extract", "train", "test", 
        "classify", "evaluate", "pass", "send", "receive", "model", "save", 
        "store", "retrieve", "display", "visualize", "process", "deploy", "compute"
    ]
    
    active_steps = []
    for seg in segments:
        seg_lower = seg.lower()
        if any(kw in seg_lower for kw in transition_keywords) or len(active_steps) < 5:
            # Truncate label to keep it neat
            label = seg[:40] + ("..." if len(seg) > 40 else "")
            active_steps.append(label)
            if len(active_steps) >= 8:  # Cap fallback nodes count at 8 to keep it readable
                break
                
    # If no segments found, create standard placeholder blocks based on diagram type
    if not active_steps:
        if "architecture" in diagram_type.lower():
            active_steps = ["User Interface", "Application Server", "Business Logic Layer", "Database Layer"]
        elif "database" in diagram_type.lower() or "erd" in diagram_type.lower():
            active_steps = ["User Entity", "Profile Metadata", "Security Credentials", "Audit Logs Table"]
        else:
            active_steps = ["Data Input Source", "Feature Extraction", "Core Process Engine", "Visualization / Outputs"]

    # Build nodes with linear coordinates
    for idx, step_name in enumerate(active_steps):
        node_id = f"node_{idx+1}"
        
        # Color palettes based on flow position
        if idx == 0:
            color = "#ec4899"  # Pink (input)
        elif idx == len(active_steps) - 1:
            color = "#10b981"  # Emerald (output)
        else:
            color = "#6366f1"  # Indigo (process)
            
        nodes.append({
            "id": node_id,
            "label": step_name,
            "type": "process" if (idx > 0 and idx < len(active_steps)-1) else ("input" if idx == 0 else "output"),
            "x": 150 + (idx * 180),
            "y": 250,
            "color": color
        })
        
        # Connect to previous node
        if idx > 0:
            edges.append({
                "id": f"edge_{idx}",
                "source": f"node_{idx}",
                "target": node_id,
                "label": "Next Step"
            })
            
    return {"nodes": nodes, "edges": edges}


def auto_layout_nodes(nodes: list, edges: list, diagram_type: str):
    """
    Ensure all nodes have valid numeric X and Y coordinates. If missing, lay them out cleanly.
    """
    for idx, node in enumerate(nodes):
        # Cast coordinate values to float/int if string, or assign defaults
        try:
            node["x"] = int(node.get("x", 0))
            node["y"] = int(node.get("y", 0))
        except (ValueError, TypeError):
            node["x"] = 0
            node["y"] = 0
            
        if node["x"] == 0 or node["y"] == 0:
            # Clean linear fallback arrangement
            node["x"] = 150 + (idx * 200)
            node["y"] = 250
            
        # Ensure default color key exists
        if not node.get("color"):
            node["color"] = "#6366f1"
