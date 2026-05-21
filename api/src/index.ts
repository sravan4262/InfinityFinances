import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import plansRouter from "./routes/plans.js";
import trackerRouter from "./routes/tracker.js";
import internalRouter from "./routes/internal.js";
import homeCalcRouter from "./routes/homeCalc.js";
import moneyRouter from "./routes/money.js";
import chatRouter from "./routes/chat.js";
import featuresRouter from "./routes/features.js";
import { globalLimiter, RateLimitedError } from "./middleware/rateLimit.js";
import { ApiError, jsonError } from "./lib/errors.js";

const app = new Hono();

app.onError((err, c) => {
  if (err instanceof RateLimitedError) {
    return c.json(
      { error: { code: err.code, message: err.message }, retryAfterSeconds: err.retryAfterSeconds },
      429
    );
  }
  if (err instanceof ApiError) return jsonError(c, err.status, err.code, err.message);
  console.error(err);
  return jsonError(c, 500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
});

app.notFound((c) => jsonError(c, 404, "NOT_FOUND", "The requested endpoint was not found."));

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.UI_ORIGIN ?? "http://localhost:3000",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// Rate limit everything except the internal/* endpoints (those have their own auth)
app.use("/plans/*", globalLimiter);
app.use("/tracker/*", globalLimiter);
app.use("/home-calc/*", globalLimiter);
app.use("/money/*", globalLimiter);
app.use("/chat/*", globalLimiter);
app.use("/features/*", globalLimiter);

app.route("/plans", plansRouter);
app.route("/tracker", trackerRouter);
app.route("/internal", internalRouter);
app.route("/home-calc", homeCalcRouter);
app.route("/money", moneyRouter);
app.route("/chat", chatRouter);
app.route("/features", featuresRouter);

app.get("/", (c) => c.json({ name: "infinity-finances/api", status: "ok" }));

const port = Number(process.env.PORT ?? 4000);
const hostname = process.env.HOST ?? "0.0.0.0";
serve({ fetch: app.fetch, hostname, port }, () => {
  console.log(`api running on http://${hostname}:${port}`);
});

export default app;
