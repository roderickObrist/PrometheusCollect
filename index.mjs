import Pair from "./Pair.mjs";

const [name, currencyArgument] = process.argv[2].split("-"),
  pair = new Pair("BTC", currencyArgument || "USD");

import(`./${name}.mjs`)
  .then(({"default": OrderBook}) => {
    const orderBook = new OrderBook(pair, name);

    orderBook.connect();
  });
