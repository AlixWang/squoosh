export interface MozJPEGDecodeModule extends EmscriptenWasm.Module {
  decode(buffer: ArrayBuffer): ImageData | null;
}

declare var moduleFactory: EmscriptenWasm.ModuleFactory<MozJPEGDecodeModule>;

export default moduleFactory;