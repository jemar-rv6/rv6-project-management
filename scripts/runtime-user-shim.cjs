/* eslint-disable @typescript-eslint/no-require-imports */
const os = require("node:os");

os.userInfo = () => ({
  uid: -1,
  gid: -1,
  username: process.env.USERNAME || "codex",
  homedir: process.env.USERPROFILE || "C:\\Users\\jemar",
  shell: null,
});
