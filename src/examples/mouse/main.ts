import startup from "../../short.js";

const short = startup<{ x: number; y: number }>(400, 400)
  .parentToBody()
  .backgroundColor("#eee")
  .onMouseMove(async (e) => {
    short.x = e.x;
    short.y = e.y;
  })
  .onInitialize(async () => {
    short.x = 0;
    short.y = 0;
  })
  .onDraw(async () => {
    short.fill("#fff");
    short.square(short.x - 25, short.y - 25, 50);
  })
  .start();
