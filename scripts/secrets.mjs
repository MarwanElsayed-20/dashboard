// Prints fresh values for the dashboard's secrets: the session key, the ingest key shared with the
// portfolio, and a VAPID key pair for push. Run once with: pnpm setup:secrets
import { randomBytes } from "node:crypto";
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
const line = (name, value) => console.log(`${name}=${value}`);

console.log("# Dashboard (Vercel project: dashboard)");
line("SESSION_SECRET", randomBytes(32).toString("base64url"));
line("NEXT_PUBLIC_VAPID_PUBLIC_KEY", publicKey);
line("VAPID_PRIVATE_KEY", privateKey);
line("VAPID_SUBJECT", "mailto:marwanellsayed@gmail.com");
const ingest = randomBytes(32).toString("base64url");
line("INGEST_SECRET", ingest);
console.log("\n# Portfolio (Vercel project: portfolio), same INGEST_SECRET");
line("DASHBOARD_INGEST_URL", "https://dash.marwanelsayed.com/api/ingest");
line("DASHBOARD_INGEST_SECRET", ingest);
