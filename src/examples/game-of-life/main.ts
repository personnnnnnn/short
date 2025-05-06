import { startup } from "../../short.js";

export type Context = typeof short;

// game of life

export const short = startup<{
  lifeGrid: boolean[];
  w: number;
  l: number;
  calcIndex: (i: number, j: number) => number;
  aliveCount: (grid: boolean[], i: number, j: number) => number;
}>(600, 600)
  .parentToBody()
  .backgroundColor("#333")
  .framerate(30)
  .onInitialize(async () => {
    short.w = 240;
    short.l = short.width / short.w;
    short.lifeGrid = [];
    for (let i = 0; i < short.w; i++) {
      for (let j = 0; j < short.w; j++) {
        short.lifeGrid.push(Math.random() < 0.5);
      }
    }

    short.calcIndex = (i, j) => i + j * short.w;

    const mod = (n: number, m: number) => ((n % m) + m) % m;
    short.aliveCount = (grid, i, j) => {
      let n = 0;
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          if (x === 0 && y === 0) {
            continue;
          }
          const xi = mod(i + x, short.w);
          const yi = mod(j + y, short.w);
          if (grid[short.calcIndex(xi, yi)]) {
            n++;
          }
        }
      }
      return n;
    };
  })
  .onUpdate(async () => {
    const oldGrid = [...short.lifeGrid];
    for (let i = 0; i < short.w; i++) {
      for (let j = 0; j < short.w; j++) {
        const count = short.aliveCount(oldGrid, i, j);
        const idx = short.calcIndex(i, j);
        if (oldGrid[idx]) {
          if (!(count === 2 || count === 3)) {
            short.lifeGrid[idx] = false;
          }
        } else {
          if (count === 3) {
            short.lifeGrid[idx] = true;
          }
        }
      }
    }
  })
  .onDraw(async () => {
    short.fill("#fff");
    for (let i = 0; i < short.w; i++) {
      for (let j = 0; j < short.w; j++) {
        const idx = short.calcIndex(i, j);
        if (short.lifeGrid[idx]) {
          short.rect(i * short.l, j * short.l, short.l, short.l);
        }
      }
    }
  })
  .start();
