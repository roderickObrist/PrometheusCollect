class Pair {
  constructor(instrument, currency) {
    this.instrument = instrument;
    this.currency = currency;
  }

  join(str, map = {}) {
    const instrument = map[this.instrument] || this.instrument,
      currency = map[this.currency] || this.currency;

    return `${instrument}${str}${currency}`;
  }

  get currencyDivisibility() {
    switch (this.currency) {
    case "USD":
      return 2;
    default:
      return 8;
    }
  }

  get instrumentDivisibility() {
    switch (this.instrument) {
    case "BTC":
      return 8;
    default:
      return 8;
    }
  }
}

export default Pair;
