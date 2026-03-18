import { defineApp } from "convex/server";
import agentMemory from "../../src/component/convex.config.js";

const app = defineApp();
app.use(agentMemory);

export default app;
