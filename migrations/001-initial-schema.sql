-- Up
CREATE TABLE users (
    userID INTEGER PRIMARY KEY,
    email STRING,
    passwordHash STRING,
    firstName STRING,
    lastName STRING,
    birthday INTEGER,
    gender CHAR,
    created INTEGER,
    profilepic STRING
);
CREATE TABLE session (
    id INTEGER PRIMARY KEY,
    user_account_id INTEGER,
    session_token STRING
);

-- Down
DROP TABLE users;
DROP TABLE session;