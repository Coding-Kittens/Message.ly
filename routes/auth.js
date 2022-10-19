const jwt = require("jsonwebtoken");
const User = require("../models/user");
const ExpressError = require("../expressError");
const express = require("express");
const { SECRET_KEY } = require("../config");
const router = new express.Router();

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/
router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (await User.authenticate(username, password)) {
      await User.updateLoginTimestamp(username);
      let token = jwt.sign({ username }, SECRET_KEY);
      return res.json({ token });
    }
    throw new ExpressError("Invalid username or password!", 400);
  } catch (e) {
    return next(e);
  }
});

/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */

router.post("/register", async (req, res, next) => {
  try {
    const { username, password, first_name, last_name, phone } = req.body;
    await User.register({ username, password, first_name, last_name, phone });
    let token = jwt.sign({ username }, SECRET_KEY);
    return res.status(201).json({ token });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
