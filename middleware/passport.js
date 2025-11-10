const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const config = require('../utils/config');
const User = require('../models/User');

/**
 * Configure session middleware
 * @param {Express} app - Express application
 */
const setupSession = (app) => {
  app.use(session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: config.COOKIE_HTTP_ONLY,
      secure: config.COOKIE_SECURE,
      sameSite: config.COOKIE_SAME_SITE,
      maxAge: config.COOKIE_MAX_AGE
    }
  }));
};

/**
 * Configure Passport strategies
 */
const configurePassportStrategies = () => {
  // Serialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google Strategy
  if (config.GOOGLE_AUTH_ENABLED && config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: config.GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ 'social.google.id': profile.id });
        if (!user) {
          user = await User.findOne({ email: profile.emails[0].value });
          if (user) {
            user.social.google = { id: profile.id, email: profile.emails[0].value };
            await user.save();
          }
        }
        return done(null, user || profile);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // Facebook Strategy
  if (config.FACEBOOK_AUTH_ENABLED && config.FACEBOOK_CLIENT_ID && config.FACEBOOK_CLIENT_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: config.FACEBOOK_CLIENT_ID,
      clientSecret: config.FACEBOOK_CLIENT_SECRET,
      callbackURL: config.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'emails', 'name']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ 'social.facebook.id': profile.id });
        if (!user && profile.emails && profile.emails[0]) {
          user = await User.findOne({ email: profile.emails[0].value });
          if (user) {
            user.social.facebook = { id: profile.id, email: profile.emails[0].value };
            await user.save();
          }
        }
        return done(null, user || profile);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // GitHub Strategy
  if (config.GITHUB_AUTH_ENABLED && config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: config.GITHUB_CLIENT_ID,
      clientSecret: config.GITHUB_CLIENT_SECRET,
      callbackURL: config.GITHUB_CALLBACK_URL,
      scope: ['user:email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ 'social.github.id': profile.id });
        if (!user && profile.emails && profile.emails[0]) {
          user = await User.findOne({ email: profile.emails[0].value });
          if (user) {
            user.social.github = { id: profile.id, email: profile.emails[0].value };
            await user.save();
          }
        }
        return done(null, user || profile);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // Twitter Strategy
  if (config.TWITTER_AUTH_ENABLED && config.TWITTER_CLIENT_ID && config.TWITTER_CLIENT_SECRET) {
    passport.use(new TwitterStrategy({
      consumerKey: config.TWITTER_CLIENT_ID,
      consumerSecret: config.TWITTER_CLIENT_SECRET,
      callbackURL: config.TWITTER_CALLBACK_URL,
      includeEmail: true
    }, async (token, tokenSecret, profile, done) => {
      try {
        let user = await User.findOne({ 'social.twitter.id': profile.id });
        if (!user && profile.emails && profile.emails[0]) {
          user = await User.findOne({ email: profile.emails[0].value });
          if (user) {
            user.social.twitter = { id: profile.id, email: profile.emails[0].value };
            await user.save();
          }
        }
        return done(null, user || profile);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  // LinkedIn Strategy
  if (config.LINKEDIN_AUTH_ENABLED && config.LINKEDIN_CLIENT_ID && config.LINKEDIN_CLIENT_SECRET) {
    passport.use(new LinkedInStrategy({
      clientID: config.LINKEDIN_CLIENT_ID,
      clientSecret: config.LINKEDIN_CLIENT_SECRET,
      callbackURL: config.LINKEDIN_CALLBACK_URL,
      scope: ['r_emailaddress', 'r_liteprofile']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ 'social.linkedin.id': profile.id });
        if (!user && profile.emails && profile.emails[0]) {
          user = await User.findOne({ email: profile.emails[0].value });
          if (user) {
            user.social.linkedin = { id: profile.id, email: profile.emails[0].value };
            await user.save();
          }
        }
        return done(null, user || profile);
      } catch (error) {
        return done(error, null);
      }
    }));
  }
};

/**
 * Setup Passport authentication
 * @param {Express} app - Express application
 */
const setupPassport = (app) => {
  configurePassportStrategies();
  app.use(passport.initialize());
  app.use(passport.session());
};

module.exports = { setupSession, setupPassport, configurePassportStrategies };
