export function startup<T = {}>(width: number, height: number): Short & T;
export function startup<T = {}>(canvas: HTMLCanvasElement): Short & T;
export function startup<T = {}>(selecter: string): Short & T;
export function startup<T = {}>(
  a: HTMLCanvasElement | number | string,
  b?: number
): Short & T {
  if (arguments.length === 1 && a instanceof HTMLCanvasElement) {
    return new Short(a) as Short & T;
  }
  if (arguments.length === 1 && typeof a === "string") {
    const canvas = document.querySelector(a);
    if (canvas === null) {
      throw new Error(`Element with selector '${a}' does not exist`);
    } else if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error(`Selected element (selector '${a}') isn't a canvas`);
    }
    return new Short(canvas) as Short & T;
  }
  if (
    arguments.length === 2 &&
    typeof a === "number" &&
    typeof b === "number"
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = a;
    canvas.height = b;
    return new Short(canvas) as Short & T;
  }
  throw new Error(`Invalid arguments: ${arguments}`);
}

export type Event<Data = void> = (data: Data) => Promise<void>;
export type UpdateEvent = Event<{ delta: number }>;
export type DrawEvent = Event;
export type InitializeEvent = Event;
export type LoadEvent = Event;

type Events = {
  readonly update: UpdateEvent[];
  readonly draw: DrawEvent[];
  readonly initialize: InitializeEvent[];
};

export type FontStyle = "normal" | "italic" | "bold" | "bold italic" | "";

export class Short {
  private readonly events: Events = {
    update: [],
    draw: [],
    initialize: [],
  };

  private readonly ctx: CanvasRenderingContext2D;

  private doClearBeforeDraw: boolean = true;

  private readonly tickInterval = () => void this.tick();
  private intervalID: number | null = null;

  private lastFrameTime: number = this.getCurrentTime();
  private delta: number = 0;
  private frameCount: number = 0;
  private readonly startTime: number = this.lastFrameTime;

  private framerateNumber = 60;
  private hasBegun: boolean = false;

  private readonly fontFace = {
    style: "normal" as FontStyle,
    family: "serif" as string,
    size: 48 as string | number,
  };

  getCurrentTime(): number {
    return performance.now();
  }

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }

  get going(): boolean {
    return this.intervalID !== null;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  get time(): {
    sinceStart: number;
    delta: number;
    framesPerSecond: number;
    frameCount: number;
  } {
    return {
      sinceStart: (this.startTime - this.lastFrameTime) / 1000,
      delta: this.delta / 1000,
      framesPerSecond: this.delta !== 0 ? 1000 / this.delta : 0,
      frameCount: this.frameCount,
    };
  }

  framerate(framerate: number): this {
    if (framerate < 0) {
      throw Error(`Can't have negative framerate (${framerate})`);
    }
    this.framerateNumber = framerate;
    return this;
  }

  calibrateFramerate(): this {
    return this.going ? this.end().begin() : this;
  }

  changeFramerate(framerate: number): this {
    return this.framerate(framerate).calibrateFramerate();
  }

  clearBeforeDraw(clearBeforeDraw: boolean = true): this {
    this.doClearBeforeDraw = clearBeforeDraw;
    return this;
  }

  retainCanvas(): this {
    return this.clearBeforeDraw(false);
  }

  giveID(id: string): this {
    this.canvas.id = id;
    return this;
  }

  parentToElement(parent: HTMLElement): this {
    parent.appendChild(this.canvas);
    return this;
  }

  parentToBody(): this {
    return this.parentToElement(document.body);
  }

  clearSection(x: number, y: number, width: number, height: number): this {
    this.ctx.clearRect(x, y, width, height);
    return this;
  }

  clear(): this {
    return this.clearSection(0, 0, this.width, this.canvas.height);
  }

  fill(color: string): this {
    this.ctx.fillStyle = color;
    return this;
  }

  rect(x: number, y: number, width: number, height: number): this {
    this.ctx.fillRect(x, y, width, height);
    return this;
  }

  square(x: number, y: number, length: number): this {
    return this.rect(x, y, length, length);
  }

  fontSize(size: number | string): this {
    this.fontFace.size = size;
    return this;
  }

  fontFamily(family: string): this {
    this.fontFace.family = family;
    return this;
  }

  fontStyle(style: FontStyle): this {
    this.fontFace.style = style;
    return this;
  }

  textAlign(alignment: CanvasTextAlign): this {
    this.ctx.textAlign = alignment;
    return this;
  }

  textBaseline(baseline: CanvasTextBaseline): this {
    this.ctx.textBaseline = baseline;
    return this;
  }

  textRendering(rendering: CanvasTextRendering): this {
    this.ctx.textRendering = rendering;
    return this;
  }

  textMetrics(text: string): TextMetrics {
    const metrics = this.ctx.measureText(text);
    return metrics;
  }

  calculateFontFace(): string {
    return `${this.fontFace.style} ${
      typeof this.fontFace.size === "number"
        ? `${this.fontFace.size}px`
        : this.fontFace.size
    } ${this.fontFace.family}`;
  }

  text(x: number, y: number, text: string, maxWidth?: number): this {
    this.ctx.font = this.calculateFontFace();
    this.ctx.fillText(text, x, y, maxWidth);
    return this;
  }

  onUpdate(event: UpdateEvent): this {
    this.events.update.push(event);
    return this;
  }

  onDraw(event: DrawEvent): this {
    this.events.draw.push(event);
    return this;
  }

  onInitialize(event: InitializeEvent): this {
    this.events.initialize.push(event);
    return this;
  }

  backgroundColor(color: string): this {
    this.canvas.style.backgroundColor = color;
    return this;
  }

  start(): this {
    setTimeout(() => this.begin());
    return this;
  }

  begin(): this {
    if (this.intervalID !== null) {
      return this;
    }

    if (!this.hasBegun) {
      this.initializeCallback();
    }

    if (this.framerateNumber === 0) {
      this.intervalID = window.setInterval(this.tickInterval);
    } else {
      this.intervalID = window.setInterval(
        this.tickInterval,
        1000 / this.framerateNumber
      );
    }

    return this;
  }

  end(): this {
    if (this.intervalID === null) {
      return this;
    }
    window.clearInterval(this.intervalID);
    this.intervalID = null;
    return this;
  }

  // internal methods

  private beforeInitialize(): void {
    this.hasBegun = true;
  }

  private async initializeCallback(): Promise<void> {
    this.beforeInitialize();
    for (const event of this.events.initialize) {
      await event();
    }
  }

  private beforeUpdate(): void {}

  private async updateCallback(): Promise<void> {
    this.beforeUpdate();
    for (const event of this.events.update) {
      await event({ delta: this.time.delta });
    }
    this.delta = this.getCurrentTime() - this.lastFrameTime;
    this.lastFrameTime = this.getCurrentTime();
  }

  private beforeDraw(): void {
    if (this.doClearBeforeDraw) {
      this.clear();
    }
  }

  private async drawCallback(): Promise<void> {
    this.beforeDraw();
    for (const event of this.events.draw) {
      await event();
    }
  }

  private async tick(): Promise<void> {
    await this.updateCallback();
    await this.drawCallback();
    this.frameCount++;
  }
}
