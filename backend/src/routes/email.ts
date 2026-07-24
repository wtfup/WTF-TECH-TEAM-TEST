import { Router } from "express";
import { sendBulkEmails } from "../services/email.service";

const router = Router();

router.post("/send", async (req, res) => {
  const { candidateIds, positionId } = req.body ?? {};

  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    return res
      .status(400)
      .json({ error: "candidateIds must be a non-empty array" });
  }
  if (!positionId || typeof positionId !== "string") {
    return res.status(400).json({ error: "positionId is required" });
  }

  try {
    const result = await sendBulkEmails(candidateIds, positionId);
    res.json(result);
  } catch (err: any) {
    console.error(err);
    if (err?.message === "Position not found") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to send emails" });
  }
});

export default router;