import fs from "fs";

function random() {
  return Math.random()
    .toString(36)
    .slice(-6);
}

class OrderBook {
  get watchdogTimeout() {
    return 20e3;
  }

  get fullName() {
    const extra = this.pair.currency === "USD"
      ? ""
      : `-${this.pair.currency}`;

    return `${this.name + extra}`;
  }

  constructor(pair, name) {
    this.pair = pair;
    this.name = name;
  }

  getWatchDogReconnect(socket) {
    if (this.socket) {
      this.socket.nextSocket = socket;
    }

    this.socket = socket;

    socket.id = random();
    socket.initTime = Date.now();

    const reconnect = msg => {
      if (Date.now() - socket.initTime < 5e3) {
        setTimeout(() => reconnect(msg), 1e3);
        return;
      }

      if (this.socket === socket) {
        console.log(msg, socket.id);
        this.connect();
      }
    };

    const watchdog = (time, msg = "Watchdog timeout") => {
      clearTimeout(watchdog.timer);

      watchdog.timer = setTimeout(() => reconnect(msg), time);
    };

    watchdog(60e3);

    return [reconnect, watchdog];
  }

  connect(socket) {
    const [reconnect, watchdog] = this.getWatchDogReconnect(socket);

    console.log(`Connecting ${this.pair.join(":")} ${socket.url} ${socket.id}`);

    this.bindMessage(socket, reconnect, watchdog);
    this.bindOpenClose(socket, reconnect, watchdog);
    this.bindError(socket, reconnect, watchdog);
  }

  bindMessage(socket, reconnect, watchdog) {
    socket.on("message", str => {
      socket.firstMessage = true;

      watchdog(this.watchdogTimeout);

      if (socket !== this.socket) {
        // No longer processing, as this socket is no longer
        // relevant, but don't stop logging messages until
        // the new socket has opened
        if (
          this.socket.firstMessage ||
            this.socket.nextSocket !== socket
        ) {
          try {
            socket.close();
          } catch (e) {
            // The watchdog can cause this
            if (e.message !== "WebSocket was closed before the connection was established") {
              throw e;
            }
          }

          return;
        }
      }

      const data = JSON.parse(str),
        fitForProcessing = this.onSocketMessage(data, socket);

      if (!fitForProcessing) {
        reconnect("Poor Message");
        return;
      }

      this.log(data, socket.id);
    });
  }

  bindOpenClose(socket, reconnect, watchdog) {
    socket.on("open", () => {
      console.log("Open", socket.id);
      watchdog(this.watchdogTimeout * 2);

      if (this.socket === socket) {
        this.onSocketOpen();
      }

      socket.opened = Date.now();
    });

    socket.on("close", () => reconnect("Closed"));
  }

  bindError(socket, reconnect, watchdog) {
    socket.on("error", e => {
      switch (e.code) {
      case "ENOTFOUND":
      case "EHOSTUNREACH":
      case "ECONNREFUSED":
      case "ECONNABORTED":
      case "ECONNRESET":
      case "EAGAIN":
      case "EAI_AGAIN":
      case "ESOCKETTIMEDOUT":
      case "ETIMEDOUT":
        reconnect(e.code);
        break;

      default:
        throw e;
      }
    });

    socket.on("unexpected-response", (req, res) => {
      if (res.statusCode === 429) {
        clearTimeout(watchdog.timer);

        setTimeout(() => {
          throw new Error("Need to rate limit");
        }, 10e3);

        this.connect = () => {
          // do nothing
        };

        return;
      }

      if (String(res.statusCode)[0] === "5") {
        console.log("HTTP:", res.statusCode);
        watchdog(this.watchdogTimeout * 2, "Delayed Reboot");
        return;
      }

      throw new Error(`Unexpected server response: ${res.statusCode}`);
    });
  }

  onSocketOpen() {
    return true;
  }

  onSocketMessage(data, socket) {
    const timestamp = this.getServerTimestamp(data);

    if (timestamp) {
      const now = Date.now(),
        age = now - socket.opened,
        diff = now - timestamp;

      if (age < 60e3) {
        return true;
      }

      if (diff < 500) {
        socket.streak = 0;
      } else if (socket.streak === 0) {
        socket.streakStart = Date.now();
        socket.streak = 1;
      } else {
        socket.streak += 1;

        if (
          socket.streak > 20 &&
            Date.now() - socket.streakStart > 5e3
        ) {
          return false;
        }
      }
    }

    return true;
  }

  getServerTimestamp() {
    return undefined;
  }

  log(data, socketId) {
    const date = new Date(),
      filename = `log/${this.fullName}-${date.toJSON().slice(0, 10)}`,
      chunk = JSON.stringify([date.getTime(), socketId, data]);

    if (this.filename !== filename) {
      if (this.stream) {
        this.stream.end();
      }

      this.stream = fs.createWriteStream(filename, {
        "flags": "a"
      });

      this.filename = filename;
    }

    this.stream.write(`${chunk}\n`);
  }
}

export default OrderBook;
