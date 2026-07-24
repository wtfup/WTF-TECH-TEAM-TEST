import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { pool } from "../db";
import { env } from "../env";

passport.use(
  new GoogleStrategy(
    {
      clientID: env.googleClientId,
      clientSecret: env.googleClientSecret,
      callbackURL: env.googleCallbackUrl,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || "";
        const name = profile.displayName;
        const avatar = profile.photos?.[0]?.value || "";

        const result = await pool.query(
          `
          INSERT INTO users (google_id, email, name, avatar_url)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (google_id)
          DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            avatar_url = EXCLUDED.avatar_url
          RETURNING *;
          `,
          [googleId, email, name, avatar]
        );

        done(null, result.rows[0]);
      } catch (err) {
        done(err as Error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );

    done(null, result.rows[0]);
  } catch (err) {
    done(err as Error);
  }
});

export default passport;