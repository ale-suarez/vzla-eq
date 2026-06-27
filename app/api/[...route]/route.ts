import { handle } from "hono/vercel";

import { apiApp } from "@/api/app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = handle(apiApp);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const HEAD = handler;
export const OPTIONS = handler;

