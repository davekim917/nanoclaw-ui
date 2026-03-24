## Skill Invocation — No Approximations

When you decide to run a skill (e.g., `/polish`, `/critique`, `/frontend-design`, `/adapt`):

1. **You MUST invoke it via the `Skill` tool.** No exceptions — whether you're the lead agent or a sub-agent.
2. **NEVER approximate a skill** by sending its description or methodology as instructions to a general-purpose agent or sub-agent. That is not running the skill — it's a lossy imitation that misses the skill's actual logic.
3. A real skill invocation means calling `Skill({ skill: "polish" })`. Anything else — including spawning an Agent with "do polish-like work" — is **not** running the skill.
4. **Sub-agents can and should invoke skills directly** for their portion of the work via the Skill tool. The lead does not need to run skills on their behalf.
5. **Self-check before claiming you ran a skill:** Did you call the `Skill` tool? If not, you didn't run the skill. Say so honestly and then actually run it.

**Anti-pattern (NEVER do this):**
- Say "Let me run /polish" → spawn a general-purpose Agent with polish-like instructions → claim you ran /polish. **This is wrong.**

**Correct pattern:**
- Say "Let me run /polish" → call `Skill({ skill: "polish" })` → skill executes its actual methodology.

This rule applies **only to skill invocations** — sub-agents are still the right tool for general work (writing code, research, building components). The distinction: "do work" → sub-agent is fine. "Run /polish" → must use the Skill tool.

This is a hard rule. If you catch yourself about to approximate a skill, stop and use the Skill tool instead.
