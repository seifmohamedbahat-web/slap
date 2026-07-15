// Example JARVIS plugin. Runs in a restricted VM context — no require, no fs,
// no network. Register commands via the injected `jarvis` API.
jarvis.registerCommand("hello", async (input) => {
  const name = input.trim().split(/\s+/).slice(1).join(" ") || "world";
  return `Hello, ${name}! This reply came from the Hello Plugin.`;
});
