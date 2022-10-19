const request = require("supertest");
const app = require("../app");
const db = require("../db");
const User = require("../models/user");
process.env.NODE_ENV = "test";
let u1;

beforeEach(async function () {
  await db.query("DELETE FROM messages");
  await db.query("DELETE FROM users");
  await User.register({
    username: "test1",
    password: "password",
    first_name: "Test1",
    last_name: "Testy1",
    phone: "+14155550000",
  });

  u1 = await request(app).post("/auth/register").send({
    username: "test2",
    password: "password2",
    first_name: "Test2",
    last_name: "Testy2",
    phone: "+14152220000",
  });

  await db.query(`INSERT INTO messages (
      id,
      from_username,
      to_username,
      body,
      sent_at)
      VALUES (900,'test1', 'test2', 'this is a test', current_timestamp)`);

  await db.query(`INSERT INTO messages (
      id,
      from_username,
      to_username,
      body,
      sent_at)
      VALUES (400,'test2', 'test1', 'this is a another test2', current_timestamp)`);
});

afterAll(async () => {
  await db.end();
});

describe("Test get", () => {
  test("get list of users", async () => {
    const res = await request(app)
      .get("/users")
      .send({ _token: u1.body.token });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      users: [
        {
          username: "test1",
          first_name: "Test1",
          last_name: "Testy1",
          phone: "+14155550000",
        },
        {
          username: "test2",
          first_name: "Test2",
          last_name: "Testy2",
          phone: "+14152220000",
        },
      ],
    });
  });
  test("get detail of users", async () => {
    const res = await request(app)
      .get("/users/test2")
      .send({ _token: u1.body.token });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      user: {
        username: "test2",
        first_name: "Test2",
        last_name: "Testy2",
        phone: "+14152220000",
        join_at: expect.any(String),
        last_login_at: expect.any(String),
      },
    });
  });

  test("get detail of users returns 401 if not the correct user", async () => {
    const res = await request(app)
      .get("/users/notAUser")
      .send({ _token: u1.body.token });
    expect(res.statusCode).toBe(401);
  });

  test("get detail of users returns 401 if not logged in", async () => {
    const res = await request(app).get("/users/test2");
    expect(res.statusCode).toBe(401);
  });

  test("get messages to user", async () => {
    const res = await request(app)
      .get("/users/test2/to")
      .send({ _token: u1.body.token });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      messages: [
        {
          id: 900,
          body: "this is a test",
          sent_at: expect.any(String),
          read_at: null,
          from_user: {
            username: "test1",
            first_name: "Test1",
            last_name: "Testy1",
            phone: "+14155550000",
          },
        },
      ],
    });
  });

  test("get messages to user returns 401 if not the correct user", async () => {
    const res = await request(app)
      .get("/users/notAUser/to")
      .send({ _token: u1.body.token });
    expect(res.statusCode).toBe(401);
  });

  test("get messages to user returns 401 if not logged in", async () => {
    const res = await request(app).get("/users/test2/to");
    expect(res.statusCode).toBe(401);
  });

  test("get messages from user", async () => {
    const res = await request(app)
      .get("/users/test2/from")
      .send({ _token: u1.body.token });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      messages: [
        {
          id: 400,
          body: "this is a another test2",
          sent_at: expect.any(String),
          read_at: null,
          to_user: {
            username: "test1",
            first_name: "Test1",
            last_name: "Testy1",
            phone: "+14155550000",
          },
        },
      ],
    });
  });

  test("get messages from user returns 401 if not the correct user", async () => {
    const res = await request(app)
      .get("/users/notAUser/from")
      .send({ _token: u1.body.token });
    expect(res.statusCode).toBe(401);
  });

  test("get messages from user returns 401 if not logged in", async () => {
    const res = await request(app).get("/users/test2/from");
    expect(res.statusCode).toBe(401);
  });
});
