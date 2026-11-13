// Asks for the dashboard password (hidden as you type) and prints OWNER_PASSWORD_HASH to paste into
// Vercel. The password itself is never stored. Run with: pnpm setup:password
import { randomBytes, scrypt } from "node:crypto";
import { stdin, stdout } from "node:process";

function ask(prompt) {
  return new Promise((resolve) => {
    stdout.write(prompt);
    let value = "";
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (char) => {
      if (char === "\r" || char === "\n" || char === "\u0004") {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (char === "\u0003") {
        process.exit(1);
      } else if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on("data", onData);
  });
}

const password = await ask("Dashboard password: ");
if (password.length < 12) {
  console.error("Use at least 12 characters.");
  process.exit(1);
}
if ((await ask("Repeat it: ")) !== password) {
  console.error("The two entries differ.");
  process.exit(1);
}

const N = 16384,
  r = 8,
  p = 1;
const salt = randomBytes(16);
const key = await new Promise((resolve, reject) =>
  scrypt(password, salt, 32, { N, r, p, maxmem: 64 * 1024 * 1024 }, (e, k) =>
    e ? reject(e) : resolve(k),
  ),
);
console.log(
  "\nOWNER_PASSWORD_HASH=" +
    ["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$"),
);
