from uagents import Agent
from uagents_adapter import MCPServerAdapter
from server import mcp
import os

# Create an MCP adapter with your MCP server
mcp_adapter = MCPServerAdapter(
    mcp_server=mcp, 
    asi1_api_key="sk_14c8727baea84109a25e108be3e5236237ad9d16a62948a49df9d6343eb4e91f",
    model="asi1-fast"  # Options: asi1-mini, asi1-extended, asi1-fast
)

# Create a uAgent
agent = Agent(
    mailbox=True
)

# Include protocols from the adapter
for protocol in mcp_adapter.protocols:
    agent.include(protocol, publish_manifest=True)

if __name__ == "__main__":
    # Run the MCP adapter with the agent
    mcp_adapter.run(agent)