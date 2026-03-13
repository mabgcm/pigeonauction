import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";

initializeApp();

export const health = onRequest((req, res) => {
  res.status(200).json({ ok: true, message: "Functions ready" });
});
