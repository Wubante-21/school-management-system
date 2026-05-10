const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const bcrypt = require('bcryptjs');
const { query } = require('./database');

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const users = await query('SELECT id, name, email, role, avatar FROM users WHERE id = ?', [id]);
    done(null, users[0] || null);
  } catch (err) {
    done(err, null);
  }
});

const BASE_URL = process.env.BASE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || 'http://localhost:3000';

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value || `${profile.id}@google-oauth.local`;
      let users = await query('SELECT * FROM users WHERE email = ?', [email]);
      let user;
      if (users.length === 0) {
        const hashedPassword = bcrypt.hashSync('oauth_' + Date.now(), 10);
        const result = await query(
          'INSERT INTO users (name, email, password, role, avatar, status) VALUES (?, ?, ?, ?, ?, ?)',
          [profile.displayName || 'Google User', email, hashedPassword, 'student', profile.photos?.[0]?.value || null, 'active']
        );
        user = { id: result.insertId, name: profile.displayName || 'Google User', email, role: 'student' };
      } else {
        user = users[0];
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${BASE_URL}/api/auth/github/callback`,
    scope: ['user:email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value || `${profile.id}@github-oauth.local`;
      let users = await query('SELECT * FROM users WHERE email = ?', [email]);
      let user;
      if (users.length === 0) {
        const hashedPassword = bcrypt.hashSync('oauth_' + Date.now(), 10);
        const result = await query(
          'INSERT INTO users (name, email, password, role, avatar, status) VALUES (?, ?, ?, ?, ?, ?)',
          [profile.displayName || profile.username || 'GitHub User', email, hashedPassword, 'student', profile.photos?.[0]?.value || null, 'active']
        );
        user = { id: result.insertId, name: profile.displayName || profile.username || 'GitHub User', email, role: 'student' };
      } else {
        user = users[0];
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
}

module.exports = passport;
