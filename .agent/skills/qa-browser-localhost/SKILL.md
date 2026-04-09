---
name: qa-browser-localhost
description: Use this when testing NP-Manager in the browser on localhost, especially for UI flows, RBAC checks, regressions, validation, refresh behavior, and multi-step manual QA.
---

# QA Browser Localhost

## Goal
Test NP-Manager safely and practically in the browser against localhost environments.

## Scope
Use this skill when:
- checking UI flows on localhost,
- validating forms and error handling,
- verifying RBAC in the interface,
- testing refresh/reload/session behavior,
- checking whether a newly implemented feature is actually usable end-to-end.

## Primary rules
- Prefer localhost browser testing over assumptions when the task is about visible UI behavior.
- Do not treat hidden buttons alone as proof of correct authorization; always note that backend enforcement must also be verified.
- Be practical and concise.
- Focus on the user-visible workflow first, then list likely backend or DTO dependencies if relevant.

## Test priorities
1. Can the user enter the page without crash?
2. Does the main action work?
3. Are validation messages clear?
4. Does refresh keep or restore the correct state?
5. Are forbidden actions blocked or absent for lower roles?
6. Is the success/error feedback understandable?

## Output format
Always provide:
- test scope,
- preconditions,
- step-by-step scenarios,
- expected results,
- likely regression risks,
- what is still not verified.

## Anti-patterns to avoid
- Describing only code assumptions without checking browser behavior
- Treating UI visibility as sufficient proof of RBAC correctness
- Producing vague QA advice instead of actionable scenarios
- Testing random areas not related to the requested flow