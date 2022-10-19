/** User class for message.ly */
const db = require("../db");
const ExpressError = require("../expressError");
const { BCRYPT_WORK_FACTOR } = require("../config");
const bcrypt = require("bcrypt");

/** User of the site. */

class User {
  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    try {
      if (!username || !password) {
        throw new ExpressError("Must have username and password!", 400);
      }
      const hashedPass = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
      const result = await db.query(
        `INSERT INTO users
        (username,password,first_name,last_name,phone,join_at,last_login_at)
        VALUES ($1,$2,$3,$4,$5,now(),now())
        RETURNING username, password, first_name, last_name, phone, join_at`,
        [username, hashedPass, first_name, last_name, phone]
      );

      return result.rows[0];
    } catch (e) {
      if (e.code === "23505") {
        throw new ExpressError(`Username ${username} already taken`, 400);
      }
    }
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    if (!username || !password) {
      throw new ExpressError("Must have username and password!", 400);
    }
    const user = await db.query(
      `SELECT password FROM users WHERE username=$1`,
      [username]
    );
    if (user.rows.length === 0) {
      return false;
    }
    return await bcrypt.compare(password, user.rows[0].password);
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(
      `UPDATE users SET last_login_at=now() WHERE username=$1 RETURNING last_login_at`,
      [username]
    );

    if (result.rows.length === 0) {
      throw new ExpressError(
        `User with username of ${username} not found!`,
        404
      );
    }
    return result.rows[0].last_login_at;
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const result = await db.query(
      `SELECT username, first_name, last_name, phone FROM users`
    );
    return result.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(
      `SELECT username,first_name,last_name,phone,join_at,last_login_at FROM users WHERE username=$1`,
      [username]
    );
    if (result.rows.length === 0) {
      throw new ExpressError(
        `User with username of ${username} not found!`,
        404
      );
    }
    return result.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const result = await db.query(
      `SELECT username, first_name, last_name, phone,id, body, sent_at, read_at
       FROM users JOIN messages AS m ON m.to_username = users.username WHERE m.from_username=$1`,
      [username]
    );
    if (result.rows.length === 0) {
      throw new ExpressError(
        `User with username of ${username} not found!`,
        404
      );
    }
    return result.rows.map((r) => {
      return {
        id: r.id,
        to_user: {
          username: r.username,
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone,
        },
        body: r.body,
        sent_at: r.sent_at,
        read_at: r.read_at,
      };
    });
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const result = await db.query(
      `SELECT username, first_name, last_name, phone,id,body, sent_at, read_at
       FROM users JOIN messages AS m ON m.from_username = users.username WHERE m.to_username=$1`,
      [username]
    );
    if (result.rows.length === 0) {
      throw new ExpressError(
        `User with username of ${username} not found!`,
        404
      );
    }
    return result.rows.map((r) => {
      return {
        id: r.id,
        from_user: {
          username: r.username,
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone,
        },
        body: r.body,
        sent_at: r.sent_at,
        read_at: r.read_at,
      };
    });
  }
}

module.exports = User;
