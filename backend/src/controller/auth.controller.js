import { Player } from "../models/player.model.js";

export const authCallback = async (req, res) => {
  try {
    const { id, firstName, lastName, imageUrl } = req.body;
    const user = await Player.findOne({ clerkId: id });

    if (!user) {
      const fullName =
        [firstName, lastName].filter(Boolean).join(" ").trim() || "User";

      await Player.create({
        clerkId: id,
        fullName,
        imageUrl: imageUrl || "",
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error in auth callback", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};
