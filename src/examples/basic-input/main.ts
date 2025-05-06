import startup from "../../short.js";

export const short = startup(400, 400)
  .parentToBody()
  .backgroundColor("#eee")
  .onKeyDown(async (e) => {
    if (e.key === "a") short.backgroundColor("#f00");
    else if (e.key === "d") short.backgroundColor("#0f0");
    else if (e.key === "s") short.backgroundColor("#00f");
  })
  .start();
