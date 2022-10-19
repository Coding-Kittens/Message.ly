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
});

afterAll(async () => {
  await db.end();
});

describe("Test get", () => {
  test("get by id", async () => {
    await db.query(`INSERT INTO messages(
          id,
          from_username,
          to_username,
          body,
          sent_at)
        VALUES (900,'test1', 'test2', 'this is a test', now())`);
    const res = await request(app)
      .get("/messages/900")
      .send({ _token: u1.body.token });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      message: {
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
        to_user: {
          username: "test2",
          first_name: "Test2",
          last_name: "Testy2",
          phone: "+14152220000",
        },
      },
    });
  });

  test("get by id should return 404 if message not found", async () => {
    const res = await request(app)
      .get("/messages/321")
      .send({ _token: u1.body.token });
    expect(res.statusCode).toBe(404);
  });

  test("get by id should return 401 if user not logged in", async () => {
    const res = await request(app).get("/messages/321");
    expect(res.statusCode).toBe(401);
  });

  test("get by id should return 401 if the user is not the sender or intended recipient", async () => {
    await db.query(`INSERT INTO messages (
          id,
          from_username,
          to_username,
          body,
          sent_at)
        VALUES (900,'test1', 'test2', 'this is a test', current_timestamp)`);

    let u2 = await request(app).post("/auth/register").send({
      username: "test3",
      password: "password3",
      first_name: "Test3",
      last_name: "Testy3",
      phone: "+141522333300",
    });

    const res = await request(app)
      .get("/messages/900")
      .send({ _token: u2.body.token });
    expect(res.statusCode).toBe(401);
  });
});

describe("Test post", () => {
  test("create new message", async () => {
    let res = await request(app).post("/messages").send({
      _token: u1.body.token,
      to_username: "test1",
      body: "this is a test",
    });
    expect(res.body).toEqual({
      message: {
        id: expect.any(Number),
        from_username: "test2",
        to_username: "test1",
        body: "this is a test",
        sent_at: expect.any(String),
      },
    });
    expect(res.statusCode).toBe(201);
  });

  test("mark message as read", async () => {
    await db.query(`INSERT INTO messages (
        id,
        from_username,
        to_username,
        body,
        sent_at)
      VALUES (900,'test1', 'test2', 'this is a test', current_timestamp)`);

    let res = await request(app)
      .post("/messages/900")
      .send({ _token: u1.body.token });

    expect(res.body).toEqual({
      message: { id: 900, read_at: expect.any(String) },
    });
    expect(res.statusCode).toBe(200);
  });

  test("mark message as read shoud return 404 if message not found", async () => {
    let res = await request(app)
      .post("/messages/654")
      .send({ _token: u1.body.token });
    expect(res.statusCode).toBe(404);
  });

  test("mark message as read shoud return 401 if the user is not the intended recipient ", async () => {
    await db.query(`INSERT INTO messages (
        id,
        from_username,
        to_username,
        body,
        sent_at)
      VALUES (900,'test1', 'test2', 'this is a test', current_timestamp)`);

    let u2 = await request(app).post("/auth/register").send({
      username: "test3",
      password: "password3",
      first_name: "Test3",
      last_name: "Testy3",
      phone: "+141522333300",
    });

    let res = await request(app)
      .post("/messages/900")
      .send({ _token: u2.body.token });
    expect(res.statusCode).toBe(401);
  });

  test("mark message as read shoud return 401 if user not logged in ", async () => {
    await db.query(`INSERT INTO messages (
        id,
        from_username,
        to_username,
        body,
        sent_at)
      VALUES (900,'test1', 'test2', 'this is a test', current_timestamp)`);

    let res = await request(app).post("/messages/900");
    expect(res.statusCode).toBe(401);
  });
});
