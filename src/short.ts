export default function startup<T = {}>(
  width: number,
  height: number
): Short & T;
export default function startup<T = {}>(canvas: HTMLCanvasElement): Short & T;
export default function startup<T = {}>(selecter: string): Short & T;
export default function startup<T = {}>(
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

export { startup };

export type KeyboardData = {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  repeat: boolean;
  isControlKey: boolean;
};

export function isControlKey(key: string): boolean {
  return (
    key === "Control" || key === "Shift" || key === "Alt" || key === "Meta"
  );
}

export function transformKeyboardEvent(e: KeyboardEvent): KeyboardData {
  return {
    key: e.key,
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey,
    repeat: e.shiftKey,
    isControlKey: isControlKey(e.key),
  };
}

export const LEFT_MOUSE = 0;
export const MIDDLE_MOUSE = 1;
export const RIGHT_MOUSE = 2;
export const FORWARD_MOUSE = 3;
export const BACKWARD_MOUSE = 4;

export type MouseButton = 0 | 1 | 2 | 3 | 4;

export type MouseData = {
  absX: number;
  absY: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  button: MouseButton;
  buttons: { [key in MouseButton]: boolean };
};

function getButtons(e: MouseEvent): { [key in MouseButton]: boolean } {
  const getButton = (button: MouseButton) => Boolean(e.buttons & (1 << button));
  return {
    [LEFT_MOUSE]: getButton(LEFT_MOUSE),
    [RIGHT_MOUSE]: getButton(RIGHT_MOUSE),
    [MIDDLE_MOUSE]: getButton(MIDDLE_MOUSE),
    [FORWARD_MOUSE]: getButton(FORWARD_MOUSE),
    [BACKWARD_MOUSE]: getButton(BACKWARD_MOUSE),
  };
}

export function transformMouseEvent(e: MouseEvent): MouseData {
  return {
    button: e.button as MouseButton,
    buttons: getButtons(e),
    absX: e.clientX,
    absY: e.clientY,
    x: e.offsetX,
    y: e.offsetY,
    dx: e.movementX,
    dy: e.movementY,
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey,
  };
}

export type Event<Data = void> = (data: Data) => Promise<void>;
export type UpdateEvent = Event<{ delta: number }>;
export type DrawEvent = Event;
export type InitializeEvent = Event;
export type LoadEvent = Event;
export type CanvasKeyboardEvent = Event<KeyboardData>;
export type KeyPressEvent = CanvasKeyboardEvent;
export type MouseInputEvent = Event<MouseData>;

type Events = {
  readonly update: UpdateEvent[];
  readonly draw: DrawEvent[];
  readonly initialize: InitializeEvent[];
  readonly keyUp: KeyPressEvent[];
  readonly keyDown: KeyPressEvent[];
  readonly mouseEnter: MouseInputEvent[];
  readonly mouseExit: MouseInputEvent[];
  readonly mouseMove: MouseInputEvent[];
  readonly mouseUp: MouseInputEvent[];
  readonly mouseDown: MouseInputEvent[];
  readonly mouseClicked: MouseInputEvent[];
  readonly mouseDoubleClicked: MouseInputEvent[];
};

export type FontStyle = "normal" | "italic" | "bold" | "bold italic" | "";

export class Short {
  readonly LEFT_MOUSE = LEFT_MOUSE;
  readonly RIGHT_MOUSE = RIGHT_MOUSE;
  readonly MIDDLE_MOUSE = MIDDLE_MOUSE;
  readonly FORWARD_MOUSE = FORWARD_MOUSE;
  readonly BACKWARD_MOUSE = BACKWARD_MOUSE;

  isControlKey(key: string): boolean {
    return isControlKey(key);
  }

  transformKeyboardEvent(e: KeyboardEvent): KeyboardData {
    return transformKeyboardEvent(e);
  }

  private readonly events: Events = {
    update: [],
    draw: [],
    initialize: [],
    keyUp: [],
    keyDown: [],
    mouseEnter: [],
    mouseExit: [],
    mouseMove: [],
    mouseUp: [],
    mouseDown: [],
    mouseClicked: [],
    mouseDoubleClicked: [],
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

    window.addEventListener("keydown", (e) => void this.keyDownCallback(e));
    window.addEventListener("keyup", (e) => void this.keyUpCallback(e));

    this.canvas.addEventListener(
      "click",
      (e) => void this.mouseClickCallback(e)
    );
    this.canvas.addEventListener(
      "dblclick",
      (e) => void this.mouseDoubleClickCallback(e)
    );
    this.canvas.addEventListener(
      "mouseup",
      (e) => void this.mouseUpCallback(e)
    );
    this.canvas.addEventListener(
      "mousedown",
      (e) => void this.mouseDownCallback(e)
    );
    window.addEventListener("mousemove", (e) => void this.mouseMoveCallback(e));
    this.canvas.addEventListener(
      "mouseenter",
      (e) => void this.mouseEnterCallback(e)
    );
    this.canvas.addEventListener(
      "mouseleave",
      (e) => void this.mouseExitCallback(e)
    );
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

  onKeyUp(event: CanvasKeyboardEvent): this {
    this.events.keyUp.push(event);
    return this;
  }

  onKeyDown(event: CanvasKeyboardEvent): this {
    this.events.keyDown.push(event);
    return this;
  }

  onMouseEnter(event: MouseInputEvent): this {
    this.events.mouseEnter.push(event);
    return this;
  }

  onMouseExit(event: MouseInputEvent): this {
    this.events.mouseExit.push(event);
    return this;
  }

  onMouseMove(event: MouseInputEvent): this {
    this.events.mouseMove.push(event);
    return this;
  }

  onMouseUp(event: MouseInputEvent): this {
    this.events.mouseUp.push(event);
    return this;
  }

  onMouseDown(event: MouseInputEvent): this {
    this.events.mouseDown.push(event);
    return this;
  }

  onMouseClick(event: MouseInputEvent): this {
    this.events.mouseClicked.push(event);
    return this;
  }

  onMouseDoubleClick(event: MouseInputEvent): this {
    this.events.mouseDoubleClicked.push(event);
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

  private async keyUpCallback(e: KeyboardEvent): Promise<void> {
    const data = transformKeyboardEvent(e);
    for (const event of this.events.keyUp) {
      await event(data);
    }
  }

  private async keyDownCallback(e: KeyboardEvent): Promise<void> {
    const data = transformKeyboardEvent(e);
    for (const event of this.events.keyDown) {
      await event(data);
    }
  }

  private async mouseCallback(
    e: MouseEvent,
    callbacks: MouseInputEvent[],
    isMouseMove: boolean = false
  ): Promise<void> {
    const data = transformMouseEvent(e);
    if (isMouseMove) {
      data.x -= this.canvas.clientLeft;
      data.y -= this.canvas.clientTop;
    }
    for (const event of callbacks) {
      await event(data);
    }
  }

  private async mouseEnterCallback(e: MouseEvent): Promise<void> {
    await this.mouseCallback(e, this.events.mouseEnter);
  }

  private async mouseExitCallback(e: MouseEvent): Promise<void> {
    await this.mouseCallback(e, this.events.mouseExit);
  }

  private async mouseMoveCallback(e: MouseEvent): Promise<void> {
    await this.mouseCallback(e, this.events.mouseMove, true);
  }

  private async mouseUpCallback(e: MouseEvent): Promise<void> {
    await this.mouseCallback(e, this.events.mouseUp);
  }

  private async mouseDownCallback(e: MouseEvent): Promise<void> {
    await this.mouseCallback(e, this.events.mouseDown);
  }

  private async mouseClickCallback(e: MouseEvent): Promise<void> {
    await this.mouseCallback(e, this.events.mouseClicked);
  }

  private async mouseDoubleClickCallback(e: MouseEvent): Promise<void> {
    await this.mouseCallback(e, this.events.mouseDoubleClicked);
  }
}
