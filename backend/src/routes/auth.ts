import { Router } from "express";
import passport from "../auth/passport";
import { env } from "../env";

const router = Router();

router.get( "/google", passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get( "/google/callback", passport.authenticate("google", {
    failureRedirect: `${env.frontendUrl}/login`,
  }),
  (_req, res) => {
    res.redirect(`${env.frontendUrl}/`);
  }
);

router.get("/me", (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      authenticated: false,
    });
  }

  res.json({  authenticated: true, user: req.user,});
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy(() => {
      res.json({ message: "Logged out successfully",});
    });
  });
});

export default router;