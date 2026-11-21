import os
import json
import httpx
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT_DIR / "backend" / ".env"
GLOBAL_MCP_PATH = Path.home() / ".gemini" / "config" / "mcp_config.json"
WORKSPACE_MCP_PATH = ROOT_DIR / ".agents" / "mcp_config.json"

def load_env_variables() -> dict:
    env_vars = {}
    if not ENV_PATH.exists():
        raise FileNotFoundError(f"Missing central configuration file at {ENV_PATH}")

    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip().strip("'\"")
    return env_vars

def configure_mcp_servers():
    env = load_env_variables()
    rapidapi_key = env.get("RAPIDAPI_KEY", "")
    rapidapi_host = env.get("RAPIDAPI_HOST", "instagram-scraper-stable-api.p.rapidapi.com")
    mcp_url = env.get("RAPIDAPI_MCP_URL", "https://mcp.rapidapi.com")

    if not rapidapi_key or rapidapi_key.startswith("YOUR_"):
        print("ERROR: RAPIDAPI_KEY is not configured in backend/.env")
        return False

    print(f"[1/4] Loaded credentials from central configuration backend/.env (Key length: {len(rapidapi_key)})")

    # Define the rapidapi-instagram server using stdio mcp-remote bridge
    rapidapi_server_config = {
        "command": "npx",
        "args": [
            "-y",
            "mcp-remote",
            mcp_url,
            "--header",
            f"x-api-host: {rapidapi_host}",
            "--header",
            f"x-api-key: {rapidapi_key}",
            "--header",
            f"x-rapidapi-host: {rapidapi_host}",
            "--header",
            f"x-rapidapi-key: {rapidapi_key}",
        ],
        "env": {
            "RAPIDAPI_HOST": rapidapi_host,
        }
    }

    # 1. Update Global ~/.gemini/config/mcp_config.json
    global_config = {"mcpServers": {}}
    if GLOBAL_MCP_PATH.exists():
        try:
            content = GLOBAL_MCP_PATH.read_text(encoding="utf-8").strip()
            if content:
                global_config = json.loads(content)
        except Exception as e:
            print(f"Warning: Could not parse existing global config ({e}). Creating new.")

    if "mcpServers" not in global_config:
        global_config["mcpServers"] = {}

    existing_servers = list(global_config["mcpServers"].keys())
    print(f"[2/4] Preserving existing global MCP servers: {existing_servers}")
    global_config["mcpServers"]["rapidapi-instagram"] = rapidapi_server_config

    GLOBAL_MCP_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(GLOBAL_MCP_PATH, "w", encoding="utf-8") as f:
        json.dump(global_config, f, indent=2)
    print(f"[3/4] Successfully updated global Antigravity MCP configuration at: {GLOBAL_MCP_PATH}")

    # 2. Update Workspace .agents/mcp_config.json
    WORKSPACE_MCP_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(WORKSPACE_MCP_PATH, "w", encoding="utf-8") as f:
        json.dump(global_config, f, indent=2)
    print(f"      Successfully synced workspace configuration to: {WORKSPACE_MCP_PATH}")

    # 3. Test Live MCP Server Connectivity
    print("[4/4] Performing live tool discovery test on https://mcp.rapidapi.com ...")
    test_headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-api-host": rapidapi_host,
        "x-api-key": rapidapi_key,
    }
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/list",
        "params": {}
    }

    try:
        r = httpx.post(mcp_url, headers=test_headers, json=payload, timeout=20.0)
        if r.status_code == 200:
            tools = r.json().get("result", {}).get("tools", [])
            print(f"SUCCESS: Connected to RapidAPI MCP server! Discovered {len(tools)} live tools.")
            comment_tools = [t["name"] for t in tools if "comment" in t["name"].lower()]
            print(f"Identified Instagram Comment Tools: {comment_tools}")
            return True
        else:
            print(f"FAILED: Server returned HTTP {r.status_code}: {r.text[:200]}")
            return False
    except Exception as e:
        print(f"FAILED: Connection test encountered error: {e}")
        return False

if __name__ == "__main__":
    success = configure_mcp_servers()
    if success:
        print("\n=== RAPIDAPI MCP CONFIGURATION COMPLETE ===")
        print("Note: If Antigravity IDE was already open, please reload/restart the MCP server session to refresh discovered tools.")

