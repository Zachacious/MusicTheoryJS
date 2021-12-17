declare const registerInitializer: (initializer: {
    (): void;
}) => void;
declare const init: (initCB: () => (void | Promise<void>) | undefined) => void;
declare const initAsync: (initCB: () => (void | Promise<void>) | undefined) => Promise<void>;
export { registerInitializer, init, initAsync };
