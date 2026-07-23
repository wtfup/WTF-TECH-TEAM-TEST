import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { pool } from "../db";
import { env } from "../env";

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );

    done(null, rows[0] || null);
  } catch (err) {
    done(err, null);
  }
});

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
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const avatar = profile.photos?.[0]?.value;

        const existing = await pool.query(
          "SELECT * FROM users WHERE google_id = $1",
          [googleId]
        );

        if (existing.rows.length > 0) {
          return done(null, existing.rows[0]);
        }

        const inserted = await pool.query(
          `INSERT INTO users
            (google_id, email, name, avatar_url)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [googleId, email, name, avatar]
        );

        return done(null, inserted.rows[0]);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

export default passport;