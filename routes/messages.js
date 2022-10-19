const Message = require("../models/message");
const ExpressError = require("../expressError");
const { ensureLoggedIn } = require("../middleware/auth");
const express = require("express");
const router = new express.Router();
/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get("/:id", ensureLoggedIn, async (req, res, next) => {
  try {
    const message = await Message.get(req.params.id);
    if (
      req.user.username === message.to_user.username ||
      req.user.username === message.from_user.username
    ) {
      const results = await Message.get(req.params.id);
      return res.json({ message: results });
    }
    throw new ExpressError(
      "Only the sender or intended recipient can get a message!",
      401
    );
  } catch (e) {
    return next(e);
  }
});

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post("/", ensureLoggedIn, async (req, res, next) => {
  try {
    const { to_username, body } = req.body;
    const results = await Message.create({
      from_username: req.user.username,
      to_username,
      body,
    });
    return res.status(201).json({ message: results });
  } catch (e) {
    return next(e);
  }
});

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/
router.post("/:id", ensureLoggedIn, async (req, res, next) => {
  try {
    const message = await Message.get(req.params.id);
    if (req.user.username === message.to_user.username) {
      const results = await Message.markRead(req.params.id);
      return res.json({ message: results });
    }
    throw new ExpressError("Only intended recipient can mark as read!", 401);
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
