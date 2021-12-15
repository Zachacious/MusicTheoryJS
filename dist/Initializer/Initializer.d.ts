declare const registerInitializer: (initializer: {
    (): void;
}) => void;
declare const init: (initCB: () => (void | Promise<void>) | undefined) => void;
export { registerInitializer, init };
