import { Hono } from "hono";
import { cors } from 'hono/cors'
import contextRoutes from "./routes/context";
import queryRoutes from "./routes/query";

const app = new Hono();

// Basic CORS for dev - adjust in production
app.use(
	'/api/*',
	cors({
		origin: ['*'],
	})
)

app.get("/api", (c) => c.text("RAG Worker OK"));

app.route("/api/context", contextRoutes);
app.route("/api/query", queryRoutes);

export default app;
